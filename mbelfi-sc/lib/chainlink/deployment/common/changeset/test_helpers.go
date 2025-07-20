package changeset

import (
	"fmt"
	"math/big"
	"testing"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gagliardetto/solana-go"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zapcore"

	mcmsTypes "github.com/smartcontractkit/mcms/types"

	"github.com/smartcontractkit/chainlink-common/pkg/logger"

	"github.com/smartcontractkit/chainlink-deployments-framework/datastore"

	cldf "github.com/smartcontractkit/chainlink-deployments-framework/deployment"

	"github.com/smartcontractkit/chainlink/deployment"

	commonState "github.com/smartcontractkit/chainlink/deployment/common/changeset/state"
	"github.com/smartcontractkit/chainlink/deployment/common/proposalutils"
	commontypes "github.com/smartcontractkit/chainlink/deployment/common/types"
	"github.com/smartcontractkit/chainlink/deployment/environment/memory"
)

type ConfiguredChangeSet interface {
	Apply(e cldf.Environment) (cldf.ChangesetOutput, error)
}

func Configure[C any](
	changeset cldf.ChangeSetV2[C],
	config C,
) ConfiguredChangeSet {
	return configuredChangeSetImpl[C]{
		changeset: changeset,
		config:    config,
	}
}

type configuredChangeSetImpl[C any] struct {
	changeset cldf.ChangeSetV2[C]
	config    C
}

func (ca configuredChangeSetImpl[C]) Apply(e cldf.Environment) (cldf.ChangesetOutput, error) {
	err := ca.changeset.VerifyPreconditions(e, ca.config)
	if err != nil {
		return cldf.ChangesetOutput{}, err
	}
	return ca.changeset.Apply(e, ca.config)
}

// Apply applies the changeset applications to the environment and returns the updated environment. This is the
// variadic function equivalent of ApplyChangesets, but allowing you to simply pass in one or more changesets as
// parameters at the end of the function. e.g. `changeset.Apply(t, e, nil, configuredCS1, configuredCS2)` etc.
func Apply(t *testing.T, e cldf.Environment, timelockContractsPerChain map[uint64]*proposalutils.TimelockExecutionContracts, first ConfiguredChangeSet, rest ...ConfiguredChangeSet) (cldf.Environment, error) {
	return ApplyChangesets(t, e, timelockContractsPerChain, append([]ConfiguredChangeSet{first}, rest...))
}

// ApplyChangesets applies the changeset applications to the environment and returns the updated environment.
func ApplyChangesets(t *testing.T, e cldf.Environment, timelockContractsPerChain map[uint64]*proposalutils.TimelockExecutionContracts, changesetApplications []ConfiguredChangeSet) (cldf.Environment, error) {
	currentEnv := e
	for i, csa := range changesetApplications {
		out, err := csa.Apply(currentEnv)
		if err != nil {
			return e, fmt.Errorf("failed to apply changeset at index %d: %w", i, err)
		}
		var addresses cldf.AddressBook
		if out.AddressBook != nil {
			addresses = out.AddressBook
			err := addresses.Merge(currentEnv.ExistingAddresses)
			if err != nil {
				return e, fmt.Errorf("failed to merge address book: %w", err)
			}
		} else {
			addresses = currentEnv.ExistingAddresses
		}

		// Collect expected DataStore state after changeset is applied
		var ds datastore.DataStore[datastore.DefaultMetadata, datastore.DefaultMetadata]
		if out.DataStore != nil {
			ds1 := datastore.NewMemoryDataStore[
				datastore.DefaultMetadata,
				datastore.DefaultMetadata,
			]()
			// New Addresses
			err := ds1.Merge(out.DataStore.Seal())
			if err != nil {
				return e, fmt.Errorf("failed to merge new addresses into datastore: %w", err)
			}
			// Existing Addresses
			err = ds1.Merge(currentEnv.DataStore)
			if err != nil {
				return e, fmt.Errorf("failed to merge current addresses into datastore: %w", err)
			}
			ds = ds1.Seal()
		} else {
			ds = currentEnv.DataStore
		}

		if out.Jobs != nil {
			// do nothing, as these jobs auto-accept.
		}
		if out.Proposals != nil {
			for _, prop := range out.Proposals {
				chains := mapset.NewSet[uint64]()
				for _, op := range prop.Transactions {
					chains.Add(uint64(op.ChainIdentifier))
				}

				signed := proposalutils.SignProposal(t, e, &prop)
				for _, sel := range chains.ToSlice() {
					timelockContracts, ok := timelockContractsPerChain[sel]
					if !ok || timelockContracts == nil {
						return cldf.Environment{}, fmt.Errorf("timelock contracts not found for chain %d", sel)
					}

					err := proposalutils.ExecuteProposal(t, e, signed, timelockContracts, sel) //nolint:staticcheck //SA1019 ignoring deprecated function for compatibility; we don't have tools to generate the new field
					if err != nil {
						return e, fmt.Errorf("failed to execute proposal: %w", err)
					}
				}
			}
		}
		if out.MCMSTimelockProposals != nil {
			for _, prop := range out.MCMSTimelockProposals {
				mcmProp := proposalutils.SignMCMSTimelockProposal(t, e, &prop)
				// return the error so devs can ensure expected reversions
				err = proposalutils.ExecuteMCMSProposalV2(t, e, mcmProp)
				if err != nil {
					return cldf.Environment{}, err
				}
				err = proposalutils.ExecuteMCMSTimelockProposalV2(t, e, &prop)
				if err != nil {
					return cldf.Environment{}, err
				}
			}
		}
		if out.MCMSProposals != nil {
			for _, prop := range out.MCMSProposals {
				p := proposalutils.SignMCMSProposal(t, e, &prop)
				// return the error so devs can ensure expected reversions
				err = proposalutils.ExecuteMCMSProposalV2(t, e, p)
				if err != nil {
					return cldf.Environment{}, err
				}
			}
		}
		currentEnv = cldf.Environment{
			Name:              e.Name,
			Logger:            e.Logger,
			ExistingAddresses: addresses,
			DataStore:         ds,
			Chains:            e.Chains,
			SolChains:         e.SolChains,
			AptosChains:       e.AptosChains,
			NodeIDs:           e.NodeIDs,
			Offchain:          e.Offchain,
			OCRSecrets:        e.OCRSecrets,
			GetContext:        e.GetContext,
			OperationsBundle:  e.OperationsBundle,
		}
	}
	return currentEnv, nil
}

// ApplyChangesetsV2 applies the changeset applications to the environment and returns the updated environment.
func ApplyChangesetsV2(t *testing.T, e cldf.Environment, changesetApplications []ConfiguredChangeSet) (cldf.Environment, []cldf.ChangesetOutput, error) {
	currentEnv := e
	outputs := make([]cldf.ChangesetOutput, 0, len(changesetApplications))
	for i, csa := range changesetApplications {
		out, err := csa.Apply(currentEnv)
		if err != nil {
			return e, nil, fmt.Errorf("failed to apply changeset at index %d: %w", i, err)
		}
		outputs = append(outputs, out)
		var addresses cldf.AddressBook
		if out.AddressBook != nil {
			addresses = out.AddressBook
			err := addresses.Merge(currentEnv.ExistingAddresses)
			if err != nil {
				return e, nil, fmt.Errorf("failed to merge address book: %w", err)
			}
		} else {
			addresses = currentEnv.ExistingAddresses
		}

		// Collect expected DataStore state after changeset is applied
		var ds datastore.DataStore[datastore.DefaultMetadata, datastore.DefaultMetadata]
		if out.DataStore != nil {
			ds1 := datastore.NewMemoryDataStore[
				datastore.DefaultMetadata,
				datastore.DefaultMetadata,
			]()
			// New Addresses
			err := ds1.Merge(out.DataStore.Seal())
			if err != nil {
				return e, nil, fmt.Errorf("failed to merge new addresses into datastore: %w", err)
			}
			// Existing Addresses
			err = ds1.Merge(currentEnv.DataStore)
			if err != nil {
				return e, nil, fmt.Errorf("failed to merge current addresses into datastore: %w", err)
			}
			ds = ds1.Seal()
		} else {
			ds = currentEnv.DataStore
		}

		if out.Jobs != nil { //nolint:revive,staticcheck // we want the empty block as documentation
			// do nothing, as these jobs auto-accept.
		}

		// Updated environment may be required before executing proposals when proposals involve new addresses
		// Ex. changesets[0] deploys MCMS, changesets[1] generates a proposal with the new MCMS addresses
		currentEnv = cldf.Environment{
			Name:              e.Name,
			Logger:            e.Logger,
			ExistingAddresses: addresses,
			DataStore:         ds,
			Chains:            e.Chains,
			SolChains:         e.SolChains,
			AptosChains:       e.AptosChains,
			NodeIDs:           e.NodeIDs,
			Offchain:          e.Offchain,
			OCRSecrets:        e.OCRSecrets,
			GetContext:        e.GetContext,
			OperationsBundle:  e.OperationsBundle,
		}

		if out.MCMSTimelockProposals != nil {
			for _, prop := range out.MCMSTimelockProposals {
				chains := mapset.NewSet[uint64]()
				for _, op := range prop.Operations {
					chains.Add(uint64(op.ChainSelector))
				}

				p := proposalutils.SignMCMSTimelockProposal(t, currentEnv, &prop)
				err = proposalutils.ExecuteMCMSProposalV2(t, currentEnv, p)
				if err != nil {
					return cldf.Environment{}, nil, err
				}
				if prop.Action != mcmsTypes.TimelockActionSchedule {
					// We don't need to execute the proposal if it's not a schedule action
					// because the proposal is already executed in the previous step.
					return currentEnv, outputs, nil
				}
				err = proposalutils.ExecuteMCMSTimelockProposalV2(t, currentEnv, &prop)
				if err != nil {
					return cldf.Environment{}, nil, err
				}
			}
		}
		if out.MCMSProposals != nil {
			for _, prop := range out.MCMSProposals {
				chains := mapset.NewSet[uint64]()
				for _, op := range prop.Operations {
					chains.Add(uint64(op.ChainSelector))
				}

				p := proposalutils.SignMCMSProposal(t, currentEnv, &prop)
				err = proposalutils.ExecuteMCMSProposalV2(t, currentEnv, p)
				if err != nil {
					return cldf.Environment{}, nil, err
				}
			}
		}
	}
	return currentEnv, outputs, nil
}

func DeployLinkTokenTest(t *testing.T, memoryConfig memory.MemoryEnvironmentConfig) {
	lggr := logger.Test(t)
	e := memory.NewMemoryEnvironment(t, lggr, zapcore.InfoLevel, memoryConfig)
	chain1 := e.AllChainSelectors()[0]
	config := []uint64{chain1}
	e, err := ApplyChangesets(t, e, nil, []ConfiguredChangeSet{
		Configure(
			cldf.CreateLegacyChangeSet(DeployLinkToken),
			config,
		),
	})
	require.NoError(t, err)
	addrs, err := e.ExistingAddresses.AddressesForChain(chain1)
	require.NoError(t, err)
	state, err := commonState.MaybeLoadLinkTokenChainState(e.Chains[chain1], addrs)
	require.NoError(t, err)
	// View itself already unit tested
	_, err = state.GenerateLinkView()
	require.NoError(t, err)

	// solana test
	if memoryConfig.SolChains > 0 {
		solLinkTokenPrivKey, _ := solana.NewRandomPrivateKey()
		e, err = Apply(t, e, nil,
			Configure(cldf.CreateLegacyChangeSet(DeploySolanaLinkToken), DeploySolanaLinkTokenConfig{
				ChainSelector: e.AllChainSelectorsSolana()[0],
				TokenPrivKey:  solLinkTokenPrivKey,
				TokenDecimals: 9,
			}),
		)
		require.NoError(t, err)
		addrs, err = e.ExistingAddresses.AddressesForChain(e.AllChainSelectorsSolana()[0])
		require.NoError(t, err)
		require.NotEmpty(t, addrs)
	}
}

func SetPreloadedSolanaAddresses(t *testing.T, env cldf.Environment, selector uint64) {
	typeAndVersion := cldf.NewTypeAndVersion(commontypes.ManyChainMultisigProgram, deployment.Version1_0_0)
	err := env.ExistingAddresses.Save(selector, memory.SolanaProgramIDs["mcm"], typeAndVersion)
	require.NoError(t, err)

	typeAndVersion = cldf.NewTypeAndVersion(commontypes.AccessControllerProgram, deployment.Version1_0_0)
	err = env.ExistingAddresses.Save(selector, memory.SolanaProgramIDs["access_controller"], typeAndVersion)
	require.NoError(t, err)

	typeAndVersion = cldf.NewTypeAndVersion(commontypes.RBACTimelockProgram, deployment.Version1_0_0)
	err = env.ExistingAddresses.Save(selector, memory.SolanaProgramIDs["timelock"], typeAndVersion)
	require.NoError(t, err)
}

func MustFundAddressWithLink(t *testing.T, e cldf.Environment, chain cldf.Chain, to common.Address, amount int64) {
	addresses, err := e.ExistingAddresses.AddressesForChain(chain.Selector)
	require.NoError(t, err)

	linkState, err := commonState.MaybeLoadLinkTokenChainState(chain, addresses)
	require.NoError(t, err)
	require.NotNil(t, linkState.LinkToken)

	// grant minter permissions - only owner can call this function
	e.Logger.Info("granting minter permissions for chain", chain.DeployerKey)
	tx, err := linkState.LinkToken.GrantMintRole(chain.DeployerKey, chain.DeployerKey.From)
	require.NoError(t, err)
	_, err = cldf.ConfirmIfNoError(chain, tx, err)
	require.NoError(t, err)

	// Mint 'To' address some tokens
	tx, err = linkState.LinkToken.Mint(chain.DeployerKey, to, big.NewInt(amount))
	require.NoError(t, err)
	_, err = cldf.ConfirmIfNoError(chain, tx, err)
	require.NoError(t, err)

	// 'To' address should have the tokens
	ctx := e.GetContext()
	endBalance, err := linkState.LinkToken.BalanceOf(&bind.CallOpts{Context: ctx}, to)
	require.NoError(t, err)
	expectedBalance := big.NewInt(amount)
	require.Equal(t, expectedBalance, endBalance)
}

// MaybeGetLinkBalance returns the LINK balance of the given address on the given chain.
func MaybeGetLinkBalance(t *testing.T, e cldf.Environment, chain cldf.Chain, linkAddr common.Address) *big.Int {
	addresses, err := e.ExistingAddresses.AddressesForChain(chain.Selector)
	require.NoError(t, err)
	linkState, err := commonState.MaybeLoadLinkTokenChainState(chain, addresses)
	require.NoError(t, err)
	endBalance, err := linkState.LinkToken.BalanceOf(&bind.CallOpts{Context: chain.DeployerKey.Context}, linkAddr)
	require.NoError(t, err)
	return endBalance
}
