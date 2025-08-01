package txmgr

import (
	"net/url"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/smartcontractkit/chainlink-evm/pkg/assets"
	evmconfig "github.com/smartcontractkit/chainlink-evm/pkg/config"
	"github.com/smartcontractkit/chainlink-evm/pkg/config/chaintype"
	"github.com/smartcontractkit/chainlink-evm/pkg/config/toml"
	"github.com/smartcontractkit/chainlink-evm/pkg/types"
	"github.com/smartcontractkit/chainlink-evm/pkg/utils"
)

func ptr[T any](t T) *T { return &t }

type TestDatabaseConfig struct {
	DatabaseConfig
	defaultQueryTimeout time.Duration
}

func (d *TestDatabaseConfig) DefaultQueryTimeout() time.Duration {
	return d.defaultQueryTimeout
}

func (d *TestDatabaseConfig) LogSQL() bool {
	return false
}

type TestListenerConfig struct {
	ListenerConfig
}

func (l *TestListenerConfig) FallbackPollInterval() time.Duration {
	return 1 * time.Minute
}

func (d *TestDatabaseConfig) Listener() ListenerConfig {
	return &TestListenerConfig{}
}

type TestEvmConfig struct {
	evmconfig.EVM
	MaxInFlight          uint32
	ReaperInterval       time.Duration
	ReaperThreshold      time.Duration
	ResendAfterThreshold time.Duration
	BumpThreshold        uint64
	MaxQueued            uint64
	Enabled              bool
	Threshold            uint32
	MinAttempts          uint32
	DetectionApiUrl      *url.URL
	RpcDefaultBatchSize  uint32
}

func (e *TestEvmConfig) Transactions() evmconfig.Transactions {
	return &transactionsConfig{e: e, autoPurge: &autoPurgeConfig{}}
}

func (e *TestEvmConfig) NonceAutoSync() bool { return true }

func (e *TestEvmConfig) FinalityDepth() uint32 { return 42 }

func (e *TestEvmConfig) ChainType() chaintype.ChainType { return "" }

func (e *TestEvmConfig) RPCDefaultBatchSize() uint32 { return e.RpcDefaultBatchSize }

type TestGasEstimatorConfig struct {
	bumpThreshold uint64
}

func (g *TestGasEstimatorConfig) DAOracle() evmconfig.DAOracle {
	return &TestDAOracleConfig{}
}

type TestDAOracleConfig struct {
	evmconfig.DAOracle
}

func (d *TestDAOracleConfig) OracleType() *toml.DAOracleType {
	oracleType := toml.DAOracleOPStack
	return &oracleType
}
func (d *TestDAOracleConfig) OracleAddress() *types.EIP55Address {
	a, err := types.NewEIP55Address("0x420000000000000000000000000000000000000F")
	if err != nil {
		panic(err)
	}
	return &a
}
func (d *TestDAOracleConfig) CustomGasPriceCalldata() *string { return nil }

func (g *TestGasEstimatorConfig) BlockHistory() evmconfig.BlockHistory {
	return &TestBlockHistoryConfig{}
}

func (g *TestGasEstimatorConfig) FeeHistory() evmconfig.FeeHistory {
	return &TestFeeHistoryConfig{}
}

func (g *TestGasEstimatorConfig) EIP1559DynamicFees() bool           { return false }
func (g *TestGasEstimatorConfig) LimitDefault() uint64               { return 42 }
func (g *TestGasEstimatorConfig) BumpPercent() uint16                { return 42 }
func (g *TestGasEstimatorConfig) BumpThreshold() uint64              { return g.bumpThreshold }
func (g *TestGasEstimatorConfig) BumpMin() *assets.Wei               { return assets.NewWeiI(42) }
func (g *TestGasEstimatorConfig) FeeCapDefault() *assets.Wei         { return assets.NewWeiI(42) }
func (g *TestGasEstimatorConfig) PriceDefault() *assets.Wei          { return assets.NewWeiI(42) }
func (g *TestGasEstimatorConfig) TipCapDefault() *assets.Wei         { return assets.NewWeiI(42) }
func (g *TestGasEstimatorConfig) TipCapMin() *assets.Wei             { return assets.NewWeiI(42) }
func (g *TestGasEstimatorConfig) LimitMax() uint64                   { return 0 }
func (g *TestGasEstimatorConfig) LimitMultiplier() float32           { return 0 }
func (g *TestGasEstimatorConfig) BumpTxDepth() uint32                { return 42 }
func (g *TestGasEstimatorConfig) LimitTransfer() uint64              { return 42 }
func (g *TestGasEstimatorConfig) PriceMax() *assets.Wei              { return assets.NewWeiI(42) }
func (g *TestGasEstimatorConfig) PriceMin() *assets.Wei              { return assets.NewWeiI(42) }
func (g *TestGasEstimatorConfig) Mode() string                       { return "FixedPrice" }
func (g *TestGasEstimatorConfig) EstimateLimit() bool                { return false }
func (g *TestGasEstimatorConfig) SenderAddress() *types.EIP55Address { return nil }
func (g *TestGasEstimatorConfig) LimitJobType() evmconfig.LimitJobType {
	return &TestLimitJobTypeConfig{}
}
func (g *TestGasEstimatorConfig) PriceMaxKey(addr common.Address) *assets.Wei {
	return assets.NewWeiI(42)
}

func (e *TestEvmConfig) GasEstimator() evmconfig.GasEstimator {
	return &TestGasEstimatorConfig{bumpThreshold: e.BumpThreshold}
}

type TestLimitJobTypeConfig struct {
}

func (l *TestLimitJobTypeConfig) OCR() *uint32    { return ptr(uint32(0)) }
func (l *TestLimitJobTypeConfig) OCR2() *uint32   { return ptr(uint32(0)) }
func (l *TestLimitJobTypeConfig) DR() *uint32     { return ptr(uint32(0)) }
func (l *TestLimitJobTypeConfig) FM() *uint32     { return ptr(uint32(0)) }
func (l *TestLimitJobTypeConfig) Keeper() *uint32 { return ptr(uint32(0)) }
func (l *TestLimitJobTypeConfig) VRF() *uint32    { return ptr(uint32(0)) }

type TestBlockHistoryConfig struct {
	evmconfig.BlockHistory
}

func (b *TestBlockHistoryConfig) BatchSize() uint32                 { return 42 }
func (b *TestBlockHistoryConfig) BlockDelay() uint16                { return 42 }
func (b *TestBlockHistoryConfig) BlockHistorySize() uint16          { return 42 }
func (b *TestBlockHistoryConfig) EIP1559FeeCapBufferBlocks() uint16 { return 42 }
func (b *TestBlockHistoryConfig) TransactionPercentile() uint16     { return 42 }

type TestFeeHistoryConfig struct {
	evmconfig.FeeHistory
}

func (b *TestFeeHistoryConfig) CacheTimeout() time.Duration { return 0 * time.Second }

type transactionsConfig struct {
	evmconfig.Transactions
	e         *TestEvmConfig
	autoPurge evmconfig.AutoPurgeConfig
}

func (*transactionsConfig) ForwardersEnabled() bool                { return true }
func (t *transactionsConfig) MaxInFlight() uint32                  { return t.e.MaxInFlight }
func (t *transactionsConfig) MaxQueued() uint64                    { return t.e.MaxQueued }
func (t *transactionsConfig) ReaperInterval() time.Duration        { return t.e.ReaperInterval }
func (t *transactionsConfig) ReaperThreshold() time.Duration       { return t.e.ReaperThreshold }
func (t *transactionsConfig) ResendAfterThreshold() time.Duration  { return t.e.ResendAfterThreshold }
func (t *transactionsConfig) AutoPurge() evmconfig.AutoPurgeConfig { return t.autoPurge }

type autoPurgeConfig struct {
	evmconfig.AutoPurgeConfig
}

func (a *autoPurgeConfig) Enabled() bool { return false }

type MockConfig struct {
	EvmConfig          *TestEvmConfig
	finalityDepth      uint32
	finalityTagEnabled bool
}

func (c *MockConfig) EVM() evmconfig.EVM {
	return c.EvmConfig
}

func (c *MockConfig) NonceAutoSync() bool            { return true }
func (c *MockConfig) ChainType() chaintype.ChainType { return "" }
func (c *MockConfig) FinalityDepth() uint32          { return c.finalityDepth }
func (c *MockConfig) SetFinalityDepth(fd uint32)     { c.finalityDepth = fd }
func (c *MockConfig) FinalityTagEnabled() bool       { return c.finalityTagEnabled }

func MakeTestConfigs(tb testing.TB) (*MockConfig, *TestDatabaseConfig, *TestEvmConfig) {
	db := &TestDatabaseConfig{defaultQueryTimeout: utils.DefaultQueryTimeout}
	ec := &TestEvmConfig{BumpThreshold: 42, MaxInFlight: uint32(42), MaxQueued: uint64(0), ReaperInterval: time.Duration(0), ReaperThreshold: time.Duration(0), RpcDefaultBatchSize: uint32(250)}
	config := &MockConfig{EvmConfig: ec}
	return config, db, ec
}
