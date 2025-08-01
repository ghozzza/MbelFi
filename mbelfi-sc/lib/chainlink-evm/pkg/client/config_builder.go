package client

import (
	"fmt"
	"net/url"
	"time"

	"go.uber.org/multierr"

	commonconfig "github.com/smartcontractkit/chainlink-common/pkg/config"
	"github.com/smartcontractkit/chainlink-framework/multinode"

	evmconfig "github.com/smartcontractkit/chainlink-evm/pkg/config"
	"github.com/smartcontractkit/chainlink-evm/pkg/config/chaintype"
	"github.com/smartcontractkit/chainlink-evm/pkg/config/toml"
)

type NodeConfig struct {
	Name     *string
	WSURL    *string
	HTTPURL  *string
	SendOnly *bool
	Order    *int32
}

// Build the configs needed to initialize the chain client
// Parameters should only be basic go types to make it accessible for external users
// Configs can be stored in a variety of ways
func NewClientConfigs(
	selectionMode *string,
	leaseDuration time.Duration,
	chainType string,
	nodeCfgs []NodeConfig,
	pollFailureThreshold *uint32,
	pollInterval time.Duration,
	syncThreshold *uint32,
	nodeIsSyncingEnabled *bool,
	noNewHeadsThreshold time.Duration,
	finalityDepth *uint32,
	finalityTagEnabled *bool,
	finalizedBlockOffset *uint32,
	enforceRepeatableRead *bool,
	deathDeclarationDelay time.Duration,
	noNewFinalizedHeadsThreshold time.Duration,
	finalizedBlockPollInterval time.Duration,
	newHeadsPollInterval time.Duration,
	confirmationTimeout time.Duration,
) (multinode.ChainConfig, evmconfig.NodePool, []*toml.Node, error) {
	nodes, err := parseNodeConfigs(nodeCfgs)
	if err != nil {
		return nil, nil, nil, err
	}
	nodePool := toml.NodePool{
		SelectionMode:              selectionMode,
		LeaseDuration:              commonconfig.MustNewDuration(leaseDuration),
		PollFailureThreshold:       pollFailureThreshold,
		PollInterval:               commonconfig.MustNewDuration(pollInterval),
		SyncThreshold:              syncThreshold,
		NodeIsSyncingEnabled:       nodeIsSyncingEnabled,
		EnforceRepeatableRead:      enforceRepeatableRead,
		DeathDeclarationDelay:      commonconfig.MustNewDuration(deathDeclarationDelay),
		FinalizedBlockPollInterval: commonconfig.MustNewDuration(finalizedBlockPollInterval),
		NewHeadsPollInterval:       commonconfig.MustNewDuration(newHeadsPollInterval),
	}
	nodePoolCfg := &evmconfig.NodePoolConfig{C: nodePool}
	chainConfig := &evmconfig.EVMConfig{
		C: &toml.EVMConfig{
			Chain: toml.Chain{
				ChainType:                    chaintype.NewConfig(chainType),
				FinalityDepth:                finalityDepth,
				FinalityTagEnabled:           finalityTagEnabled,
				NoNewHeadsThreshold:          commonconfig.MustNewDuration(noNewHeadsThreshold),
				FinalizedBlockOffset:         finalizedBlockOffset,
				NoNewFinalizedHeadsThreshold: commonconfig.MustNewDuration(noNewFinalizedHeadsThreshold),
			},
		},
	}
	return chainConfig, nodePoolCfg, nodes, nil
}

func parseNodeConfigs(nodeCfgs []NodeConfig) ([]*toml.Node, error) {
	nodes := make([]*toml.Node, len(nodeCfgs))
	for i, nodeCfg := range nodeCfgs {
		var wsURL, httpURL *commonconfig.URL
		// wsUrl requirement will be checked in EVMConfig validation
		if nodeCfg.WSURL != nil {
			wsURL = commonconfig.MustParseURL(*nodeCfg.WSURL)
		}

		if nodeCfg.HTTPURL == nil {
			return nil, fmt.Errorf("node config [%d]: missing HTTP URL", i)
		}

		httpURL = commonconfig.MustParseURL(*nodeCfg.HTTPURL)
		node := &toml.Node{
			Name:     nodeCfg.Name,
			WSURL:    wsURL,
			HTTPURL:  httpURL,
			SendOnly: nodeCfg.SendOnly,
			Order:    nodeCfg.Order,
		}
		nodes[i] = node
	}

	if err := validateNodeConfigs(nodes); err != nil {
		return nil, err
	}

	return nodes, nil
}

func validateNodeConfigs(nodes []*toml.Node) (err error) {
	names := commonconfig.UniqueStrings{}
	wsURLs := commonconfig.UniqueStrings{}
	httpURLs := commonconfig.UniqueStrings{}
	for i, node := range nodes {
		if nodeErr := node.ValidateConfig(); nodeErr != nil {
			err = multierr.Append(err, nodeErr)
		}
		if names.IsDupe(node.Name) {
			err = multierr.Append(err, commonconfig.NewErrDuplicate(fmt.Sprintf("Nodes.%d.Name", i), *node.Name))
		}
		u := (*url.URL)(node.WSURL)
		if wsURLs.IsDupeFmt(u) {
			err = multierr.Append(err, commonconfig.NewErrDuplicate(fmt.Sprintf("Nodes.%d.WSURL", i), u.String()))
		}
		u = (*url.URL)(node.HTTPURL)
		if httpURLs.IsDupeFmt(u) {
			err = multierr.Append(err, commonconfig.NewErrDuplicate(fmt.Sprintf("Nodes.%d.HTTPURL", i), u.String()))
		}
	}

	return err
}
