package config

import (
	"math/big"
	"net/url"
	"time"

	gethcommon "github.com/ethereum/go-ethereum/common"

	commonassets "github.com/smartcontractkit/chainlink-common/pkg/assets"
	commontypes "github.com/smartcontractkit/chainlink-common/pkg/types"

	"github.com/smartcontractkit/chainlink-evm/pkg/assets"
	"github.com/smartcontractkit/chainlink-evm/pkg/config/chaintype"
	"github.com/smartcontractkit/chainlink-evm/pkg/config/toml"
	"github.com/smartcontractkit/chainlink-evm/pkg/types"
)

type EVM interface {
	HeadTracker() HeadTracker
	BalanceMonitor() BalanceMonitor
	Transactions() Transactions
	GasEstimator() GasEstimator
	OCR() OCR
	OCR2() OCR2
	Workflow() Workflow
	NodePool() NodePool

	AutoCreateKey() bool
	BlockBackfillDepth() uint64
	BlockBackfillSkip() bool
	BlockEmissionIdleWarningThreshold() time.Duration
	ChainID() *big.Int
	ChainType() chaintype.ChainType
	FinalityDepth() uint32
	SafeDepth() uint32
	FinalityTagEnabled() bool
	FlagsContractAddress() string
	LinkContractAddress() string
	LogBackfillBatchSize() uint32
	LogKeepBlocksDepth() uint32
	BackupLogPollerBlockDelay() uint64
	LogPollInterval() time.Duration
	LogPrunePageSize() uint32
	MinContractPayment() *commonassets.Link
	MinIncomingConfirmations() uint32
	NonceAutoSync() bool
	OperatorFactoryAddress() string
	LogBroadcasterEnabled() bool
	RPCDefaultBatchSize() uint32
	NodeNoNewHeadsThreshold() time.Duration
	FinalizedBlockOffset() uint32
	NoNewFinalizedHeadsThreshold() time.Duration
	// Applies to EVMService. This is the maximum amount of time we will wait for a TX to get confirmed in the chain.
	ConfirmationTimeout() time.Duration

	IsEnabled() bool
	TOMLString() (string, error)
}

type OCR interface {
	ContractConfirmations() uint16
	ContractTransmitterTransmitTimeout() time.Duration
	ObservationGracePeriod() time.Duration
	DatabaseTimeout() time.Duration
	DeltaCOverride() time.Duration
	DeltaCJitterOverride() time.Duration
}

type OCR2 interface {
	Automation() OCR2Automation
}

type OCR2Automation interface {
	GasLimit() uint32
}

type HeadTracker interface {
	HistoryDepth() uint32
	MaxBufferSize() uint32
	SamplingInterval() time.Duration
	FinalityTagBypass() bool
	MaxAllowedFinalityDepth() uint32
	PersistenceEnabled() bool
}

type BalanceMonitor interface {
	Enabled() bool
}

type ClientErrors interface {
	NonceTooLow() string
	NonceTooHigh() string
	ReplacementTransactionUnderpriced() string
	LimitReached() string
	TransactionAlreadyInMempool() string
	TerminallyUnderpriced() string
	InsufficientEth() string
	TxFeeExceedsCap() string
	L2FeeTooLow() string
	L2FeeTooHigh() string
	L2Full() string
	TransactionAlreadyMined() string
	Fatal() string
	ServiceUnavailable() string
	TooManyResults() string
	MissingBlocks() string
}

type Transactions interface {
	Enabled() bool
	ForwardersEnabled() bool
	ReaperInterval() time.Duration
	ResendAfterThreshold() time.Duration
	ReaperThreshold() time.Duration
	MaxInFlight() uint32
	MaxQueued() uint64
	AutoPurge() AutoPurgeConfig
	TransactionManagerV2() TransactionManagerV2
}

type AutoPurgeConfig interface {
	Enabled() bool
	Threshold() *uint32
	MinAttempts() *uint32
	DetectionApiUrl() *url.URL
}

type TransactionManagerV2 interface {
	Enabled() bool
	BlockTime() *time.Duration
	CustomURL() *url.URL
	DualBroadcast() *bool
}

type GasEstimator interface {
	BlockHistory() BlockHistory
	FeeHistory() FeeHistory
	LimitJobType() LimitJobType

	EIP1559DynamicFees() bool
	BumpPercent() uint16
	BumpThreshold() uint64
	BumpTxDepth() uint32
	BumpMin() *assets.Wei
	FeeCapDefault() *assets.Wei
	LimitDefault() uint64
	LimitMax() uint64
	LimitMultiplier() float32
	LimitTransfer() uint64
	PriceDefault() *assets.Wei
	TipCapDefault() *assets.Wei
	TipCapMin() *assets.Wei
	PriceMax() *assets.Wei
	PriceMin() *assets.Wei
	Mode() string
	PriceMaxKey(gethcommon.Address) *assets.Wei
	EstimateLimit() bool
	SenderAddress() *types.EIP55Address
	DAOracle() DAOracle
}

type LimitJobType interface {
	OCR() *uint32
	OCR2() *uint32
	DR() *uint32
	FM() *uint32
	Keeper() *uint32
	VRF() *uint32
}

type BlockHistory interface {
	BatchSize() uint32
	BlockHistorySize() uint16
	BlockDelay() uint16
	CheckInclusionBlocks() uint16
	CheckInclusionPercentile() uint16
	EIP1559FeeCapBufferBlocks() uint16
	TransactionPercentile() uint16
}

type DAOracle interface {
	OracleType() *toml.DAOracleType
	OracleAddress() *types.EIP55Address
	CustomGasPriceCalldata() *string
}

type FeeHistory interface {
	CacheTimeout() time.Duration
}

type Workflow interface {
	AcceptanceTimeout() time.Duration
	ForwarderAddress() *types.EIP55Address
	FromAddress() *types.EIP55Address
	GasLimitDefault() *uint64
	PollPeriod() time.Duration
	TxAcceptanceState() *commontypes.TransactionStatus
}

type NodePool interface {
	PollFailureThreshold() uint32
	PollInterval() time.Duration
	SelectionMode() string
	SyncThreshold() uint32
	LeaseDuration() time.Duration
	NodeIsSyncingEnabled() bool
	FinalizedBlockPollInterval() time.Duration
	Errors() ClientErrors
	EnforceRepeatableRead() bool
	DeathDeclarationDelay() time.Duration
	NewHeadsPollInterval() time.Duration
	VerifyChainID() bool
}

type ChainScopedConfig interface {
	EVM() EVM
}
