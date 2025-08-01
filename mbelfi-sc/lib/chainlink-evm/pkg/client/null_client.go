package client

import (
	"context"
	"math/big"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/rpc"

	"github.com/smartcontractkit/chainlink-common/pkg/assets"
	"github.com/smartcontractkit/chainlink-common/pkg/logger"
	"github.com/smartcontractkit/chainlink-framework/multinode"

	evmtypes "github.com/smartcontractkit/chainlink-evm/pkg/types"
)

// NullClient satisfies the Client but has no side effects
type NullClient struct {
	cid  *big.Int
	lggr logger.Logger
}

func NewNullClient(cid *big.Int, lggr logger.Logger) *NullClient {
	return &NullClient{cid: cid, lggr: logger.Named(lggr, "NullClient")}
}

// NullClientChainID the ChainID that nullclient will return
// 0 is never used as a real chain ID so makes sense as a dummy value here
const NullClientChainID = 0

//
// Client methods
//

func (nc *NullClient) Dial(context.Context) error {
	nc.lggr.Debug("Dial")
	return nil
}

func (nc *NullClient) Close() {
	nc.lggr.Debug("Close")
}

func (nc *NullClient) TokenBalance(ctx context.Context, address common.Address, contractAddress common.Address) (*big.Int, error) {
	nc.lggr.Debug("TokenBalance")
	return big.NewInt(0), nil
}

func (nc *NullClient) LINKBalance(ctx context.Context, address common.Address, linkAddress common.Address) (*assets.Link, error) {
	nc.lggr.Debug("LINKBalance")
	return assets.NewLinkFromJuels(0), nil
}

func (nc *NullClient) CallContext(ctx context.Context, result interface{}, method string, args ...interface{}) error {
	nc.lggr.Debug("CallContext")
	return nil
}

func (nc *NullClient) HeadByNumber(ctx context.Context, n *big.Int) (*evmtypes.Head, error) {
	nc.lggr.Debug("HeadByNumber")
	return nil, nil
}

func (nc *NullClient) HeadByHash(ctx context.Context, h common.Hash) (*evmtypes.Head, error) {
	nc.lggr.Debug("HeadByHash")
	return nil, nil
}

type nullSubscription struct {
	lggr logger.Logger
}

func newNullSubscription(lggr logger.Logger) *nullSubscription {
	return &nullSubscription{lggr: logger.Named(lggr, "NullSubscription")}
}

func (ns *nullSubscription) Unsubscribe() {
	ns.lggr.Debug("Unsubscribe")
}

func (ns *nullSubscription) Err() <-chan error {
	ns.lggr.Debug("Err")
	return nil
}

func (nc *NullClient) SubscribeFilterLogs(ctx context.Context, q ethereum.FilterQuery, ch chan<- types.Log) (ethereum.Subscription, error) {
	nc.lggr.Debug("SubscribeFilterLogs")
	return newNullSubscription(nc.lggr), nil
}

func (nc *NullClient) SubscribeToHeads(ctx context.Context) (<-chan *evmtypes.Head, ethereum.Subscription, error) {
	nc.lggr.Debug("SubscribeToHeads")
	return nil, newNullSubscription(nc.lggr), nil
}

//
// GethClient methods
//

func (nc *NullClient) ConfiguredChainID() *big.Int {
	nc.lggr.Debug("ConfiguredChainID")
	if nc.cid != nil {
		return nc.cid
	}
	return big.NewInt(NullClientChainID)
}

func (nc *NullClient) ChainID() (*big.Int, error) {
	nc.lggr.Debug("ChainID")
	return nil, nil
}

func (nc *NullClient) HeaderByNumber(ctx context.Context, n *big.Int) (*types.Header, error) {
	nc.lggr.Debug("HeaderByNumber")
	return nil, nil
}

func (nc *NullClient) HeaderByHash(ctx context.Context, h common.Hash) (*types.Header, error) {
	nc.lggr.Debug("HeaderByHash")
	return nil, nil
}

func (nc *NullClient) SendTransactionReturnCode(ctx context.Context, tx *types.Transaction, sender common.Address) (multinode.SendTxReturnCode, error) {
	nc.lggr.Debug("SendTransactionReturnCode")
	return multinode.Successful, nil
}

func (nc *NullClient) SendTransaction(ctx context.Context, tx *types.Transaction) error {
	nc.lggr.Debug("SendTransaction")
	return nil
}

func (nc *NullClient) PendingCodeAt(ctx context.Context, account common.Address) ([]byte, error) {
	nc.lggr.Debug("PendingCodeAt")
	return nil, nil
}

func (nc *NullClient) PendingNonceAt(ctx context.Context, account common.Address) (uint64, error) {
	nc.lggr.Debug("PendingNonceAt")
	return 0, nil
}

func (nc *NullClient) NonceAt(ctx context.Context, account common.Address, blockNumber *big.Int) (uint64, error) {
	nc.lggr.Debug("NonceAt")
	return 0, nil
}

func (nc *NullClient) TransactionReceipt(ctx context.Context, txHash common.Hash) (*types.Receipt, error) {
	nc.lggr.Debug("TransactionReceipt")
	return nil, nil
}

func (nc *NullClient) TransactionByHash(ctx context.Context, txHash common.Hash) (*types.Transaction, error) {
	nc.lggr.Debug("TransactionByHash")
	return nil, nil
}

func (nc *NullClient) BlockByNumber(ctx context.Context, number *big.Int) (*types.Block, error) {
	nc.lggr.Debug("BlockByNumber")
	return nil, nil
}

func (nc *NullClient) BlockByHash(ctx context.Context, hash common.Hash) (*types.Block, error) {
	nc.lggr.Debug("BlockByHash")
	return nil, nil
}

func (nc *NullClient) LatestBlockHeight(ctx context.Context) (*big.Int, error) {
	nc.lggr.Debug("LatestBlockHeight")
	return nil, nil
}

func (nc *NullClient) BalanceAt(ctx context.Context, account common.Address, blockNumber *big.Int) (*big.Int, error) {
	nc.lggr.Debug("BalanceAt")
	return big.NewInt(0), nil
}

func (nc *NullClient) FilterLogs(ctx context.Context, q ethereum.FilterQuery) ([]types.Log, error) {
	nc.lggr.Debug("FilterLogs")
	return nil, nil
}

func (nc *NullClient) EstimateGas(ctx context.Context, call ethereum.CallMsg) (uint64, error) {
	nc.lggr.Debug("EstimateGas")
	return 0, nil
}

func (nc *NullClient) SuggestGasPrice(ctx context.Context) (*big.Int, error) {
	nc.lggr.Debug("SuggestGasPrice")
	return big.NewInt(0), nil
}

func (nc *NullClient) CallContract(ctx context.Context, msg ethereum.CallMsg, blockNumber *big.Int) ([]byte, error) {
	nc.lggr.Debug("CallContract")
	return nil, nil
}

func (nc *NullClient) PendingCallContract(ctx context.Context, msg ethereum.CallMsg) ([]byte, error) {
	nc.lggr.Debug("PendingCallContract")
	return nil, nil
}

func (nc *NullClient) CodeAt(ctx context.Context, account common.Address, blockNumber *big.Int) ([]byte, error) {
	nc.lggr.Debug("CodeAt")
	return nil, nil
}

func (nc *NullClient) BatchCallContext(ctx context.Context, b []rpc.BatchElem) error {
	return nil
}

// BatchCallContextAll implements evmclient.Client interface
func (nc *NullClient) BatchCallContextAll(ctx context.Context, b []rpc.BatchElem) error {
	return nil
}

func (nc *NullClient) SuggestGasTipCap(ctx context.Context) (tipCap *big.Int, err error) {
	return nil, nil
}

// NodeStates implements evmclient.Client
func (nc *NullClient) NodeStates() map[string]string { return nil }

func (nc *NullClient) IsL2() bool {
	nc.lggr.Debug("IsL2")
	return false
}

func (nc *NullClient) LatestFinalizedBlock(_ context.Context) (*evmtypes.Head, error) {
	return nil, nil
}

func (nc *NullClient) LatestSafeBlock(_ context.Context) (*evmtypes.Head, error) {
	return nil, nil
}

func (nc *NullClient) CheckTxValidity(_ context.Context, _ common.Address, _ common.Address, _ []byte) *SendError {
	return nil
}

func (nc *NullClient) FeeHistory(ctx context.Context, blockCount uint64, lastBlock *big.Int, rewardPercentiles []float64) (feeHistory *ethereum.FeeHistory, err error) {
	return nil, nil
}
