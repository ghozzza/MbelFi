package client

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/rpc"
	pkgerrors "github.com/pkg/errors"

	"github.com/smartcontractkit/chainlink-common/pkg/logger"
	commontypes "github.com/smartcontractkit/chainlink-framework/chains/txmgr/types"
	"github.com/smartcontractkit/chainlink-framework/multinode"

	"github.com/smartcontractkit/chainlink-evm/pkg/config"
	"github.com/smartcontractkit/chainlink-evm/pkg/label"
)

// fatal means this transaction can never be accepted even with a different nonce or higher gas price
type SendError struct {
	fatal bool
	err   error
}

func (s *SendError) Error() string {
	return s.err.Error()
}

// Fatal indicates whether the error should be considered fatal or not
// Fatal errors mean that no matter how many times the send is retried, no node
// will ever accept it
func (s *SendError) Fatal(configErrors *ClientErrors) bool {
	if configErrors != nil && configErrors.ErrIs(s.err, Fatal) {
		return true
	}
	return s != nil && s.fatal
}

const (
	NonceTooLow = iota
	// Nethermind specific error. Nethermind throws a NonceGap error when the tx nonce is greater than current_nonce + tx_count_in_mempool, instead of keeping the tx in mempool.
	// See: https://github.com/NethermindEth/nethermind/blob/master/src/Nethermind/Nethermind.TxPool/Filters/GapNonceFilter.cs
	NonceTooHigh
	ReplacementTransactionUnderpriced
	LimitReached
	TransactionAlreadyInMempool
	TerminallyUnderpriced
	InsufficientEth
	TxFeeExceedsCap
	// Note: L2FeeTooLow/L2FeeTooHigh/L2Full have a very specific meaning specific
	// to L2s (Arbitrum and clones). Do not implement this for non-L2
	// chains. This is potentially confusing because some RPC nodes e.g.
	// Nethermind implement an error called `FeeTooLow` which has distinct
	// meaning from this one.
	L2FeeTooLow
	L2FeeTooHigh
	L2Full
	TransactionAlreadyMined
	Fatal
	ServiceUnavailable
	TerminallyStuck
	TooManyResults
	ServiceTimeout
	MissingBlocks
)

type ClientErrors map[int]*regexp.Regexp

// ErrIs returns true if err matches any provided error types
func (e *ClientErrors) ErrIs(err error, errorTypes ...int) bool {
	if err == nil {
		return false
	}
	for _, errorType := range errorTypes {
		if _, ok := (*e)[errorType]; !ok {
			return false
		}
		if (*e)[errorType].String() == "" {
			return false
		}
		if (*e)[errorType].MatchString(pkgerrors.Cause(err).Error()) {
			return true
		}
	}
	return false
}

// Parity
// See: https://github.com/openethereum/openethereum/blob/master/rpc/src/v1/helpers/errors.rs#L420
var parFatal = regexp.MustCompile(`^Transaction gas is too low. There is not enough gas to cover minimal cost of the transaction|^Transaction cost exceeds current gas limit. Limit:|^Invalid signature|Recipient is banned in local queue.|Supplied gas is beyond limit|Sender is banned in local queue|Code is banned in local queue|Transaction is not permitted|Transaction is too big, see chain specification for the limit|^Invalid RLP data`)
var parity = ClientErrors{
	NonceTooLow:                       regexp.MustCompile("^Transaction nonce is too low. Try incrementing the nonce."),
	ReplacementTransactionUnderpriced: regexp.MustCompile("^Transaction gas price .+is too low. There is another transaction with same nonce in the queue"),
	LimitReached:                      regexp.MustCompile("There are too many transactions in the queue. Your transaction was dropped due to limit. Try increasing the fee."),
	TransactionAlreadyInMempool:       regexp.MustCompile("Transaction with the same hash was already imported."),
	TerminallyUnderpriced:             regexp.MustCompile("^Transaction gas price is too low. It does not satisfy your node's minimal gas price"),
	InsufficientEth:                   regexp.MustCompile("^(Insufficient funds. The account you tried to send transaction from does not have enough funds.|Insufficient balance for transaction.)"),
	Fatal:                             parFatal,
}

// Geth
// See: https://github.com/ethereum/go-ethereum/blob/b9df7ecdc3d3685180ceb29665bab59e9f614da5/core/tx_pool.go#L516
var gethFatal = regexp.MustCompile(`(: |^)(exceeds block gas limit|invalid sender|negative value|oversized data|gas uint64 overflow|intrinsic gas too low)$`)
var geth = ClientErrors{
	NonceTooLow:                       regexp.MustCompile(`(: |^)nonce too low$`),
	NonceTooHigh:                      regexp.MustCompile(`(: |^)nonce too high$`),
	ReplacementTransactionUnderpriced: regexp.MustCompile(`(: |^)replacement transaction underpriced$`),
	TransactionAlreadyInMempool:       regexp.MustCompile(`(: |^)(?i)(known transaction|already known)`),
	TerminallyUnderpriced:             regexp.MustCompile(`(: |^)transaction underpriced$`),
	InsufficientEth:                   regexp.MustCompile(`(: |^)(insufficient funds for transfer|insufficient funds for gas \* price \+ value|insufficient balance for transfer|transaction would cause overdraft)$`),
	TxFeeExceedsCap:                   regexp.MustCompile(`(: |^)tx fee \([0-9\.]+ [a-zA-Z]+\) exceeds the configured cap \([0-9\.]+ [a-zA-Z]+\)$`),
	Fatal:                             gethFatal,
}

// Besu
// See: https://github.com/hyperledger/besu/blob/81f25e15f9891787829b532f2fb38c8c43fd6b2e/ethereum/api/src/main/java/org/hyperledger/besu/ethereum/api/jsonrpc/internal/response/JsonRpcError.java
var besuFatal = regexp.MustCompile(`^(Intrinsic gas exceeds gas limit|Transaction gas limit exceeds block gas limit|Invalid signature)$`)
var besu = ClientErrors{
	NonceTooLow:                       regexp.MustCompile(`^Nonce too low$`),
	ReplacementTransactionUnderpriced: regexp.MustCompile(`^Replacement transaction underpriced$`),
	TransactionAlreadyInMempool:       regexp.MustCompile(`^Known transaction$`),
	TerminallyUnderpriced:             regexp.MustCompile(`^Gas price below configured minimum gas price$`),
	InsufficientEth:                   regexp.MustCompile(`^Upfront cost exceeds account balance$`),
	TxFeeExceedsCap:                   regexp.MustCompile(`^Transaction fee cap exceeded$`),
	Fatal:                             besuFatal,
}

// Erigon
// See:
//   - https://github.com/ledgerwatch/erigon/blob/devel/core/tx_pool.go
//   - https://github.com/ledgerwatch/erigon/blob/devel/core/error.go
//   - https://github.com/ledgerwatch/erigon/blob/devel/core/vm/errors.go
//
// Note: some error definitions are unused, many errors are created inline.
var erigonFatal = regexp.MustCompile(`(: |^)(exceeds block gas limit|invalid sender|negative value|oversized data|gas uint64 overflow|intrinsic gas too low)$`)
var erigon = ClientErrors{
	NonceTooLow:                       regexp.MustCompile(`(: |^)nonce too low$`),
	NonceTooHigh:                      regexp.MustCompile(`(: |^)nonce too high$`),
	ReplacementTransactionUnderpriced: regexp.MustCompile(`(: |^)replacement transaction underpriced$`),
	TransactionAlreadyInMempool:       regexp.MustCompile(`(: |^)(block already known|already known)`),
	TerminallyUnderpriced:             regexp.MustCompile(`(: |^)transaction underpriced$`),
	InsufficientEth:                   regexp.MustCompile(`(: |^)(insufficient funds for transfer|insufficient funds for gas \* price \+ value|insufficient balance for transfer)$`),
	TxFeeExceedsCap:                   regexp.MustCompile(`(: |^)tx fee \([0-9\.]+ [a-zA-Z]+\) exceeds the configured cap \([0-9\.]+ [a-zA-Z]+\)$`),
	Fatal:                             erigonFatal,
}

// Arbitrum
// https://github.com/OffchainLabs/arbitrum/blob/cac30586bc10ecc1ae73e93de517c90984677fdb/packages/arb-evm/evm/result.go#L158
// nitro: https://github.com/OffchainLabs/go-ethereum/blob/master/core/state_transition.go
var arbitrumFatal = regexp.MustCompile(`(: |^)(invalid message format|forbidden sender address)$|(: |^)(execution reverted)(:|$)`)
var arbitrum = ClientErrors{
	// TODO: Arbitrum returns this in case of low or high nonce. Update this when Arbitrum fix it
	// Archived ticket: story/16801/add-full-support-for-incorrect-nonce-on-arbitrum
	NonceTooLow:           regexp.MustCompile(`(: |^)invalid transaction nonce$|(: |^)nonce too low(:|$)`),
	NonceTooHigh:          regexp.MustCompile(`(: |^)nonce too high(:|$)`),
	TerminallyUnderpriced: regexp.MustCompile(`(: |^)gas price too low$`),
	InsufficientEth:       regexp.MustCompile(`(: |^)(not enough funds for gas|insufficient funds for gas \* price \+ value)`),
	Fatal:                 arbitrumFatal,
	L2FeeTooLow:           regexp.MustCompile(`(: |^)max fee per gas less than block base fee(:|$)`),
	L2Full:                regexp.MustCompile(`(: |^)(queue full|sequencer pending tx pool full, please try again)(:|$)`),
	ServiceUnavailable:    regexp.MustCompile(`(: |^)502 Bad Gateway: [\s\S]*$|network is unreachable|i/o timeout|(: |^)503 Service Temporarily Unavailable(:|$)`),
	ServiceTimeout:        regexp.MustCompile(`(: |^)408 Request Timeout(:|$)`),
}

// Treasure
var treasureFatal = regexp.MustCompile(`(: |^)invalid chain id for signer(:|$)`)
var treasure = ClientErrors{
	Fatal: treasureFatal,
}

var celo = ClientErrors{
	TxFeeExceedsCap:       regexp.MustCompile(`(: |^)tx fee \([0-9\.]+ of currency celo\) exceeds the configured cap \([0-9\.]+ [a-zA-Z]+\)$`),
	TerminallyUnderpriced: regexp.MustCompile(`(: |^)gasprice is less than gas price minimum floor`),
	InsufficientEth:       regexp.MustCompile(`(: |^)insufficient funds for gas \* price \+ value \+ gatewayFee$`),
	LimitReached:          regexp.MustCompile(`(: |^)txpool is full`),
}

var metis = ClientErrors{
	L2FeeTooLow: regexp.MustCompile(`(: |^)gas price too low: \d+ wei, use at least tx.gasPrice = \d+ wei$`),
}

// Substrate (Moonriver)
var substrate = ClientErrors{
	NonceTooLow:                 regexp.MustCompile(`(: |^)Pool\(Stale\)$`),
	TransactionAlreadyInMempool: regexp.MustCompile(`(: |^)Pool\(AlreadyImported\)$`),
}

var avalanche = ClientErrors{
	NonceTooLow: regexp.MustCompile(`(: |^)nonce too low: address 0x[0-9a-fA-F]{40} current nonce \([\d]+\) > tx nonce \([\d]+\)$`),
}

// Klaytn
// https://github.com/klaytn/klaytn/blob/dev/blockchain/error.go
// https://github.com/klaytn/klaytn/blob/dev/blockchain/tx_pool.go
var klaytn = ClientErrors{
	NonceTooLow:                       regexp.MustCompile(`(: |^)nonce too low$`),                                                                                    // retry with an increased nonce
	TransactionAlreadyInMempool:       regexp.MustCompile(`(: |^)(known transaction)`),                                                                               // don't send the tx again. The exactly same tx is already in the mempool
	ReplacementTransactionUnderpriced: regexp.MustCompile(`(: |^)replacement transaction underpriced$|there is another tx which has the same nonce in the tx pool$`), // retry with an increased gasPrice or maxFeePerGas. This error happened when there is another tx having higher gasPrice or maxFeePerGas exist in the mempool
	TerminallyUnderpriced:             regexp.MustCompile(`(: |^)(transaction underpriced|^intrinsic gas too low)`),                                                  // retry with an increased gasPrice or maxFeePerGas
	LimitReached:                      regexp.MustCompile(`(: |^)txpool is full`),                                                                                    // retry with few seconds wait
	InsufficientEth:                   regexp.MustCompile(`(: |^)insufficient funds`),                                                                                // stop to send a tx. The sender address doesn't have enough KLAY
	TxFeeExceedsCap:                   regexp.MustCompile(`(: |^)(invalid gas fee cap|max fee per gas higher than max priority fee per gas)`),                        // retry with a valid gasPrice, maxFeePerGas, or maxPriorityFeePerGas. The new value can get from the return of `eth_gasPrice`
	Fatal:                             gethFatal,
}

// Nethermind
// All errors: https://github.com/NethermindEth/nethermind/blob/master/src/Nethermind/Nethermind.TxPool/AcceptTxResult.cs
// All filters: https://github.com/NethermindEth/nethermind/tree/9b68ec048c65f4b44fb863164c0dec3f7780d820/src/Nethermind/Nethermind.TxPool/Filters
var nethermindFatal = regexp.MustCompile(`(: |^)(SenderIsContract|Invalid(, transaction Hash is null)?|Int256Overflow|FailedToResolveSender|GasLimitExceeded(, Gas limit: \d+, gas limit of rejected tx: \d+)?)$`)
var nethermind = ClientErrors{
	// OldNonce: The EOA (externally owned account) that signed this transaction (sender) has already signed and executed a transaction with the same nonce.
	NonceTooLow:  regexp.MustCompile(`(: |^)OldNonce(, Current nonce: \d+, nonce of rejected tx: \d+)?$`),
	NonceTooHigh: regexp.MustCompile(`(: |^)NonceGap(, Future nonce. Expected nonce: \d+)?$`),

	// FeeTooLow/FeeTooLowToCompete: Fee paid by this transaction is not enough to be accepted in the mempool.
	TerminallyUnderpriced: regexp.MustCompile(`(: |^)(FeeTooLow(, MaxFeePerGas too low. MaxFeePerGas: \d+, BaseFee: \d+, MaxPriorityFeePerGas:\d+, Block number: \d+|` +
		`, EffectivePriorityFeePerGas too low \d+ < \d+, BaseFee: \d+|` +
		`, FeePerGas needs to be higher than \d+ to be added to the TxPool. Affordable FeePerGas of rejected tx: \d+.)?|` +
		`FeeTooLowToCompete)$`),

	// AlreadyKnown: A transaction with the same hash has already been added to the pool in the past.
	// OwnNonceAlreadyUsed: A transaction with same nonce has been signed locally already and is awaiting in the pool.
	TransactionAlreadyInMempool: regexp.MustCompile(`(: |^)(AlreadyKnown|OwnNonceAlreadyUsed)$`),

	// InsufficientFunds: Sender account has not enough balance to execute this transaction.
	InsufficientEth:    regexp.MustCompile(`(: |^)InsufficientFunds(, Account balance: \d+, cumulative cost: \d+|, Balance is \d+ less than sending value \+ gas \d+)?$`),
	ServiceUnavailable: regexp.MustCompile(`(: |^)503 Service Unavailable: [\s\S]*$`),
	Fatal:              nethermindFatal,
}

// Harmony
// https://github.com/harmony-one/harmony/blob/main/core/tx_pool.go#L49
var harmonyFatal = regexp.MustCompile("(: |^)(invalid shard|staking message does not match directive message|`from` address of transaction in blacklist|`to` address of transaction in blacklist)$")
var harmony = ClientErrors{
	TransactionAlreadyMined: regexp.MustCompile(`(: |^)transaction already finalized$`),
	Fatal:                   harmonyFatal,
}

var zkSync = ClientErrors{
	NonceTooLow:           regexp.MustCompile(`(?:: |^)nonce too low\..+actual: \d*$`),
	NonceTooHigh:          regexp.MustCompile(`(?:: |^)nonce too high\..+actual: \d*$`),
	TerminallyUnderpriced: regexp.MustCompile(`(?:: |^)(max fee per gas less than block base fee|virtual machine entered unexpected state. (?:P|p)lease contact developers and provide transaction details that caused this error. Error description: (?:The operator included transaction with an unacceptable gas price|Assertion error: Fair pubdata price too high))$`),
	InsufficientEth:       regexp.MustCompile(`(?:: |^)(?:insufficient balance for transfer$|insufficient funds for gas + value)`),
	TxFeeExceedsCap:       regexp.MustCompile(`(?:: |^)max priority fee per gas higher than max fee per gas$`),
	// intrinsic gas too low 						- gas limit less than 14700
	// Not enough gas for transaction validation 	- gas limit less than L2 fee
	// Failed to pay the fee to the operator 		- gas limit less than L2+L1 fee
	// Error function_selector = 0x, data = 0x 		- contract call with gas limit of 0
	// can't start a transaction from a non-account - trying to send from an invalid address, e.g. estimating a contract -> contract tx
	// max fee per gas higher than 2^64-1 			- uint64 overflow
	// oversized data 								- data too large
	Fatal:                       regexp.MustCompile(`(?:: |^)(?:exceeds block gas limit|intrinsic gas too low|Not enough gas for transaction validation|Failed to pay the fee to the operator|Error function_selector = 0x, data = 0x|invalid sender. can't start a transaction from a non-account|max(?: priority)? fee per (?:gas|pubdata byte) higher than 2\^64-1|oversized data. max: \d+; actual: \d+)$`),
	TransactionAlreadyInMempool: regexp.MustCompile(`known transaction. transaction with hash .* is already in the system`),
}

var zkEvm = ClientErrors{
	TerminallyStuck: regexp.MustCompile(`(?:: |^)(?:not enough .* counters to continue the execution|out of counters at node level (?:.*))$`),
}

var aStar = ClientErrors{
	TerminallyUnderpriced: regexp.MustCompile(`(?:: |^)(gas price less than block base fee)$`),
}

var mantle = ClientErrors{
	InsufficientEth:                   regexp.MustCompile(`(: |^)'*insufficient funds for gas \* price \+ value`),
	Fatal:                             regexp.MustCompile(`(: |^)'*invalid sender`),
	NonceTooLow:                       regexp.MustCompile(`(: |^)'*nonce too low`),
	ReplacementTransactionUnderpriced: regexp.MustCompile(`(: |^)'*replacement transaction underpriced`),
	TransactionAlreadyInMempool:       regexp.MustCompile(`(: |^)'*already known`),
}

var hederaFatal = regexp.MustCompile(`(: |^)(execution reverted)(:|$) | ^Transaction gas limit '(\d+)' exceeds block gas limit '(\d+)' | ^Transaction gas limit provided '(\d+)' is insufficient of intrinsic gas required '(\d+)' | ^Oversized data:|status INVALID_SIGNATURE`)
var hedera = ClientErrors{
	NonceTooLow:           regexp.MustCompile(`Nonce too low`),
	NonceTooHigh:          regexp.MustCompile(`Nonce too high`),
	TerminallyUnderpriced: regexp.MustCompile(`(Gas price '(\d+)' is below configured minimum gas price '(\d+)')|(Gas price too low)`),
	InsufficientEth:       regexp.MustCompile(`Insufficient funds for transfer| failed precheck with status INSUFFICIENT_PAYER_BALANCE`),
	ServiceUnavailable:    regexp.MustCompile(`Transaction execution returns a null value for transaction`),
	Fatal:                 hederaFatal,
}

var gnosis = ClientErrors{
	TransactionAlreadyInMempool: regexp.MustCompile(`(: |^)(alreadyknown)`),
}

var sei = ClientErrors{
	// https://github.com/sei-protocol/sei-tendermint/blob/e9a22c961e83579d8a68cd045c532980d82fb2a0/types/mempool.go#L12
	TransactionAlreadyInMempool: regexp.MustCompile("tx already exists in cache"),
	// https://github.com/sei-protocol/sei-cosmos/blob/a4eb451c957b1ca7ca9118406682f93fe83d1f61/types/errors/errors.go#L50
	// https://github.com/sei-protocol/sei-cosmos/blob/a4eb451c957b1ca7ca9118406682f93fe83d1f61/types/errors/errors.go#L56
	// https://github.com/sei-protocol/sei-cosmos/blob/a4eb451c957b1ca7ca9118406682f93fe83d1f61/client/broadcast.go#L27
	// https://github.com/sei-protocol/sei-cosmos/blob/a4eb451c957b1ca7ca9118406682f93fe83d1f61/types/errors/errors.go#L32
	Fatal: regexp.MustCompile(`(: |^)'*out of gas|insufficient fee|Tx too large. Max size is \d+, but got \d+|: insufficient funds`),
}

var monad = ClientErrors{
	Fatal: regexp.MustCompile("Gas limit too low"),
}

const TerminallyStuckMsg = "transaction terminally stuck"

// Tx.Error messages that are set internally so they are not chain or client specific
var internal = ClientErrors{
	TerminallyStuck: regexp.MustCompile(TerminallyStuckMsg),
}

var clients = []ClientErrors{parity, geth, arbitrum, metis, substrate, avalanche, nethermind, harmony, besu, erigon, klaytn, celo, zkSync, zkEvm, treasure, mantle, aStar, hedera, gnosis, sei, monad, internal}

// ClientErrorRegexes returns a map of compiled regexes for each error type
func ClientErrorRegexes(errsRegex config.ClientErrors) *ClientErrors {
	if errsRegex == nil {
		return &ClientErrors{}
	}
	return &ClientErrors{
		NonceTooLow:                       regexp.MustCompile(errsRegex.NonceTooLow()),
		NonceTooHigh:                      regexp.MustCompile(errsRegex.NonceTooHigh()),
		ReplacementTransactionUnderpriced: regexp.MustCompile(errsRegex.ReplacementTransactionUnderpriced()),
		LimitReached:                      regexp.MustCompile(errsRegex.LimitReached()),
		TransactionAlreadyInMempool:       regexp.MustCompile(errsRegex.TransactionAlreadyInMempool()),
		TerminallyUnderpriced:             regexp.MustCompile(errsRegex.TerminallyUnderpriced()),
		InsufficientEth:                   regexp.MustCompile(errsRegex.InsufficientEth()),
		TxFeeExceedsCap:                   regexp.MustCompile(errsRegex.TxFeeExceedsCap()),
		L2FeeTooLow:                       regexp.MustCompile(errsRegex.L2FeeTooLow()),
		L2FeeTooHigh:                      regexp.MustCompile(errsRegex.L2FeeTooHigh()),
		L2Full:                            regexp.MustCompile(errsRegex.L2Full()),
		TransactionAlreadyMined:           regexp.MustCompile(errsRegex.TransactionAlreadyMined()),
		Fatal:                             regexp.MustCompile(errsRegex.Fatal()),
		ServiceUnavailable:                regexp.MustCompile(errsRegex.ServiceUnavailable()),
		TooManyResults:                    regexp.MustCompile(errsRegex.TooManyResults()),
		MissingBlocks:                     regexp.MustCompile(errsRegex.MissingBlocks()),
	}
}

func (s *SendError) is(errorType int, configErrors *ClientErrors) bool {
	if s == nil || s.err == nil {
		return false
	}
	if configErrors != nil && configErrors.ErrIs(s.err, errorType) {
		return true
	}
	for _, client := range clients {
		if client.ErrIs(s.err, errorType) {
			return true
		}
	}
	return false
}

// IsReplacementUnderpriced indicates that a transaction already exists in the mempool with this nonce but a different gas price or payload
func (s *SendError) IsReplacementUnderpriced(configErrors *ClientErrors) bool {
	return s.is(ReplacementTransactionUnderpriced, configErrors)
}

func (s *SendError) IsNonceTooLowError(configErrors *ClientErrors) bool {
	return s.is(NonceTooLow, configErrors)
}

func (s *SendError) IsNonceTooHighError(configErrors *ClientErrors) bool {
	return s.is(NonceTooHigh, configErrors)
}

// IsTransactionAlreadyMined - Harmony returns this error if the transaction has already been mined
func (s *SendError) IsTransactionAlreadyMined(configErrors *ClientErrors) bool {
	return s.is(TransactionAlreadyMined, configErrors)
}

// Geth/parity returns this error if the transaction is already in the node's mempool
func (s *SendError) IsTransactionAlreadyInMempool(configErrors *ClientErrors) bool {
	return s.is(TransactionAlreadyInMempool, configErrors)
}

// IsTerminallyUnderpriced indicates that this transaction is so far underpriced the node won't even accept it in the first place
func (s *SendError) IsTerminallyUnderpriced(configErrors *ClientErrors) bool {
	return s.is(TerminallyUnderpriced, configErrors)
}

func (s *SendError) IsTemporarilyUnderpriced(configErrors *ClientErrors) bool {
	return s.is(LimitReached, configErrors)
}

func (s *SendError) IsInsufficientEth(configErrors *ClientErrors) bool {
	return s.is(InsufficientEth, configErrors)
}

// IsTxFeeExceedsCap returns true if the transaction and gas price are combined in
// some way that makes the total transaction too expensive for the eth node to
// accept at all. No amount of retrying at this or higher gas prices can ever
// succeed.
func (s *SendError) IsTxFeeExceedsCap(configErrors *ClientErrors) bool {
	return s.is(TxFeeExceedsCap, configErrors)
}

// L2FeeTooLow is an l2-specific error returned when total fee is too low
func (s *SendError) L2FeeTooLow(configErrors *ClientErrors) bool {
	return s.is(L2FeeTooLow, configErrors)
}

// IsL2FeeTooHigh is an l2-specific error returned when total fee is too high
func (s *SendError) IsL2FeeTooHigh(configErrors *ClientErrors) bool {
	return s.is(L2FeeTooHigh, configErrors)
}

// IsL2Full is an l2-specific error returned when the queue or mempool is full.
func (s *SendError) IsL2Full(configErrors *ClientErrors) bool {
	return s.is(L2Full, configErrors)
}

// IsServiceUnavailable indicates if the error was caused by a service being unavailable
func (s *SendError) IsServiceUnavailable(configErrors *ClientErrors) bool {
	if s == nil || s.err == nil {
		return false
	}

	return s.is(ServiceUnavailable, configErrors) || pkgerrors.Is(s.err, multinode.ErrNodeError)
}

// IsServiceTimeout indicates if the error was caused by a service timeout
func (s *SendError) IsServiceTimeout(configErrors *ClientErrors) bool {
	return s.is(ServiceTimeout, configErrors)
}

// IsTerminallyStuck indicates if a transaction was stuck without any chance of inclusion
func (s *SendError) IsTerminallyStuckConfigError(configErrors *ClientErrors) bool {
	return s.is(TerminallyStuck, configErrors)
}

// IsFatal indicates if a transaction error is considered fatal for external callers
// The naming discrepancy is due to the generic transaction statuses introduced by ChainWriter
func (s *SendError) IsFatal() bool {
	// An error classified as terminally stuck is considered fatal since the transaction payload should NOT be retried by external callers
	return s.IsTerminallyStuckConfigError(nil)
}

// IsTimeout indicates if the error was caused by an exceeded context deadline
func (s *SendError) IsTimeout() bool {
	if s == nil {
		return false
	}
	if s.err == nil {
		return false
	}
	return pkgerrors.Is(s.err, context.DeadlineExceeded)
}

// IsCanceled indicates if the error was caused by an context cancellation
func (s *SendError) IsCanceled() bool {
	if s == nil {
		return false
	}
	if s.err == nil {
		return false
	}
	return pkgerrors.Is(s.err, context.Canceled)
}

func NewFatalSendError(e error) *SendError {
	if e == nil {
		return nil
	}
	return &SendError{err: pkgerrors.WithStack(e), fatal: true}
}

func NewSendErrorS(s string) *SendError {
	return NewSendError(pkgerrors.New(s))
}

func NewSendError(e error) *SendError {
	if e == nil {
		return nil
	}
	fatal := isFatalSendError(e)
	return &SendError{err: pkgerrors.WithStack(e), fatal: fatal}
}

func NewTxError(e error) commontypes.ErrorClassifier {
	return NewSendError(e)
}

// Geth/parity returns these errors if the transaction failed in such a way that:
// 1. It will never be included into a block as a result of this send
// 2. Resending the transaction at a different gas price will never change the outcome
func isFatalSendError(err error) bool {
	if err == nil {
		return false
	}
	str := pkgerrors.Cause(err).Error()

	for _, client := range clients {
		if _, ok := client[Fatal]; !ok {
			continue
		}
		if client[Fatal].MatchString(str) {
			return true
		}
	}
	return false
}

var (
	_ rpc.Error     = JsonError{}
	_ rpc.DataError = JsonError{}
)

// go-ethereum@v1.10.0/rpc/json.go
type JsonError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func (err JsonError) Error() string {
	if err.Message == "" {
		return fmt.Sprintf("json-rpc error { Code = %d, Data = '%v' }", err.Code, err.Data)
	}
	return err.Message
}

// To satisfy rpc.Error interface
func (err JsonError) ErrorCode() int {
	return err.Code
}

// To satisfy rpc.DataError
func (err JsonError) ErrorData() interface{} {
	return err.Data
}

func (err JsonError) String() string {
	return fmt.Sprintf("json-rpc error { Code = %d, Message = '%s', Data = '%v' }", err.Code, err.Message, err.Data)
}

func ExtractRPCErrorOrNil(err error) *JsonError {
	jErr, eErr := ExtractRPCError(err)
	if eErr != nil {
		return nil
	}
	return jErr
}

// ExtractRPCError attempts to extract a full JsonError (including revert reason details)
// from an error returned by a CallContract to an external RPC. As per https://github.com/ethereum/go-ethereum/blob/c49e065fea78a5d3759f7853a608494913e5824e/internal/ethapi/api.go#L974
// CallContract server side for a revert will return an error which contains either:
//   - The error directly from the EVM if there's no data (no revert reason, like an index out of bounds access) which
//     when marshalled will only have a Message.
//   - An error which implements rpc.DataError which when marshalled will have a Data field containing the execution result.
//     If the revert not a custom Error (solidity >= 0.8.0), like require(1 == 2, "revert"), then geth and forks will automatically
//     parse the string and put it in the message. If its a custom error, it's up to the client to decode the Data field which will be
//     the abi encoded data of the custom error, i.e. revert MyCustomError(10) -> keccak(MyCustomError(uint256))[:4] || abi.encode(10).
//
// However, it appears that RPCs marshal this in different ways into a JsonError object received client side,
// some adding "Reverted" prefixes, removing the method signature etc. To avoid RPC specific parsing and support custom errors
// we return the full object returned from the RPC with a String() method that stringifies all fields for logging so no information is lost.
// Some examples:
// kovan (parity)
// { "error": { "code" : -32015, "data": "Reverted 0xABC123...", "message": "VM execution error." } } // revert reason always omitted from message.
// rinkeby / ropsten (geth)
// { "error":  { "code": 3, "data": "0xABC123...", "message": "execution reverted: hello world" } } // revert reason automatically parsed if a simple require and included in message.
func ExtractRPCError(baseErr error) (*JsonError, error) {
	if baseErr == nil {
		return nil, pkgerrors.New("no error present")
	}
	cause := pkgerrors.Cause(baseErr)
	jsonBytes, err := json.Marshal(cause)
	if err != nil {
		return nil, pkgerrors.Wrap(err, "unable to marshal err to json")
	}
	jErr := JsonError{}
	err = json.Unmarshal(jsonBytes, &jErr)
	if err != nil {
		return nil, pkgerrors.Wrapf(err, "unable to unmarshal json into jsonError struct (got: %v)", baseErr)
	}
	if jErr.Code == 0 {
		return nil, pkgerrors.Errorf("not a RPCError because it does not have a code (got: %v)", baseErr)
	}
	return &jErr, nil
}

func ClassifySendError(err error, clientErrors config.ClientErrors, lggr logger.SugaredLogger, tx *types.Transaction, fromAddress common.Address, isL2 bool) multinode.SendTxReturnCode {
	sendError := NewSendError(err)
	if sendError == nil {
		return multinode.Successful
	}

	configErrors := ClientErrorRegexes(clientErrors)

	if sendError.Fatal(configErrors) {
		lggr.Criticalw("Fatal error sending transaction", "err", sendError, "etx", tx)
		// Attempt is thrown away in this case; we don't need it since it never got accepted by a node
		return multinode.Fatal
	}
	if sendError.IsNonceTooLowError(configErrors) || sendError.IsTransactionAlreadyMined(configErrors) {
		lggr.Debugw(fmt.Sprintf("Transaction already confirmed for this nonce: %d", tx.Nonce()), "err", sendError, "etx", tx)
		// Nonce too low indicated that a transaction at this nonce was confirmed already.
		// Mark it as TransactionAlreadyKnown.
		return multinode.TransactionAlreadyKnown
	}
	if sendError.IsReplacementUnderpriced(configErrors) {
		lggr.Errorw(fmt.Sprintf("Replacement transaction underpriced for eth_tx %x. "+
			"Please note that using your node's private keys outside of the chainlink node is NOT SUPPORTED and can lead to missed transactions.",
			tx.Hash()), "gasPrice", tx.GasPrice, "gasTipCap", tx.GasTipCap, "gasFeeCap", tx.GasFeeCap, "err", sendError, "etx", tx)

		// Assume success and hand off to the next cycle.
		return multinode.Successful
	}
	if sendError.IsTransactionAlreadyInMempool(configErrors) {
		lggr.Debugw("Transaction already in mempool", "etx", tx, "err", sendError)
		return multinode.Successful
	}
	if sendError.IsTemporarilyUnderpriced(configErrors) {
		lggr.Infow("Transaction temporarily underpriced", "err", sendError)
		return multinode.Successful
	}
	if sendError.IsTerminallyUnderpriced(configErrors) {
		lggr.Errorw("Transaction terminally underpriced", "etx", tx, "err", sendError)
		return multinode.Underpriced
	}
	if sendError.L2FeeTooLow(configErrors) || sendError.IsL2FeeTooHigh(configErrors) || sendError.IsL2Full(configErrors) {
		if isL2 {
			lggr.Errorw("Transaction fee out of range", "err", sendError, "etx", tx)
			return multinode.FeeOutOfValidRange
		}
		lggr.Errorw("this error type only handled for L2s", "err", sendError, "etx", tx)
		return multinode.Unsupported
	}
	if sendError.IsNonceTooHighError(configErrors) {
		// This error occurs when the tx nonce is greater than current_nonce + tx_count_in_mempool,
		// instead of keeping the tx in mempool. This can happen if previous transactions haven't
		// reached the client yet. The correct thing to do is to mark it as retryable.
		lggr.Warnw("Transaction has a nonce gap.", "err", sendError, "etx", tx)
		return multinode.Retryable
	}
	if sendError.IsInsufficientEth(configErrors) {
		lggr.Criticalw(fmt.Sprintf("Tx %x with type 0x%d was rejected due to insufficient eth: %s\n"+
			"ACTION REQUIRED: Chainlink wallet with address 0x%x is OUT OF FUNDS",
			tx.Hash(), tx.Type(), sendError.Error(), fromAddress,
		), "err", sendError, "etx", tx)
		return multinode.InsufficientFunds
	}
	if sendError.IsServiceUnavailable(configErrors) {
		lggr.Errorw(fmt.Sprintf("service unavailable while sending transaction %x", tx.Hash()), "err", sendError, "etx", tx)
		return multinode.Retryable
	}
	if sendError.IsServiceTimeout(configErrors) {
		lggr.Errorw(fmt.Sprintf("service timed out while sending transaction %x", tx.Hash()), "err", sendError, "etx", tx)
		return multinode.Retryable
	}
	if sendError.IsTimeout() {
		lggr.Errorw(fmt.Sprintf("timeout while sending transaction %x", tx.Hash()), "err", sendError, "etx", tx)
		return multinode.Retryable
	}
	if sendError.IsCanceled() {
		lggr.Errorw(fmt.Sprintf("context was canceled while sending transaction %x", tx.Hash()), "err", sendError, "etx", tx)
		return multinode.Retryable
	}
	if sendError.IsTxFeeExceedsCap(configErrors) {
		lggr.Criticalw("Sending transaction failed: "+label.RPCTxFeeCapConfiguredIncorrectlyWarning,
			"etx", tx,
			"err", sendError,
			"id", "RPCTxFeeCapExceeded",
		)
		return multinode.ExceedsMaxFee
	}
	if sendError.IsTerminallyStuckConfigError(configErrors) {
		lggr.Warnw("Transaction that would have been terminally stuck in the mempool detected on send. Marking as fatal error.", "err", sendError, "etx", tx)
		// Attempt is thrown away in this case; we don't need it since it never got accepted by a node
		return multinode.TerminallyStuck
	}
	lggr.Criticalw("Unknown error encountered when sending transaction", "err", err, "etx", tx)
	return multinode.Unknown
}

var infura = ClientErrors{
	TooManyResults: regexp.MustCompile(`(: |^)query returned more than [0-9]+ results. Try with this block range \[0x[0-9A-F]+, 0x[0-9A-F]+\].$`),
}

var alchemy = ClientErrors{
	TooManyResults: regexp.MustCompile(`(: |^)Log response size exceeded. You can make eth_getLogs requests with up to a [0-9A-Z]+ block range and no limit on the response size, or you can request any block range with a cap of [0-9A-Z]+ logs in the response. Based on your parameters and the response size limit, this block range should work: \[0x[0-9a-f]+, 0x[0-9a-f]+\]$`),
}

var quicknode = ClientErrors{
	TooManyResults: regexp.MustCompile(`(: |^)eth_getLogs is limited to a [0-9,]+ range$`),
}

var simplyvc = ClientErrors{
	TooManyResults: regexp.MustCompile(`too wide blocks range, the limit is [0-9,]+$`),
}

var drpc = ClientErrors{
	TooManyResults: regexp.MustCompile(`(: |^)requested too many blocks from [0-9]+ to [0-9]+, maximum is set to [0-9,]+$`),
}

var hyperliquid = ClientErrors{
	TooManyResults: regexp.MustCompile(`(: |^)query exceeds max block range$`),
	MissingBlocks:  regexp.MustCompile(`(: |^)invalid block range$`),
}

// Linkpool, Blockdaemon, and Chainstack all return "request timed out" if the log results are too large for them to process
var defaultClient = ClientErrors{
	TooManyResults: regexp.MustCompile(`request timed out|408 Request Timed Out$`),
}

// JSON-RPC error codes which can indicate a refusal of the server to process an eth_getLogs request because the result set is too large
const (
	jsonRPCServerError = -32000 // Server error. SimplyVC uses this error code when too many results are returned

	// Server timeout. When the rpc server has its own limit on how long it can take to compile the results
	// Examples: Linkpool, Chainstack, Block Daemon
	jsonRPCTimedOut = -32002

	// See: https://github.com/ethereum/go-ethereum/blob/master/rpc/errors.go#L63
	// Can occur if the rpc server is configured with a maximum byte limit on the response size of batch requests
	jsonRPCResponseTooLarge = -32003

	// Not implemented in geth by default, but is defined in EIP 1474 and implemented by infura and some other 3rd party rpc servers
	// See: https://community.infura.io/t/getlogs-error-query-returned-more-than-1000-results/358/5
	jsonRPCLimitExceeded = -32005 // See also: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1474.md

	jsonRPCInvalidParams = -32602 // Invalid method params. Returned by alchemy if the block range is too large or there are too many results to return. Also returned by hyperliquid for invalid block range or block range too large

	jsonRPCQuicknodeTooManyResults = -32614 // Undocumented error code used by Quicknode for too many results error
)

func IsTooManyResults(err error, clientErrors config.ClientErrors) bool {
	// Context timeouts often occur when receiving too many results from RPCs
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}

	var rpcErr rpc.Error
	if !pkgerrors.As(err, &rpcErr) {
		return false
	}
	configErrors := ClientErrorRegexes(clientErrors)
	if configErrors.ErrIs(rpcErr, TooManyResults) {
		return true
	}

	switch rpcErr.ErrorCode() {
	case jsonRPCResponseTooLarge:
		return true
	case jsonRPCLimitExceeded:
		if infura.ErrIs(rpcErr, TooManyResults) {
			return true
		}
	case jsonRPCInvalidParams:
		if alchemy.ErrIs(rpcErr, TooManyResults) {
			return true
		}
		if hyperliquid.ErrIs(rpcErr, TooManyResults) {
			return true
		}
	case jsonRPCQuicknodeTooManyResults:
		if quicknode.ErrIs(rpcErr, TooManyResults) {
			return true
		}
	case jsonRPCTimedOut:
		if defaultClient.ErrIs(rpcErr, TooManyResults) {
			return true
		}
	case jsonRPCServerError:
		if simplyvc.ErrIs(rpcErr, TooManyResults) ||
			drpc.ErrIs(rpcErr, TooManyResults) {
			return true
		}
	}
	return false
}

// IsMissingBlocks indicates that the error is caused by the rpc server not having some of the blocks requested at all
// This is treated as a permanent error rather than a transient issue, and should be logged as Critical
func IsMissingBlocks(err error, clientErrors config.ClientErrors) bool {
	var rpcErr rpc.Error
	if !pkgerrors.As(err, &rpcErr) {
		return false
	}
	configErrors := ClientErrorRegexes(clientErrors)
	if configErrors.ErrIs(rpcErr, MissingBlocks) {
		return true
	}

	if rpcErr.ErrorCode() == jsonRPCInvalidParams && hyperliquid.ErrIs(rpcErr, MissingBlocks) {
		return true
	}
	return false
}
