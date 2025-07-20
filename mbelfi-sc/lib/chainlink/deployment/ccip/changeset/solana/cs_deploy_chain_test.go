package solana_test

import (
	"os"
	"testing"
	"time"

	"github.com/gagliardetto/solana-go"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zapcore"

	solBinary "github.com/gagliardetto/binary"

	cldf "github.com/smartcontractkit/chainlink-deployments-framework/deployment"

	"github.com/smartcontractkit/chainlink/deployment/ccip/shared"
	"github.com/smartcontractkit/chainlink/deployment/ccip/shared/stateview"
	"github.com/smartcontractkit/chainlink/deployment/common/proposalutils"
	"github.com/smartcontractkit/chainlink/deployment/common/types"

	"github.com/smartcontractkit/chainlink/deployment"
	ccipChangesetSolana "github.com/smartcontractkit/chainlink/deployment/ccip/changeset/solana"
	"github.com/smartcontractkit/chainlink/deployment/ccip/changeset/testhelpers"
	"github.com/smartcontractkit/chainlink/deployment/ccip/changeset/v1_6"
	"github.com/smartcontractkit/chainlink/deployment/environment/memory"
	"github.com/smartcontractkit/chainlink/v2/core/logger"

	"github.com/smartcontractkit/chainlink/deployment/ccip/changeset/globals"
	commonchangeset "github.com/smartcontractkit/chainlink/deployment/common/changeset"
	csState "github.com/smartcontractkit/chainlink/deployment/common/changeset/state"
)

// For remote fetching, we need to use the short sha
const (
	OldSha = "0ee732e80586c2e9df5e9b0c3b5e9a19ee66b3a1"
	NewSha = "cb02e90f9d6d1dd65f534c60a77bb1e3384a42cb"
)

func verifyProgramSizes(t *testing.T, e cldf.Environment) {
	state, err := stateview.LoadOnchainStateSolana(e)
	require.NoError(t, err)
	addresses, err := e.ExistingAddresses.AddressesForChain(e.AllChainSelectorsSolana()[0])
	require.NoError(t, err)
	chainState, err := csState.MaybeLoadMCMSWithTimelockChainStateSolana(e.SolChains[e.AllChainSelectorsSolana()[0]], addresses)
	require.NoError(t, err)
	programsToState := map[string]solana.PublicKey{
		deployment.RouterProgramName:               state.SolChains[e.AllChainSelectorsSolana()[0]].Router,
		deployment.OffRampProgramName:              state.SolChains[e.AllChainSelectorsSolana()[0]].OffRamp,
		deployment.FeeQuoterProgramName:            state.SolChains[e.AllChainSelectorsSolana()[0]].FeeQuoter,
		deployment.BurnMintTokenPoolProgramName:    state.SolChains[e.AllChainSelectorsSolana()[0]].BurnMintTokenPools[shared.CLLMetadata],
		deployment.LockReleaseTokenPoolProgramName: state.SolChains[e.AllChainSelectorsSolana()[0]].LockReleaseTokenPools[shared.CLLMetadata],
		deployment.AccessControllerProgramName:     chainState.AccessControllerProgram,
		deployment.TimelockProgramName:             chainState.TimelockProgram,
		deployment.McmProgramName:                  chainState.McmProgram,
		deployment.RMNRemoteProgramName:            state.SolChains[e.AllChainSelectorsSolana()[0]].RMNRemote,
	}
	for program, sizeBytes := range deployment.SolanaProgramBytes {
		t.Logf("Verifying program %s size is at least %d bytes", program, sizeBytes)
		programDataAccount, _, _ := solana.FindProgramAddress([][]byte{programsToState[program].Bytes()}, solana.BPFLoaderUpgradeableProgramID)
		programDataSize, err := ccipChangesetSolana.GetSolProgramSize(&e, e.SolChains[e.AllChainSelectorsSolana()[0]], programDataAccount)
		require.NoError(t, err)
		require.GreaterOrEqual(t, programDataSize, sizeBytes)
	}
}

func initialDeployCS(t *testing.T, e cldf.Environment, buildConfig *ccipChangesetSolana.BuildSolanaConfig) []commonchangeset.ConfiguredChangeSet {
	evmSelectors := e.AllChainSelectors()
	homeChainSel := evmSelectors[0]
	solChainSelectors := e.AllChainSelectorsSolana()
	nodes, err := deployment.NodeInfo(e.NodeIDs, e.Offchain)
	require.NoError(t, err)
	feeAggregatorPrivKey, _ := solana.NewRandomPrivateKey()
	feeAggregatorPubKey := feeAggregatorPrivKey.PublicKey()
	mcmsConfig := proposalutils.SingleGroupTimelockConfigV2(t)
	solLinkTokenPrivKey, _ := solana.NewRandomPrivateKey()
	return []commonchangeset.ConfiguredChangeSet{
		commonchangeset.Configure(
			cldf.CreateLegacyChangeSet(v1_6.DeployHomeChainChangeset),
			v1_6.DeployHomeChainConfig{
				HomeChainSel:     homeChainSel,
				RMNStaticConfig:  testhelpers.NewTestRMNStaticConfig(),
				RMNDynamicConfig: testhelpers.NewTestRMNDynamicConfig(),
				NodeOperators:    testhelpers.NewTestNodeOperator(e.Chains[homeChainSel].DeployerKey.From),
				NodeP2PIDsPerNodeOpAdmin: map[string][][32]byte{
					testhelpers.TestNodeOperator: nodes.NonBootstraps().PeerIDs(),
				},
			},
		),
		commonchangeset.Configure(
			cldf.CreateLegacyChangeSet(commonchangeset.DeploySolanaLinkToken),
			commonchangeset.DeploySolanaLinkTokenConfig{
				ChainSelector: solChainSelectors[0],
				TokenPrivKey:  solLinkTokenPrivKey,
				TokenDecimals: 9,
			},
		),
		commonchangeset.Configure(
			cldf.CreateLegacyChangeSet(ccipChangesetSolana.DeployChainContractsChangeset),
			ccipChangesetSolana.DeployChainContractsConfig{
				HomeChainSelector: homeChainSel,
				ChainSelector:     solChainSelectors[0],
				ContractParamsPerChain: ccipChangesetSolana.ChainContractParams{
					FeeQuoterParams: ccipChangesetSolana.FeeQuoterParams{
						DefaultMaxFeeJuelsPerMsg: solBinary.Uint128{Lo: 300000000, Hi: 0, Endianness: nil},
					},
					OffRampParams: ccipChangesetSolana.OffRampParams{
						EnableExecutionAfter: int64(globals.PermissionLessExecutionThreshold.Seconds()),
					},
				},
				MCMSWithTimelockConfig: &mcmsConfig,
				BuildConfig:            buildConfig,
			},
		),
		commonchangeset.Configure(
			cldf.CreateLegacyChangeSet(ccipChangesetSolana.DeployReceiverForTest),
			ccipChangesetSolana.DeployForTestConfig{
				ChainSelector: solChainSelectors[0],
			},
		),
		commonchangeset.Configure(
			cldf.CreateLegacyChangeSet(ccipChangesetSolana.SetFeeAggregator),
			ccipChangesetSolana.SetFeeAggregatorConfig{
				ChainSelector: solChainSelectors[0],
				FeeAggregator: feeAggregatorPubKey.String(),
			},
		),
	}
}

// use this for a quick deploy test
func TestDeployChainContractsChangesetPreload(t *testing.T) {
	t.Parallel()
	lggr := logger.TestLogger(t)
	e := memory.NewMemoryEnvironment(t, lggr, zapcore.InfoLevel, memory.MemoryEnvironmentConfig{
		Bootstraps: 1,
		Chains:     1,
		SolChains:  1,
		Nodes:      4,
	})
	solChainSelectors := e.AllChainSelectorsSolana()
	err := testhelpers.SavePreloadedSolAddresses(e, solChainSelectors[0])
	require.NoError(t, err)
	// empty build config means, if artifacts are not present, resolve the artifact from github based on go.mod version
	// for a simple local in memory test, they will always be present, because we need them to spin up the in memory chain
	e, _, err = commonchangeset.ApplyChangesetsV2(t, e, initialDeployCS(t, e, nil))
	require.NoError(t, err)
	testhelpers.ValidateSolanaState(t, e, solChainSelectors)
}

func skipInCI(t *testing.T) {
	ci := os.Getenv("CI") == "true"
	if ci {
		t.Skip("Skipping in CI")
	}
}

// Upgrade flows must do the following:
// 1. Build the original contracts. We cannot preload because the deployed buffers will be too small to handle an upgrade.
// We must do a deploy with .so and keypairs locally
// 2. Build the upgraded contracts. We need the declare ids to match the existing deployed programs,
// so we need to do a local build again. We cannot do a remote fetch because those artifacts will not have the same keys as step 1.
// Doing this in CI is expensive, so we skip it for now.
func TestUpgrade(t *testing.T) {
	skipInCI(t)
	t.Parallel()
	lggr := logger.TestLogger(t)
	e := memory.NewMemoryEnvironment(t, lggr, zapcore.InfoLevel, memory.MemoryEnvironmentConfig{
		Bootstraps: 1,
		Chains:     1,
		SolChains:  1,
		Nodes:      4,
	})
	evmSelectors := e.AllChainSelectors()
	homeChainSel := evmSelectors[0]
	solChainSelectors := e.AllChainSelectorsSolana()
	e, _, err := commonchangeset.ApplyChangesetsV2(t, e, initialDeployCS(t, e,
		&ccipChangesetSolana.BuildSolanaConfig{
			GitCommitSha:   OldSha,
			DestinationDir: e.SolChains[solChainSelectors[0]].ProgramsPath,
			LocalBuild: ccipChangesetSolana.LocalBuildConfig{
				BuildLocally:        true,
				CleanDestinationDir: true,
				GenerateVanityKeys:  true,
			},
		},
	))
	require.NoError(t, err)
	testhelpers.ValidateSolanaState(t, e, solChainSelectors)

	feeAggregatorPrivKey2, _ := solana.NewRandomPrivateKey()
	feeAggregatorPubKey2 := feeAggregatorPrivKey2.PublicKey()

	contractParamsPerChain := ccipChangesetSolana.ChainContractParams{
		FeeQuoterParams: ccipChangesetSolana.FeeQuoterParams{
			DefaultMaxFeeJuelsPerMsg: solBinary.Uint128{Lo: 300000000, Hi: 0, Endianness: nil},
		},
		OffRampParams: ccipChangesetSolana.OffRampParams{
			EnableExecutionAfter: int64(globals.PermissionLessExecutionThreshold.Seconds()),
		},
	}

	timelockSignerPDA, _ := testhelpers.TransferOwnershipSolana(t, &e, solChainSelectors[0], true,
		ccipChangesetSolana.CCIPContractsToTransfer{
			Router:    true,
			FeeQuoter: true,
			OffRamp:   true,
		})
	upgradeAuthority := timelockSignerPDA
	// upgradeAuthority := e.SolChains[solChainSelectors[0]].DeployerKey.PublicKey()
	state, err := stateview.LoadOnchainStateSolana(e)
	require.NoError(t, err)
	verifyProgramSizes(t, e)
	addresses, err := e.ExistingAddresses.AddressesForChain(e.AllChainSelectorsSolana()[0])
	require.NoError(t, err)
	chainState, err := csState.MaybeLoadMCMSWithTimelockChainStateSolana(e.SolChains[e.AllChainSelectorsSolana()[0]], addresses)
	require.NoError(t, err)

	// deploy the contracts
	e, _, err = commonchangeset.ApplyChangesetsV2(t, e, []commonchangeset.ConfiguredChangeSet{
		// upgrade authority
		commonchangeset.Configure(
			cldf.CreateLegacyChangeSet(ccipChangesetSolana.SetUpgradeAuthorityChangeset),
			ccipChangesetSolana.SetUpgradeAuthorityConfig{
				ChainSelector:         solChainSelectors[0],
				NewUpgradeAuthority:   upgradeAuthority,
				SetAfterInitialDeploy: true,
				SetOffRamp:            true,
				SetMCMSPrograms:       true,
			},
		),
		// build the upgraded contracts and deploy/replace them onchain
		commonchangeset.Configure(
			cldf.CreateLegacyChangeSet(ccipChangesetSolana.DeployChainContractsChangeset),
			ccipChangesetSolana.DeployChainContractsConfig{
				HomeChainSelector:      homeChainSel,
				ChainSelector:          solChainSelectors[0],
				ContractParamsPerChain: contractParamsPerChain,
				UpgradeConfig: ccipChangesetSolana.UpgradeConfig{
					NewFeeQuoterVersion: &deployment.Version1_1_0,
					NewRouterVersion:    &deployment.Version1_1_0,
					// test offramp upgrade in place
					NewOffRampVersion:              &deployment.Version1_0_0,
					NewMCMVersion:                  &deployment.Version1_1_0,
					NewBurnMintTokenPoolVersion:    &deployment.Version1_1_0,
					NewLockReleaseTokenPoolVersion: &deployment.Version1_1_0,
					NewRMNRemoteVersion:            &deployment.Version1_1_0,
					NewAccessControllerVersion:     &deployment.Version1_1_0,
					NewTimelockVersion:             &deployment.Version1_1_0,
					UpgradeAuthority:               upgradeAuthority,
					SpillAddress:                   upgradeAuthority,
					MCMS: &proposalutils.TimelockConfig{
						MinDelay: 1 * time.Second,
					},
				},
				// build the contracts for upgrades
				BuildConfig: &ccipChangesetSolana.BuildSolanaConfig{
					GitCommitSha:   NewSha,
					DestinationDir: e.SolChains[solChainSelectors[0]].ProgramsPath,
					LocalBuild: ccipChangesetSolana.LocalBuildConfig{
						BuildLocally:        true,
						CleanDestinationDir: true,
						CleanGitDir:         true,
						UpgradeKeys: map[cldf.ContractType]string{
							shared.Router:                  state.SolChains[solChainSelectors[0]].Router.String(),
							shared.FeeQuoter:               state.SolChains[solChainSelectors[0]].FeeQuoter.String(),
							shared.BurnMintTokenPool:       state.SolChains[solChainSelectors[0]].BurnMintTokenPools[shared.CLLMetadata].String(),
							shared.LockReleaseTokenPool:    state.SolChains[solChainSelectors[0]].LockReleaseTokenPools[shared.CLLMetadata].String(),
							shared.OffRamp:                 state.SolChains[solChainSelectors[0]].OffRamp.String(),
							types.AccessControllerProgram:  chainState.AccessControllerProgram.String(),
							types.RBACTimelockProgram:      chainState.TimelockProgram.String(),
							types.ManyChainMultisigProgram: chainState.McmProgram.String(),
							shared.RMNRemote:               state.SolChains[solChainSelectors[0]].RMNRemote.String(),
						},
					},
				},
			},
		),
		commonchangeset.Configure(
			cldf.CreateLegacyChangeSet(ccipChangesetSolana.SetFeeAggregator),
			ccipChangesetSolana.SetFeeAggregatorConfig{
				ChainSelector: solChainSelectors[0],
				FeeAggregator: feeAggregatorPubKey2.String(),
				MCMS: &proposalutils.TimelockConfig{
					MinDelay: 1 * time.Second,
				},
			},
		),
	})
	require.NoError(t, err)
	testhelpers.ValidateSolanaState(t, e, solChainSelectors)
	state, err = stateview.LoadOnchainStateSolana(e)
	require.NoError(t, err)
	oldOffRampAddress := state.SolChains[solChainSelectors[0]].OffRamp
	// add a second offramp address
	e, _, err = commonchangeset.ApplyChangesetsV2(t, e, []commonchangeset.ConfiguredChangeSet{
		commonchangeset.Configure(
			cldf.CreateLegacyChangeSet(ccipChangesetSolana.DeployChainContractsChangeset),
			ccipChangesetSolana.DeployChainContractsConfig{
				HomeChainSelector:      homeChainSel,
				ChainSelector:          solChainSelectors[0],
				ContractParamsPerChain: contractParamsPerChain,
				UpgradeConfig: ccipChangesetSolana.UpgradeConfig{
					NewOffRampVersion: &deployment.Version1_1_0,
					UpgradeAuthority:  upgradeAuthority,
					SpillAddress:      upgradeAuthority,
					MCMS: &proposalutils.TimelockConfig{
						MinDelay: 1 * time.Second,
					},
				},
				BuildConfig: &ccipChangesetSolana.BuildSolanaConfig{
					GitCommitSha:   NewSha,
					DestinationDir: e.SolChains[solChainSelectors[0]].ProgramsPath,
					LocalBuild: ccipChangesetSolana.LocalBuildConfig{
						BuildLocally: true,
					},
				},
			},
		),
	})
	require.NoError(t, err)
	// verify the offramp address is different
	state, err = stateview.LoadOnchainStateSolana(e)
	require.NoError(t, err)
	newOffRampAddress := state.SolChains[solChainSelectors[0]].OffRamp
	require.NotEqual(t, oldOffRampAddress, newOffRampAddress)

	// Verify router and fee quoter upgraded in place
	// and offramp had 2nd address added
	addresses, err = e.ExistingAddresses.AddressesForChain(solChainSelectors[0])
	require.NoError(t, err)
	numRouters := 0
	numFeeQuoters := 0
	numOffRamps := 0
	for _, address := range addresses {
		if address.Type == shared.Router {
			numRouters++
		}
		if address.Type == shared.FeeQuoter {
			numFeeQuoters++
		}
		if address.Type == shared.OffRamp {
			numOffRamps++
		}
	}
	require.Equal(t, 1, numRouters)
	require.Equal(t, 1, numFeeQuoters)
	require.Equal(t, 2, numOffRamps)
	require.NoError(t, err)
	// solana verification
	testhelpers.ValidateSolanaState(t, e, solChainSelectors)
}

func TestIDL(t *testing.T) {
	skipInCI(t)
	tenv, _ := testhelpers.NewMemoryEnvironment(t, testhelpers.WithSolChains(1))
	solChain := tenv.Env.AllChainSelectorsSolana()[0]
	e, _, err := commonchangeset.ApplyChangesetsV2(t, tenv.Env, []commonchangeset.ConfiguredChangeSet{
		commonchangeset.Configure(
			cldf.CreateLegacyChangeSet(ccipChangesetSolana.UploadIDL),
			ccipChangesetSolana.IDLConfig{
				ChainSelector:        solChain,
				GitCommitSha:         "",
				Router:               true,
				FeeQuoter:            true,
				OffRamp:              true,
				RMNRemote:            true,
				BurnMintTokenPool:    true,
				LockReleaseTokenPool: true,
				AccessController:     true,
				Timelock:             true,
				MCM:                  true,
			},
		),
	})
	require.NoError(t, err)

	// deploy timelock
	_, _ = testhelpers.TransferOwnershipSolana(t, &e, solChain, true,
		ccipChangesetSolana.CCIPContractsToTransfer{
			Router:    true,
			FeeQuoter: true,
		})

	e, _, err = commonchangeset.ApplyChangesetsV2(t, e, []commonchangeset.ConfiguredChangeSet{
		commonchangeset.Configure(
			cldf.CreateLegacyChangeSet(ccipChangesetSolana.SetAuthorityIDL),
			ccipChangesetSolana.IDLConfig{
				ChainSelector: solChain,
				Router:        true,
				FeeQuoter:     true,
			},
		),
		commonchangeset.Configure(
			cldf.CreateLegacyChangeSet(ccipChangesetSolana.UpgradeIDL),
			ccipChangesetSolana.IDLConfig{
				ChainSelector: solChain,
				GitCommitSha:  "",
				Router:        true,
				FeeQuoter:     true,
				MCMS: &proposalutils.TimelockConfig{
					MinDelay: 1 * time.Second,
				},
			},
		),
	})
	require.NoError(t, err)

	e, _, err = commonchangeset.ApplyChangesetsV2(t, e, []commonchangeset.ConfiguredChangeSet{
		commonchangeset.Configure(
			cldf.CreateLegacyChangeSet(ccipChangesetSolana.UpgradeIDL),
			ccipChangesetSolana.IDLConfig{
				ChainSelector:        solChain,
				GitCommitSha:         "",
				OffRamp:              true,
				RMNRemote:            true,
				BurnMintTokenPool:    true,
				LockReleaseTokenPool: true,
				AccessController:     true,
				Timelock:             true,
				MCM:                  true,
			},
		),
	})
	require.NoError(t, err)
}
