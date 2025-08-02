package ccipsolana

import (
	chainsel "github.com/smartcontractkit/chain-selectors"

	"github.com/smartcontractkit/chainlink/v2/core/capabilities/ccip/ocrimpls"

	ccipcommon "github.com/smartcontractkit/chainlink/v2/core/capabilities/ccip/common"
	"github.com/smartcontractkit/chainlink/v2/core/logger"
)

// InitializePluginConfig returns a pluginConfig for Solana chains.
func InitializePluginConfig(lggr logger.Logger, extraDataCodec ccipcommon.ExtraDataCodec) ccipcommon.PluginConfig {
	return ccipcommon.PluginConfig{
		CommitPluginCodec:          NewCommitPluginCodecV1(),
		ExecutePluginCodec:         NewExecutePluginCodecV1(extraDataCodec),
		MessageHasher:              NewMessageHasherV1(lggr.Named(chainsel.FamilySolana).Named("MessageHasherV1"), extraDataCodec),
		TokenDataEncoder:           NewSolanaTokenDataEncoder(),
		GasEstimateProvider:        NewGasEstimateProvider(extraDataCodec),
		RMNCrypto:                  nil,
		ContractTransmitterFactory: ocrimpls.NewSVMContractTransmitterFactory(extraDataCodec),
	}
}
