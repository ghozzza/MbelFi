package logpoller_test

import (
	"context"
	"errors"
	"fmt"
	"math"
	"math/big"
	"math/rand"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient/simulated"
	"github.com/ethereum/go-ethereum/rpc"
	"github.com/leanovate/gopter"
	"github.com/leanovate/gopter/gen"
	"github.com/leanovate/gopter/prop"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zapcore"

	"github.com/smartcontractkit/chainlink-common/pkg/logger"
	commontypes "github.com/smartcontractkit/chainlink-common/pkg/types"
	"github.com/smartcontractkit/chainlink-common/pkg/types/query"
	"github.com/smartcontractkit/chainlink-common/pkg/types/query/primitives"
	commonutils "github.com/smartcontractkit/chainlink-common/pkg/utils"

	"github.com/smartcontractkit/chainlink-evm/pkg/client"
	"github.com/smartcontractkit/chainlink-evm/pkg/client/clienttest"
	"github.com/smartcontractkit/chainlink-evm/pkg/config/chaintype"
	"github.com/smartcontractkit/chainlink-evm/pkg/heads/headstest"
	"github.com/smartcontractkit/chainlink-evm/pkg/logpoller"
	"github.com/smartcontractkit/chainlink-evm/pkg/logpoller/internal/log_emitter"
	"github.com/smartcontractkit/chainlink-evm/pkg/testutils"
	evmtypes "github.com/smartcontractkit/chainlink-evm/pkg/types"
	"github.com/smartcontractkit/chainlink-evm/pkg/utils"
	ubig "github.com/smartcontractkit/chainlink-evm/pkg/utils/big"
)

func logRuntime(t testing.TB, start time.Time) {
	t.Log("runtime", time.Since(start))
}

func populateDatabase(t testing.TB, o logpoller.ORM, chainID *big.Int) (common.Hash, common.Address, common.Address) {
	event1 := EmitterABI.Events["Log1"].ID
	address1 := common.HexToAddress("0x2ab9a2Dc53736b361b72d900CdF9F78F9406fbbb")
	address2 := common.HexToAddress("0x6E225058950f237371261C985Db6bDe26df2200E")
	startDate := time.Date(2010, 1, 1, 12, 12, 12, 0, time.UTC)
	ctx := testutils.Context(t)

	for j := 1; j < 100; j++ {
		var logs []logpoller.Log
		// Max we can insert per batch
		for i := 0; i < 1000; i++ {
			addr := address1
			if (i+(1000*j))%2 == 0 {
				addr = address2
			}
			blockNumber := int64(i + (1000 * j))
			blockTimestamp := startDate.Add(time.Duration(j*1000) * time.Hour)

			logs = append(logs, logpoller.Log{
				EVMChainID:     ubig.New(chainID),
				LogIndex:       1,
				BlockHash:      common.HexToHash(fmt.Sprintf("0x%d", i+(1000*j))),
				BlockNumber:    blockNumber,
				BlockTimestamp: blockTimestamp,
				EventSig:       event1,
				Topics:         [][]byte{event1[:], logpoller.EvmWord(uint64(i + 1000*j)).Bytes()},
				Address:        addr,
				TxHash:         utils.RandomHash(),
				Data:           logpoller.EvmWord(uint64(i + 1000*j)).Bytes(),
				CreatedAt:      blockTimestamp,
			})
		}
		require.NoError(t, o.InsertLogs(ctx, logs))
		require.NoError(t, o.InsertBlock(ctx, utils.RandomHash(), int64((j+1)*1000-1), startDate.Add(time.Duration(j*1000)*time.Hour), 0))
	}

	return event1, address1, address2
}

func BenchmarkSelectLogsCreatedAfter(b *testing.B) {
	chainId := big.NewInt(137)
	ctx := testutils.Context(b)
	db := testutils.NewIndependentSqlxDB(b)
	o := logpoller.NewORM(chainId, db, logger.Test(b))
	event, address, _ := populateDatabase(b, o, chainId)

	// Setting searchDate to pick around 5k logs
	searchDate := time.Date(2020, 1, 1, 12, 12, 12, 0, time.UTC)

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		logs, err := o.SelectLogsCreatedAfter(ctx, address, event, searchDate, 500)
		require.NotEmpty(b, logs)
		require.NoError(b, err)
	}
}

func TestPopulateLoadedDB(t *testing.T) {
	t.Skip("Only for local load testing and query analysis")
	db := testutils.NewIndependentSqlxDB(t)
	ctx := testutils.Context(t)
	chainID := big.NewInt(137)

	o := logpoller.NewORM(big.NewInt(137), db, logger.Test(t))
	event1, address1, address2 := populateDatabase(t, o, chainID)

	func() {
		defer logRuntime(t, time.Now())
		_, err1 := o.SelectLogs(ctx, 750000, 800000, address1, event1)
		require.NoError(t, err1)
	}()
	func() {
		defer logRuntime(t, time.Now())
		_, err1 := o.SelectLatestLogEventSigsAddrsWithConfs(ctx, 0, []common.Address{address1}, []common.Hash{event1}, 0)
		require.NoError(t, err1)
	}()

	// Confirm all the logs.
	require.NoError(t, o.InsertBlock(ctx, common.HexToHash("0x10"), 1000000, time.Now(), 0))
	func() {
		defer logRuntime(t, time.Now())
		lgs, err1 := o.SelectLogsDataWordRange(ctx, address1, event1, 0, logpoller.EvmWord(50000), logpoller.EvmWord(50020), 0)
		require.NoError(t, err1)
		// 10 since every other log is for address1
		require.Len(t, lgs, 10)
	}()

	func() {
		defer logRuntime(t, time.Now())
		lgs, err1 := o.SelectIndexedLogs(ctx, address2, event1, 1, []common.Hash{logpoller.EvmWord(50000), logpoller.EvmWord(50020)}, 0)
		require.NoError(t, err1)
		require.Len(t, lgs, 2)
	}()

	func() {
		defer logRuntime(t, time.Now())
		lgs, err1 := o.SelectIndexedLogsTopicRange(ctx, address1, event1, 1, logpoller.EvmWord(50000), logpoller.EvmWord(50020), 0)
		require.NoError(t, err1)
		require.Len(t, lgs, 10)
	}()
}

func TestLogPoller_Integration(t *testing.T) {
	lpOpts := logpoller.Opts{
		FinalityDepth:            2,
		BackfillBatchSize:        3,
		RPCBatchSize:             2,
		KeepFinalizedBlocksDepth: 1000,
		BackupPollerBlockDelay:   100,
	}
	th := SetupTH(t, lpOpts)
	th.Backend.Commit() // Block 2. Ensure we have finality number of blocks
	ctx := testutils.Context(t)

	require.NoError(t, th.LogPoller.RegisterFilter(ctx, logpoller.Filter{Name: "Integration test", EventSigs: []common.Hash{EmitterABI.Events["Log1"].ID}, Addresses: []common.Address{th.EmitterAddress1}}))
	require.Len(t, th.LogPoller.Filter(nil, nil, nil).Addresses, 1)
	require.Len(t, th.LogPoller.Filter(nil, nil, nil).Topics, 1)

	require.Len(t, th.LogPoller.Filter(nil, nil, nil).Addresses, 1)
	require.Len(t, th.LogPoller.Filter(nil, nil, nil).Topics, 1)

	// Emit some logs in blocks 3->7.
	for i := 0; i < 5; i++ {
		_, err1 := th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(int64(i))})
		require.NoError(t, err1)
		_, err1 = th.Emitter1.EmitLog2(th.Owner, []*big.Int{big.NewInt(int64(i))})
		require.NoError(t, err1)
		th.Backend.Commit()
	}
	// Calling Start() after RegisterFilter() simulates a node restart after job creation, should reload Filter from db.
	require.NoError(t, th.LogPoller.Start(testutils.Context(t)))

	// The poller starts on a new chain at latest-finality (5 in this case),
	// Replaying from block 4 should guarantee we have block 4 immediately.  (We will also get
	// block 3 once the backup poller runs, since it always starts 100 blocks behind.)
	require.NoError(t, th.LogPoller.Replay(testutils.Context(t), 4))

	// We should immediately have at least logs 4-7
	logs, err := th.LogPoller.Logs(ctx, 4, 7, EmitterABI.Events["Log1"].ID, th.EmitterAddress1)
	require.NoError(t, err)
	require.Len(t, logs, 4)

	// Once the backup poller runs we should also have the log from block 3
	testutils.RequireEventually(t, func() bool {
		l, err2 := th.LogPoller.Logs(ctx, 3, 3, EmitterABI.Events["Log1"].ID, th.EmitterAddress1)
		require.NoError(t, err2)
		return len(l) == 1
	})

	// Now let's update the Filter and replay to get Log2 logs.
	err = th.LogPoller.RegisterFilter(ctx, logpoller.Filter{
		Name:      "Emitter - log2",
		EventSigs: []common.Hash{EmitterABI.Events["Log2"].ID},
		Addresses: []common.Address{th.EmitterAddress1},
	})
	require.NoError(t, err)
	// Replay an invalid block should error
	assert.Error(t, th.LogPoller.Replay(testutils.Context(t), 0))
	assert.Error(t, th.LogPoller.Replay(testutils.Context(t), 20))

	// Still shouldn't have any Log2 logs yet
	logs, err = th.LogPoller.Logs(ctx, 2, 7, EmitterABI.Events["Log2"].ID, th.EmitterAddress1)
	require.NoError(t, err)
	require.Empty(t, logs)

	// Replay only from block 4, so we should see logs in block 4,5,6,7 (4 logs)
	require.NoError(t, th.LogPoller.Replay(testutils.Context(t), 4))

	// We should immediately see 4 logs2 logs.
	logs, err = th.LogPoller.Logs(ctx, 2, 7, EmitterABI.Events["Log2"].ID, th.EmitterAddress1)
	require.NoError(t, err)
	assert.Len(t, logs, 4)

	assert.NoError(t, th.LogPoller.Close())

	// Cancelling a replay should return an error synchronously.
	ctx, cancel := context.WithCancel(testutils.Context(t))
	cancel()
	assert.ErrorIs(t, th.LogPoller.Replay(ctx, 4), logpoller.ErrReplayRequestAborted)
}

// Simulate an rpc failover event on optimism, where logs are requested from a block hash which doesn't
// exist on the new rpc server, but a successful error code is returned. This is bad/buggy behavior on the
// part of the rpc server, but we should be able to handle this without missing any logs, as
// long as the logs returned for finalized blocks are consistent.
func Test_BackupLogPoller(t *testing.T) {
	tests := []struct {
		name          string
		finalityDepth int64
		finalityTag   bool
	}{
		{
			name:          "fixed finality depth without finality tag",
			finalityDepth: 2,
			finalityTag:   false,
		},
		{
			name:          "chain finality in use",
			finalityDepth: 0,
			finalityTag:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			th := SetupTH(t,
				logpoller.Opts{
					UseFinalityTag:           tt.finalityTag,
					FinalityDepth:            tt.finalityDepth,
					BackfillBatchSize:        3,
					RPCBatchSize:             2,
					KeepFinalizedBlocksDepth: 1000,
					BackupPollerBlockDelay:   100,
				},
			)

			ctx := testutils.Context(t)

			filter1 := logpoller.Filter{
				Name: "filter1",
				EventSigs: []common.Hash{
					EmitterABI.Events["Log1"].ID,
					EmitterABI.Events["Log2"].ID},
				Addresses: []common.Address{th.EmitterAddress1},
			}
			err := th.LogPoller.RegisterFilter(ctx, filter1)
			require.NoError(t, err)

			filters, err := th.ORM.LoadFilters(ctx)
			require.NoError(t, err)
			require.Len(t, filters, 1)
			require.Equal(t, filter1, filters["filter1"])

			err = th.LogPoller.RegisterFilter(ctx,
				logpoller.Filter{
					Name:      "filter2",
					EventSigs: []common.Hash{EmitterABI.Events["Log1"].ID},
					Addresses: []common.Address{th.EmitterAddress2},
				})
			require.NoError(t, err)

			defer func() {
				assert.NoError(t, th.LogPoller.UnregisterFilter(ctx, "filter1"))
			}()
			defer func() {
				assert.NoError(t, th.LogPoller.UnregisterFilter(ctx, "filter2"))
			}()

			for n := 1; n < 31; n++ {
				h := th.Backend.Commit()
				require.Len(t, h, 32)
			}

			// generate some tx's with logs
			tx1, err := th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(1)})
			require.NoError(t, err)
			require.NotNil(t, tx1)

			tx2, err := th.Emitter1.EmitLog2(th.Owner, []*big.Int{big.NewInt(2)})
			require.NoError(t, err)
			require.NotNil(t, tx2)

			tx3, err := th.Emitter2.EmitLog1(th.Owner, []*big.Int{big.NewInt(3)})
			require.NoError(t, err)
			require.NotNil(t, tx3)

			th.Backend.Commit() // commit block 32 with 3 tx's included

			block32, err := th.Client.BlockByNumber(ctx, nil)
			require.NoError(t, err)
			require.Equal(t, uint64(32), block32.Number().Uint64())

			// Ensure that the logs have been included in this rpc server's view of the blockchain
			txs := block32.Body().Transactions
			require.Len(t, txs, 3)
			receipt, err := th.Client.TransactionReceipt(ctx, txs[0].Hash())
			require.NoError(t, err)
			require.NotZero(t, receipt)
			require.Len(t, receipt.Logs, 1)

			// Simulate an optimism rpc server, which is behind and still syncing
			backupRPC := simulated.NewBackend(types.GenesisAlloc{
				th.Owner.From: {
					Balance: big.NewInt(0).Mul(big.NewInt(10), big.NewInt(1e18)),
				},
			}, simulated.WithBlockGasLimit(10e6))

			primaryRPC := th.Backend // save primaryRPC for later

			// Failover to simulated optimism rpc on block 30
			th.Client.RegisterHeadByNumberCallback(func(ctx context.Context, c *client.SimulatedBackendClient, n *big.Int) error {
				if n.Int64() != 32 {
					return nil
				}
				th.SetActiveClient(backupRPC, chaintype.ChainOptimismBedrock)
				return nil
			})

			currentBlockNumber := th.PollAndSaveLogs(ctx, 1)
			require.Equal(t, int64(33), currentBlockNumber)

			// logs shouldn't show up yet
			logs, err := th.LogPoller.Logs(ctx, 32, 32, EmitterABI.Events["Log1"].ID, th.EmitterAddress1)
			require.NoError(t, err)
			require.Empty(t, logs)

			th.finalizeThroughBlock(t, 32)

			b, ok := primaryRPC.(*Backend)
			require.True(t, ok)
			th.SetActiveClient(b, chaintype.ChainOptimismBedrock) // restore primary rpc

			// Run ordinary poller + backup poller at least once
			require.NoError(t, err)
			currentBlockNumber = th.PollAndSaveLogs(ctx, currentBlockNumber)
			require.Equal(t, int64(33), currentBlockNumber)
			require.NoError(t, th.LogPoller.BackupPollAndSaveLogs(ctx))
			latestBlock, err := th.LogPoller.LatestBlock(ctx)
			require.NoError(t, err)
			require.Equal(t, currentBlockNumber-1, latestBlock.BlockNumber) // shouldn't change

			// logs still shouldn't show up, because we don't want to backfill the last finalized log
			//  to help with reorg detection
			logs, err = th.LogPoller.Logs(ctx, 32, 32, EmitterABI.Events["Log1"].ID, th.EmitterAddress1)
			require.NoError(t, err)
			require.Empty(t, logs)
			th.Backend.Commit()
			th.finalizeThroughBlock(t, 64)

			// Run ordinary poller + backup poller at least once more
			th.LogPoller.PollAndSaveLogs(ctx, currentBlockNumber)
			require.NoError(t, th.LogPoller.BackupPollAndSaveLogs(ctx))
			currentBlock, err := th.LogPoller.LatestBlock(ctx)
			require.NoError(t, err)

			require.Equal(t, int64(64), currentBlock.BlockNumber)

			// all 3 logs in block 34 should show up now, thanks to backup logger
			logs, err = th.LogPoller.Logs(ctx, 30, 37, EmitterABI.Events["Log1"].ID, th.EmitterAddress1)
			require.NoError(t, err)
			assert.Len(t, logs, 1)
			logs, err = th.LogPoller.Logs(ctx, 32, 32, EmitterABI.Events["Log2"].ID, th.EmitterAddress1)
			require.NoError(t, err)
			assert.Len(t, logs, 1)
			logs, err = th.LogPoller.Logs(ctx, 32, 36, EmitterABI.Events["Log1"].ID, th.EmitterAddress2)
			require.NoError(t, err)
			assert.Len(t, logs, 1)
		})
	}
}

func TestLogPoller_BackupPollAndSaveLogsWithPollerNotWorking(t *testing.T) {
	emittedLogs := 40
	// Intentionally use very low backupLogPollerDelay to verify if finality is used properly
	ctx := testutils.Context(t)
	lpOpts := logpoller.Opts{
		UseFinalityTag:           true,
		BackfillBatchSize:        3,
		RPCBatchSize:             2,
		KeepFinalizedBlocksDepth: 1000,
		BackupPollerBlockDelay:   1,
	}
	th := SetupTH(t, lpOpts)

	// Emit some logs in blocks
	for i := 0; i < emittedLogs; i++ {
		if i == 30 {
			// Call PollAndSave with no filters are registered.  We call it on block 31, so that
			// it misses the logs for blocks 2 - 31 but marks block 0 as finalized (rather than 32)
			currentBlock := th.PollAndSaveLogs(ctx, 1)
			// currentBlock should be blockChain start + number of emitted logs + 1
			assert.Equal(t, int64(32), currentBlock)
		}

		_, err2 := th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(int64(i))})
		require.NoError(t, err2)
		th.Backend.Commit()
	}

	// LogPoller not working, but chain in the meantime has progressed
	// 0 -> 1 -> 2 -> ... -> 32 (finalized) -> .. -> 42 (currentBlock)

	err := th.LogPoller.RegisterFilter(ctx, logpoller.Filter{
		Name:      "Test Emitter",
		EventSigs: []common.Hash{EmitterABI.Events["Log1"].ID},
		Addresses: []common.Address{th.EmitterAddress1},
	})
	require.NoError(t, err)

	// LogPoller should backfill starting from the last finalized block stored in db (genesis block)
	// till the latest finalized block reported by chain.
	require.NoError(t, th.LogPoller.BackupPollAndSaveLogs(ctx))
	require.NoError(t, err)

	logs, err := th.LogPoller.Logs(
		ctx,
		0,
		42,
		EmitterABI.Events["Log1"].ID,
		th.EmitterAddress1,
	)
	require.NoError(t, err)
	require.Len(t, logs, emittedLogs-10)

	// Finalize the rest of the logs emitted, after which Backup Poller should pick them up
	th.finalizeThroughBlock(t, 42)
	require.NoError(t, th.LogPoller.BackupPollAndSaveLogs(ctx))

	// All emitted logs should be backfilled
	logs, err = th.LogPoller.Logs(
		ctx,
		0,
		43,
		EmitterABI.Events["Log1"].ID,
		th.EmitterAddress1,
	)
	require.NoError(t, err)
	require.Len(t, logs, emittedLogs)
}

func TestLogPoller_BackupPollAndSaveLogsWithDeepBlockDelay(t *testing.T) {
	emittedLogs := 30
	ctx := testutils.Context(t)
	lpOpts := logpoller.Opts{
		UseFinalityTag:           true,
		BackfillBatchSize:        3,
		RPCBatchSize:             2,
		KeepFinalizedBlocksDepth: 1000,
		BackupPollerBlockDelay:   int64(emittedLogs),
	}
	th := SetupTH(t, lpOpts)

	// Emit some logs in blocks
	for i := 0; i < emittedLogs; i++ {
		_, err := th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(int64(i))})
		require.NoError(t, err)
		th.Backend.Commit()
	}
	// Emit one more empty block
	th.Backend.Commit()

	header, err := th.Client.HeaderByNumber(ctx, nil)
	require.NoError(t, err)

	// First PollAndSave, no filters are registered, but finalization is the same as the latest block
	// 1 -> 2 -> ...
	th.PollAndSaveLogs(ctx, 1)

	// Check that latest block has the same properties as the head
	latestBlock, err := th.LogPoller.LatestBlock(ctx)
	require.NoError(t, err)
	assert.Equal(t, latestBlock.BlockNumber, header.Number.Int64())
	assert.Equal(t, latestBlock.FinalizedBlockNumber, header.Number.Int64())
	assert.Equal(t, latestBlock.BlockHash, header.Hash())

	// Register filter
	err = th.LogPoller.RegisterFilter(ctx, logpoller.Filter{
		Name:      "Test Emitter",
		EventSigs: []common.Hash{EmitterABI.Events["Log1"].ID},
		Addresses: []common.Address{th.EmitterAddress1},
	})
	require.NoError(t, err)

	// Should fallback to the backupPollerBlockDelay when finalization was very high in a previous PollAndSave
	require.NoError(t, th.LogPoller.BackupPollAndSaveLogs(ctx))
	require.NoError(t, err)

	// All emitted logs should be backfilled
	logs, err := th.LogPoller.Logs(
		ctx,
		0,
		header.Number.Int64()+1,
		EmitterABI.Events["Log1"].ID,
		th.EmitterAddress1,
	)
	require.NoError(t, err)
	require.Len(t, logs, emittedLogs)
}

func TestLogPoller_BackupPollAndSaveLogsSkippingLogsThatAreTooOld(t *testing.T) {
	logsBatch := 10
	// Intentionally use very low backupLogPollerDelay to verify if finality is used properly
	ctx := testutils.Context(t)
	lpOpts := logpoller.Opts{
		UseFinalityTag:           true,
		BackfillBatchSize:        3,
		RPCBatchSize:             2,
		KeepFinalizedBlocksDepth: 1000,
		BackupPollerBlockDelay:   1,
	}
	th := SetupTH(t, lpOpts)

	// Emit some logs in blocks
	for i := 1; i <= logsBatch; i++ {
		_, err := th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(int64(0x100 + i))})
		require.NoError(t, err)
		th.Backend.Commit()
	}

	// First PollAndSave, no filters are registered, but finalization is the same as the latest block
	// 1 -> 2 -> ... -> firstBatchBlock
	firstBatchBlock := th.PollAndSaveLogs(ctx, 1) - 1

	// Mark all blocks from first batch of emitted logs as finalized
	th.finalizeThroughBlock(t, firstBatchBlock)

	// Emit 2nd batch of block
	for i := 1; i <= logsBatch; i++ {
		_, err := th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(int64(0x200 + i))})
		require.NoError(t, err)
		th.Backend.Commit()
	}

	// 1 -> 2 -> ... -> firstBatchBlock (finalized) -> .. -> firstBatchBlock + logsBatch
	secondBatchBlock := th.PollAndSaveLogs(ctx, firstBatchBlock) - 1

	// Mark all blocks from second batch of emitted logs as finalized
	th.finalizeThroughBlock(t, secondBatchBlock)

	// Register filter
	err := th.LogPoller.RegisterFilter(ctx, logpoller.Filter{
		Name:      "Test Emitter",
		EventSigs: []common.Hash{EmitterABI.Events["Log1"].ID},
		Addresses: []common.Address{th.EmitterAddress1},
	})
	require.NoError(t, err)

	// Should pick logs starting from one block behind the latest finalized block
	require.NoError(t, th.LogPoller.BackupPollAndSaveLogs(ctx))
	require.NoError(t, err)

	// Only the 2nd batch should be backfilled, because we perform backfill starting from one
	// behind the latest finalized block
	logs, err := th.LogPoller.Logs(
		ctx,
		0,
		secondBatchBlock,
		EmitterABI.Events["Log1"].ID,
		th.EmitterAddress1,
	)
	require.NoError(t, err)
	require.Len(t, logs, logsBatch)
	require.Equal(t, hexutil.MustDecode(`0x0000000000000000000000000000000000000000000000000000000000000201`), logs[0].Data) // 0x201 = 1st log from 2nd batch
}

func TestLogPoller_BlockTimestamps(t *testing.T) {
	t.Parallel()
	ctx := testutils.Context(t)
	lpOpts := logpoller.Opts{
		FinalityDepth:            2,
		BackfillBatchSize:        3,
		RPCBatchSize:             2,
		KeepFinalizedBlocksDepth: 1000,
	}
	th := SetupTH(t, lpOpts)

	addresses := []common.Address{th.EmitterAddress1, th.EmitterAddress2}
	events := []common.Hash{EmitterABI.Events["Log1"].ID, EmitterABI.Events["Log2"].ID}

	err := th.LogPoller.RegisterFilter(ctx, logpoller.Filter{Name: "convertLogs", EventSigs: events, Addresses: addresses})
	require.NoError(t, err)

	blk, err := th.Client.BlockByNumber(ctx, nil)
	require.NoError(t, err)
	require.Equal(t, big.NewInt(1), blk.Number())
	start := blk.Time()

	// There is automatically a 1ns delay between each block.  To make sure it's including the correct block timestamps,
	// we introduce irregularities by inserting two additional block delays. We can't control the block times for
	// blocks produced by the log emitter, but we can adjust the time on empty blocks in between.  Simulated time
	// sequence:  [ #1 ] ..(1ns + delay1).. [ #2 ] ..1ns.. [ #3 (LOG1) ] ..(1ns + delay2).. [ #4 ] ..1ns.. [ #5 (LOG2) ]
	const delay1 = 589 * time.Second
	const delay2 = 643 * time.Second
	time1 := start + 1 + uint64(589)
	time2 := time1 + 1 + uint64(643)

	require.NoError(t, th.Backend.AdjustTime(delay1))

	blk, err = th.Client.BlockByNumber(ctx, nil)
	require.NoError(t, err)
	require.Equal(t, big.NewInt(2), blk.Number())
	assert.Equal(t, time1-1, blk.Time())

	_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(1)})
	require.NoError(t, err)
	hash := th.Backend.Commit()

	blk, err = th.Client.BlockByHash(ctx, hash)
	require.NoError(t, err)
	require.Equal(t, big.NewInt(3), blk.Number())
	assert.Equal(t, time1, blk.Time())

	require.NoError(t, th.Backend.AdjustTime(delay2))
	_, err = th.Emitter2.EmitLog2(th.Owner, []*big.Int{big.NewInt(2)})
	require.NoError(t, err)
	th.Client.Commit()

	blk, err = th.Client.BlockByNumber(ctx, nil)
	require.NoError(t, err)
	require.Equal(t, big.NewInt(5), blk.Number())
	assert.Equal(t, time2, blk.Time())

	query := ethereum.FilterQuery{
		FromBlock: big.NewInt(2),
		ToBlock:   big.NewInt(5),
		Topics:    [][]common.Hash{events},
		Addresses: []common.Address{th.EmitterAddress1, th.EmitterAddress2}}

	gethLogs, err := th.Client.FilterLogs(ctx, query)
	require.NoError(t, err)
	require.Len(t, gethLogs, 2)

	lb, _ := th.LogPoller.LatestBlock(ctx)
	th.PollAndSaveLogs(ctx, lb.BlockNumber+1)
	lg1, err := th.LogPoller.Logs(ctx, 0, 20, EmitterABI.Events["Log1"].ID, th.EmitterAddress1)
	require.NoError(t, err)
	lg2, err := th.LogPoller.Logs(ctx, 0, 20, EmitterABI.Events["Log2"].ID, th.EmitterAddress2)
	require.NoError(t, err)

	// Logs should have correct timestamps
	require.NotEmpty(t, lg1)
	b, _ := th.Client.BlockByHash(ctx, lg1[0].BlockHash)
	t.Log(len(lg1), lg1[0].BlockTimestamp.String())
	assert.Equal(t, int64(b.Time()), lg1[0].BlockTimestamp.UTC().Unix(), time1)
	b2, _ := th.Client.BlockByHash(ctx, lg2[0].BlockHash)
	assert.Equal(t, int64(b2.Time()), lg2[0].BlockTimestamp.UTC().Unix(), time2)
}

func TestLogPoller_SynchronizedWithGeth(t *testing.T) {
	t.Parallel()
	// The log poller's blocks table should remain synchronized
	// with the canonical chain of geth's despite arbitrary mixes of mining and reorgs.
	testParams := gopter.DefaultTestParameters()
	testParams.MinSuccessfulTests = 100
	p := gopter.NewProperties(testParams)
	numChainInserts := 3
	finalityDepth := 5
	lggr := logger.Test(t)
	db := testutils.NewSqlxDB(t)

	owner := testutils.MustNewSimTransactor(t)
	owner.GasPrice = big.NewInt(10e9)
	p.Property("synchronized with geth", prop.ForAll(func(mineOrReorg []uint64) bool {
		// After the set of reorgs, we should have the same canonical blocks that geth does.
		t.Log("Starting test", mineOrReorg)
		chainID := testutils.NewRandomEVMChainID()
		// Set up a test chain with a log emitting contract deployed.
		orm := logpoller.NewORM(chainID, db, lggr)
		// Note this property test is run concurrently and the sim is not threadsafe.
		backend := simulated.NewBackend(types.GenesisAlloc{
			owner.From: {
				Balance: big.NewInt(0).Mul(big.NewInt(10), big.NewInt(1e18)),
			},
		}, simulated.WithBlockGasLimit(10e6))
		ec := backend.Client()
		_, _, emitter1, err := log_emitter.DeployLogEmitter(owner, ec)
		require.NoError(t, err)

		lpOpts := logpoller.Opts{
			PollPeriod:               15 * time.Second,
			FinalityDepth:            int64(finalityDepth),
			BackfillBatchSize:        3,
			RPCBatchSize:             2,
			KeepFinalizedBlocksDepth: 1000,
		}
		simulatedClient := client.NewSimulatedBackendClient(t, backend, chainID)
		ht := headstest.NewSimulatedHeadTracker(simulatedClient, lpOpts.UseFinalityTag, lpOpts.FinalityDepth)
		lp := logpoller.NewLogPoller(orm, simulatedClient, lggr, ht, lpOpts)
		for i := 0; i < finalityDepth; i++ { // Have enough blocks that we could reorg the full finalityDepth-1.
			backend.Commit()
		}
		currentBlockNumber := int64(1)
		lp.PollAndSaveLogs(testutils.Context(t), currentBlockNumber)
		currentBlock, err := lp.LatestBlock(testutils.Context(t))
		require.NoError(t, err)
		matchesGeth := func() bool {
			// Check every block is identical
			latest, err1 := ec.BlockByNumber(testutils.Context(t), nil)
			require.NoError(t, err1)
			for i := 1; i < int(latest.NumberU64()); i++ {
				ourBlock, err1 := lp.BlockByNumber(testutils.Context(t), int64(i))
				require.NoError(t, err1)
				gethBlock, err1 := ec.BlockByNumber(testutils.Context(t), big.NewInt(int64(i)))
				require.NoError(t, err1)
				if ourBlock.BlockHash != gethBlock.Hash() {
					t.Logf("Initial poll our block differs at height %d got %x want %x\n", i, ourBlock.BlockHash, gethBlock.Hash())
					return false
				}
			}
			return true
		}
		if !matchesGeth() {
			return false
		}
		// Randomly pick to mine or reorg
		for i := 0; i < numChainInserts; i++ {
			if rand.Int63()%2 == 0 {
				// Mine blocks
				for j := 0; j < int(mineOrReorg[i]); j++ {
					backend.Commit()
					latest, err1 := ec.BlockByNumber(testutils.Context(t), nil)
					require.NoError(t, err1)
					t.Log("mined block", latest.Hash())
				}
			} else {
				// Reorg blocks
				latest, err1 := ec.BlockByNumber(testutils.Context(t), nil)
				require.NoError(t, err1)
				reorgedBlock := big.NewInt(0).Sub(latest.Number(), big.NewInt(int64(mineOrReorg[i])))
				reorg, err1 := ec.BlockByNumber(testutils.Context(t), reorgedBlock)
				require.NoError(t, err1)
				require.NoError(t, backend.Fork(reorg.Hash()))

				t.Logf("Reorging from (%v, %x) back to (%v, %x)\n", latest.NumberU64(), latest.Hash(), reorgedBlock.Uint64(), reorg.Hash())
				// Actually need to change the block here to trigger the reorg.
				_, err1 = emitter1.EmitLog1(owner, []*big.Int{big.NewInt(1)})
				require.NoError(t, err1)
				for j := 0; j < int(mineOrReorg[i]+1); j++ { // Need +1 to make it actually longer height so we detect it.
					backend.Commit()
				}
				latest, err1 = ec.BlockByNumber(testutils.Context(t), nil)
				require.NoError(t, err1)
				t.Logf("New latest (%v, %x), latest parent %x)\n", latest.NumberU64(), latest.Hash(), latest.ParentHash())
			}
			lp.PollAndSaveLogs(testutils.Context(t), currentBlock.BlockNumber)
			currentBlock, err = lp.LatestBlock(testutils.Context(t))
			require.NoError(t, err)
		}
		return matchesGeth()
	}, gen.SliceOfN(numChainInserts, gen.UInt64Range(1, uint64(finalityDepth-1))))) // Max reorg depth is finality depth - 1
	p.TestingRun(t)
}

func TestLogPoller_PollAndSaveLogs(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name          string
		finalityDepth int64
		finalityTag   bool
	}{
		{
			name:          "fixed finality depth without finality tag",
			finalityDepth: 3,
			finalityTag:   false,
		},
		{
			name:          "chain finality in use",
			finalityDepth: 0,
			finalityTag:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lpOpts := logpoller.Opts{
				UseFinalityTag:           tt.finalityTag,
				FinalityDepth:            tt.finalityDepth,
				BackfillBatchSize:        3,
				RPCBatchSize:             2,
				KeepFinalizedBlocksDepth: 1000,
			}
			th := SetupTH(t, lpOpts)

			// Set up a log poller listening for log emitter logs.
			err := th.LogPoller.RegisterFilter(testutils.Context(t), logpoller.Filter{
				Name:      "Test Emitter 1 & 2",
				EventSigs: []common.Hash{EmitterABI.Events["Log1"].ID, EmitterABI.Events["Log2"].ID},
				Addresses: []common.Address{th.EmitterAddress1, th.EmitterAddress2},
			})
			require.NoError(t, err)

			b, err := th.Client.BlockByNumber(testutils.Context(t), nil)
			require.NoError(t, err)
			require.Equal(t, uint64(1), b.NumberU64())

			// Test scenario: single block in chain, no logs.
			// Chain genesis <- 1
			// DB: empty
			newStart := th.PollAndSaveLogs(testutils.Context(t), 1)
			assert.Equal(t, int64(2), newStart)

			// We expect to have saved block 1.
			lpb, err := th.ORM.SelectBlockByNumber(testutils.Context(t), 1)
			require.NoError(t, err)
			assert.Equal(t, lpb.BlockHash, b.Hash())
			assert.Equal(t, lpb.BlockNumber, int64(b.NumberU64()))
			assert.Equal(t, int64(1), int64(b.NumberU64()))

			// No logs.
			lgs, err := th.ORM.SelectLogsByBlockRange(testutils.Context(t), 1, 1)
			require.NoError(t, err)
			assert.Empty(t, lgs)
			th.assertHaveCanonical(t, 1, 1)

			// Polling again should be a noop, since we are at the latest.
			newStart = th.PollAndSaveLogs(testutils.Context(t), newStart)
			assert.Equal(t, int64(2), newStart)
			latest, err := th.ORM.SelectLatestBlock(testutils.Context(t))
			require.NoError(t, err)
			assert.Equal(t, int64(1), latest.BlockNumber)
			th.assertHaveCanonical(t, 1, 1)

			// Test scenario: one log 2 block chain.
			// Chain gen <- 1 <- 2 (L1)
			// DB: 1
			_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(1)})
			require.NoError(t, err)
			th.Backend.Commit()

			// Polling should get us the L1 log.
			newStart = th.PollAndSaveLogs(testutils.Context(t), newStart)
			assert.Equal(t, int64(3), newStart)
			latest, err = th.ORM.SelectLatestBlock(testutils.Context(t))
			require.NoError(t, err)
			assert.Equal(t, int64(2), latest.BlockNumber)
			lgs, err = th.ORM.SelectLogsByBlockRange(testutils.Context(t), 1, 3)
			require.NoError(t, err)
			require.Len(t, lgs, 1)
			assert.Equal(t, th.EmitterAddress1, lgs[0].Address)
			assert.Equal(t, latest.BlockHash, lgs[0].BlockHash)
			assert.Equal(t, latest.BlockTimestamp, lgs[0].BlockTimestamp)
			assert.Equal(t, hexutil.Encode(lgs[0].Topics[0]), EmitterABI.Events["Log1"].ID.String())
			assert.Equal(t, hexutil.MustDecode(`0x0000000000000000000000000000000000000000000000000000000000000001`),
				lgs[0].Data)

			// Test scenario: single block reorg with log.
			// Chain gen <- 1 <- 2 (L1_1)
			//                \ 2'(L1_2) <- 3
			// DB: 1, 2
			// - Detect a reorg,
			// - Update the block 2's hash
			// - Save L1_2
			// - L1_1 deleted
			lca, err := th.Client.BlockByNumber(testutils.Context(t), big.NewInt(1))
			require.NoError(t, err)
			require.NoError(t, th.Backend.Fork(lca.Hash()))
			_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(2)})
			require.NoError(t, err)
			// Create 2'
			th.Backend.Commit()
			// Create 3 (we need a new block for us to do any polling and detect the reorg).
			th.Backend.Commit()

			newStart = th.PollAndSaveLogs(testutils.Context(t), newStart)
			assert.Equal(t, int64(4), newStart)
			latest, err = th.ORM.SelectLatestBlock(testutils.Context(t))
			require.NoError(t, err)
			assert.Equal(t, int64(3), latest.BlockNumber)
			lgs, err = th.ORM.SelectLogsByBlockRange(testutils.Context(t), 1, 3)
			require.NoError(t, err)
			require.Len(t, lgs, 1)
			assert.Equal(t, hexutil.MustDecode(`0x0000000000000000000000000000000000000000000000000000000000000002`), lgs[0].Data)
			th.assertHaveCanonical(t, 1, 3)

			parent, err := th.Client.BlockByNumber(testutils.Context(t), big.NewInt(1))
			require.NoError(t, err)

			// Test scenario: reorg back to a chain that looks similar to the original chain. (simulated geth used to allow
			// re-org'ing back to exactly the same chain--now the best we can do is re-emit the same logs on a new one to simulate that)
			// Chain gen <- 1 <- 2 (L1_1)
			//               \ 2' (L1_2) <- 3
			//                \ 2''(L1_1) <- 3' <- 4
			require.NoError(t, th.Backend.Fork(parent.Hash()))
			// Re-emit L1 to make 2'' tip look like original 2 tip
			_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(1)})
			require.NoError(t, err)
			th.Backend.Commit()
			_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(3)})
			require.NoError(t, err)
			// Create 3'
			th.Backend.Commit()
			// Create 4
			th.Backend.Commit()

			newStart = th.PollAndSaveLogs(testutils.Context(t), newStart)
			assert.Equal(t, int64(5), newStart)
			latest, err = th.ORM.SelectLatestBlock(testutils.Context(t))
			require.NoError(t, err)
			assert.Equal(t, int64(4), latest.BlockNumber)
			lgs, err = th.ORM.SelectLogsByBlockRange(testutils.Context(t), 1, 3)
			require.NoError(t, err)

			require.Len(t, lgs, 2)
			assert.Equal(t, int64(2), lgs[0].BlockNumber)
			assert.Equal(t, hexutil.MustDecode(`0x0000000000000000000000000000000000000000000000000000000000000001`), lgs[0].Data)
			assert.Equal(t, int64(3), lgs[1].BlockNumber)
			assert.Equal(t, hexutil.MustDecode(`0x0000000000000000000000000000000000000000000000000000000000000003`), lgs[1].Data)
			th.assertHaveCanonical(t, 1, 1)
			th.assertHaveCanonical(t, 3, 4)
			th.assertDontHave(t, 2, 2) // 2 gets backfilled

			// Test scenario: multiple logs per block for many blocks (also after reorg).
			// Chain gen <- 1 <- 2 (L1_1) <- 3' L1_3 <- 4 <- 5 (L1_4, L2_5) <- 6 (L1_6)
			//                \ 2'(L1_2) <- 3
			// DB: 1, 2', 3'
			// - Should save 4, 5, 6 blocks
			// - Should obtain logs L1_3, L2_5, L1_6
			_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(4)})
			require.NoError(t, err)
			_, err = th.Emitter2.EmitLog1(th.Owner, []*big.Int{big.NewInt(5)})
			require.NoError(t, err)
			// Create 4
			th.Backend.Commit()
			_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(6)})
			require.NoError(t, err)
			// Create 5
			th.Backend.Commit()

			newStart = th.PollAndSaveLogs(testutils.Context(t), newStart)
			assert.Equal(t, int64(7), newStart)
			lgs, err = th.ORM.SelectLogsByBlockRange(testutils.Context(t), 4, 6)
			require.NoError(t, err)
			require.Len(t, lgs, 3)
			assert.Equal(t, hexutil.MustDecode(`0x0000000000000000000000000000000000000000000000000000000000000004`), lgs[0].Data)
			assert.Equal(t, th.EmitterAddress1, lgs[0].Address)
			assert.Equal(t, hexutil.MustDecode(`0x0000000000000000000000000000000000000000000000000000000000000005`), lgs[1].Data)
			assert.Equal(t, th.EmitterAddress2, lgs[1].Address)
			assert.Equal(t, hexutil.MustDecode(`0x0000000000000000000000000000000000000000000000000000000000000006`), lgs[2].Data)
			assert.Equal(t, th.EmitterAddress1, lgs[2].Address)
			th.assertHaveCanonical(t, 1, 1)
			th.assertDontHave(t, 2, 2) // 2 gets backfilled
			th.assertHaveCanonical(t, 3, 6)

			// Test scenario: node down for exactly finality + 2 blocks
			// Note we only backfill up to finalized - 1 blocks, because we need to save the
			// Chain gen <- 1 <- 2 (L1_1) <- 3' L1_3 <- 4 <- 5 (L1_4, L2_5) <- 6 (L1_6) <- 7 (L1_7) <- 8 (L1_8) <- 9 (L1_9) <- 10 (L1_10)
			//                \ 2'(L1_2) <- 3
			// DB: 1, 2, 3, 4, 5, 6
			// - We expect block 7 to backfilled (treated as finalized)
			// - Then block 8-10 to be handled block by block (treated as unfinalized).
			for i := 7; i < 11; i++ {
				_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(int64(i))})
				require.NoError(t, err)
				th.Backend.Commit()
			}

			newStart = th.PollAndSaveLogs(testutils.Context(t), newStart)
			assert.Equal(t, int64(11), newStart)
			lgs, err = th.ORM.SelectLogsByBlockRange(testutils.Context(t), 7, 9)
			require.NoError(t, err)
			require.Len(t, lgs, 3)
			assert.Equal(t, hexutil.MustDecode(`0x0000000000000000000000000000000000000000000000000000000000000007`), lgs[0].Data)
			assert.Equal(t, int64(7), lgs[0].BlockNumber)
			assert.Equal(t, hexutil.MustDecode(`0x0000000000000000000000000000000000000000000000000000000000000008`), lgs[1].Data)
			assert.Equal(t, int64(8), lgs[1].BlockNumber)
			assert.Equal(t, hexutil.MustDecode(`0x0000000000000000000000000000000000000000000000000000000000000009`), lgs[2].Data)
			assert.Equal(t, int64(9), lgs[2].BlockNumber)
			th.assertHaveCanonical(t, 8, 10)

			// Test scenario large backfill (multiple batches)
			// Chain gen <- 1 <- 2 (L1_1) <- 3' L1_3 <- 4 <- 5 (L1_4, L2_5) <- 6 (L1_6) <- 7 (L1_7) <- 8 (L1_8) <- 9 (L1_9) <- 10..32
			//                \ 2'(L1_2) <- 3
			// DB: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
			// - 11 - 13 backfilled in batch 1
			// - 14 - 16 backfilled in batch 2
			// ...
			// - 33, 34, 35 to be treated as unfinalized
			for i := 11; i < 36; i++ {
				_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(int64(i))})
				require.NoError(t, err)
				th.Backend.Commit()
			}

			newStart = th.PollAndSaveLogs(testutils.Context(t), newStart)
			assert.Equal(t, int64(36), newStart)
			lgs, err = th.ORM.SelectLogsByBlockRange(testutils.Context(t), 11, 36)
			require.NoError(t, err)
			assert.Len(t, lgs, 25)
			th.assertHaveCanonical(t, 32, 36) // Should have last finalized block plus unfinalized blocks
			th.assertDontHave(t, 11, 13)      // Should not have older finalized blocks
			th.assertDontHave(t, 14, 16)      // Should not have older finalized blocks

			// Verify that a custom block timestamp will get written to db correctly also
			b, err = th.Client.BlockByNumber(testutils.Context(t), nil)
			require.NoError(t, err)
			require.Equal(t, uint64(35), b.NumberU64())
			blockTimestamp := b.Time()
			require.NoError(t, th.Backend.AdjustTime(time.Hour))
			th.Backend.Commit()

			b, err = th.Client.BlockByNumber(testutils.Context(t), nil)
			require.NoError(t, err)
			require.Equal(t, blockTimestamp+uint64(time.Hour/time.Second)+1, b.Time())
		})
	}
}

func TestLogPoller_ReorgDeeperThanFinality(t *testing.T) {
	tests := []struct {
		name          string
		finalityDepth int64
		finalityTag   bool
	}{
		{
			name:          "fixed finality depth without finality tag",
			finalityDepth: 1,
			finalityTag:   false,
		},
		{
			name:          "chain finality in use",
			finalityDepth: 0,
			finalityTag:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			th := SetupTH(t, logpoller.Opts{
				UseFinalityTag:           tt.finalityTag,
				FinalityDepth:            tt.finalityDepth,
				BackfillBatchSize:        3,
				RPCBatchSize:             2,
				KeepFinalizedBlocksDepth: 1000,
				BackupPollerBlockDelay:   100,
			})
			// Set up a log poller listening for log emitter logs.
			err := th.LogPoller.RegisterFilter(testutils.Context(t), logpoller.Filter{
				Name:      "Test Emitter",
				EventSigs: []common.Hash{EmitterABI.Events["Log1"].ID},
				Addresses: []common.Address{th.EmitterAddress1},
			})
			require.NoError(t, err)

			// Test scenario
			// Chain gen <- 1 <- 2 <- ... <- 32 (finalized) <- 33 (L1_1)
			th.finalizeThroughBlock(t, 32)
			_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(1)})
			require.NoError(t, err)
			th.Backend.Commit()

			// Polling should get us the L1 log.
			firstPoll := th.PollAndSaveLogs(testutils.Context(t), 1)
			assert.Equal(t, int64(34), firstPoll)
			assert.NoError(t, th.LogPoller.Healthy())

			// Fork deeper than finality depth
			// Chain gen <- 1 <- 2 <- 3 <- ... <- 32 (finalized) <- 33 (L1_1)
			//              \      <- 3' <- ... <- 31' <- 32' (finalized) <- 33' <- 34' (L1_2)
			lca, err := th.Client.BlockByNumber(testutils.Context(t), big.NewInt(2))
			require.NoError(t, err)
			require.NoError(t, th.Backend.Fork(lca.Hash()))

			// Create 3'
			_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(3)})
			require.NoError(t, err)
			th.Backend.Commit()

			th.finalizeThroughBlock(t, 32)

			// Create 33' - 34'
			for i := 33; i < 35; i++ {
				_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(int64(i))})
				require.NoError(t, err)
				th.Backend.Commit()
			}

			secondPoll := th.PollAndSaveLogs(testutils.Context(t), firstPoll)
			assert.Equal(t, firstPoll, secondPoll)
			require.Equal(t, commontypes.ErrFinalityViolated, th.LogPoller.Healthy())
			require.Equal(t, commontypes.ErrFinalityViolated, th.LogPoller.HealthReport()[th.LogPoller.Name()])

			// Manually remove re-org'd chain from the log poller to bring it back to life
			// LogPoller should be healthy again after first poll
			// Chain gen <- 1 <- 2
			//                    \ <- 3' <- 4' <- 5' <- 32' (finalized) <- 33' <- 34' (L1_2)
			require.NoError(t, th.ORM.DeleteLogsAndBlocksAfter(testutils.Context(t), 3))
			// Poll from latest
			recoveryPoll := th.PollAndSaveLogs(testutils.Context(t), 1)
			assert.Equal(t, int64(35), recoveryPoll)
			require.NoError(t, th.LogPoller.Healthy())
			require.NoError(t, th.LogPoller.HealthReport()[th.LogPoller.Name()])
		})
	}
}

func TestLogPoller_PollAndSaveLogsDeepReorg(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name          string
		finalityDepth int64
		finalityTag   bool
	}{
		{
			name:          "fixed finality depth without finality tag",
			finalityDepth: 3,
			finalityTag:   false,
		},
		{
			name:          "chain finality in use",
			finalityDepth: 0,
			finalityTag:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lpOpts := logpoller.Opts{
				UseFinalityTag:           tt.finalityTag,
				FinalityDepth:            tt.finalityDepth,
				BackfillBatchSize:        50,
				RPCBatchSize:             50,
				KeepFinalizedBlocksDepth: 1000,
			}
			th := SetupTH(t, lpOpts)
			// Set up a log poller listening for log emitter logs.
			err := th.LogPoller.RegisterFilter(testutils.Context(t), logpoller.Filter{
				Name:      "Test Emitter",
				EventSigs: []common.Hash{EmitterABI.Events["Log1"].ID},
				Addresses: []common.Address{th.EmitterAddress1},
			})
			require.NoError(t, err)

			// Test scenario: one log 2 block chain.
			// Chain gen <- 1 <- 2 (L1_1)
			// DB: 1
			_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(1)})
			require.NoError(t, err)
			th.Backend.Commit()

			// Polling should get us the L1 log.
			newStart := th.PollAndSaveLogs(testutils.Context(t), 1)
			assert.NoError(t, th.LogPoller.Healthy())
			assert.Equal(t, int64(3), newStart)
			// Check that L1_1 has a proper data payload
			lgs, err := th.ORM.SelectLogsByBlockRange(testutils.Context(t), 2, 2)
			require.NoError(t, err)
			require.NotEmpty(t, lgs)
			assert.Equal(t, hexutil.MustDecode(`0x0000000000000000000000000000000000000000000000000000000000000001`), lgs[0].Data)

			// Single block reorg and log poller not working for a while, mine blocks and progress with finalization
			// Chain gen <- 1 <- 2 (L1_1)
			//                \ 2'(L1_2) <- 3' <- 4' <- ... <- 32' (finalized on chain) <- 33' <- 34' <- 35'
			lca, err := th.Client.BlockByNumber(testutils.Context(t), big.NewInt(1))
			require.NoError(t, err)
			require.NoError(t, th.Backend.Fork(lca.Hash()))
			// Create 2'
			_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(2)})
			require.NoError(t, err)
			th.Backend.Commit()
			// Create 3-35
			for i := 3; i <= 35; i++ {
				_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(int64(i))})
				require.NoError(t, err)
				th.Backend.Commit()
			}
			th.finalizeThroughBlock(t, 32)

			newStart = th.PollAndSaveLogs(testutils.Context(t), newStart)
			assert.Equal(t, int64(36), newStart)
			assert.NoError(t, th.LogPoller.Healthy())

			// Expect L1_2 to be properly updated
			lgs, err = th.ORM.SelectLogsByBlockRange(testutils.Context(t), 2, 31)
			require.NoError(t, err)
			require.Len(t, lgs, 30)
			assert.Equal(t, hexutil.MustDecode(`0x0000000000000000000000000000000000000000000000000000000000000002`), lgs[0].Data)
			th.assertHaveCanonical(t, 1, 2)
			th.assertDontHave(t, 2, 31) // These blocks are backfilled
			th.assertHaveCanonical(t, 32, 36)
		})
	}
}

func TestLogPoller_LoadFilters(t *testing.T) {
	t.Parallel()

	lpOpts := logpoller.Opts{
		UseFinalityTag:           false,
		FinalityDepth:            2,
		BackfillBatchSize:        3,
		RPCBatchSize:             2,
		KeepFinalizedBlocksDepth: 1000,
	}
	th := SetupTH(t, lpOpts)

	filter1 := logpoller.Filter{
		Name: "first Filter",
		EventSigs: []common.Hash{
			EmitterABI.Events["Log1"].ID, EmitterABI.Events["Log2"].ID},
		Addresses: []common.Address{th.EmitterAddress1, th.EmitterAddress2},
	}
	filter2 := logpoller.Filter{
		Name:      "second Filter",
		EventSigs: []common.Hash{EmitterABI.Events["Log2"].ID, EmitterABI.Events["Log3"].ID},
		Addresses: []common.Address{th.EmitterAddress2},
	}
	filter3 := logpoller.Filter{
		Name:      "third Filter",
		EventSigs: []common.Hash{EmitterABI.Events["Log1"].ID},
		Addresses: []common.Address{th.EmitterAddress1, th.EmitterAddress2},
	}

	assert.True(t, filter1.Contains(nil))
	assert.False(t, filter1.Contains(&filter2))
	assert.False(t, filter2.Contains(&filter1))
	assert.True(t, filter1.Contains(&filter3))

	err := th.LogPoller.RegisterFilter(testutils.Context(t), filter1)
	require.NoError(t, err)
	err = th.LogPoller.RegisterFilter(testutils.Context(t), filter2)
	require.NoError(t, err)
	err = th.LogPoller.RegisterFilter(testutils.Context(t), filter3)
	require.NoError(t, err)

	filters, err := th.ORM.LoadFilters(testutils.Context(t))
	require.NoError(t, err)
	require.NotNil(t, filters)
	require.Len(t, filters, 3)

	filter, ok := filters["first Filter"]
	require.True(t, ok)
	assert.True(t, filter.Contains(&filter1))
	assert.True(t, filter1.Contains(&filter))

	filter, ok = filters["second Filter"]
	require.True(t, ok)
	assert.True(t, filter.Contains(&filter2))
	assert.True(t, filter2.Contains(&filter))

	filter, ok = filters["third Filter"]
	require.True(t, ok)
	assert.True(t, filter.Contains(&filter3))
	assert.True(t, filter3.Contains(&filter))

	t.Run("HasFilter", func(t *testing.T) {
		assert.True(t, th.LogPoller.HasFilter("first Filter"))
		assert.True(t, th.LogPoller.HasFilter("second Filter"))
		assert.True(t, th.LogPoller.HasFilter("third Filter"))
		assert.False(t, th.LogPoller.HasFilter("fourth Filter"))
	})

	t.Run("GetFilters", func(t *testing.T) {
		filters := th.LogPoller.GetFilters()
		assert.Len(t, filters, 3)
		assert.Equal(t, "first Filter", filters["first Filter"].Name)
		assert.Equal(t, filters["first Filter"].EventSigs, filter1.EventSigs)
		assert.Equal(t, filters["first Filter"].Addresses, filter1.Addresses)
		assert.Equal(t, "second Filter", filters["second Filter"].Name)
		assert.Equal(t, filters["second Filter"].EventSigs, filter2.EventSigs)
		assert.Equal(t, filters["second Filter"].Addresses, filter2.Addresses)
		assert.Equal(t, "third Filter", filters["third Filter"].Name)
		assert.Equal(t, filters["third Filter"].EventSigs, filter3.EventSigs)
		assert.Equal(t, filters["third Filter"].Addresses, filter3.Addresses)
	})
}

func TestLogPoller_GetBlocks_Range(t *testing.T) {
	t.Parallel()

	lpOpts := logpoller.Opts{
		UseFinalityTag:           false,
		FinalityDepth:            2,
		BackfillBatchSize:        3,
		RPCBatchSize:             2,
		KeepFinalizedBlocksDepth: 1000,
	}
	th := SetupTH(t, lpOpts)

	_, err := th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(1)})
	require.NoError(t, err)
	th.Backend.Commit() // Commit block #2 with log in it

	_, err = th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(2)})
	require.NoError(t, err)
	th.Backend.Commit() // Commit block #3 with a different log

	err = th.LogPoller.RegisterFilter(testutils.Context(t), logpoller.Filter{
		Name:      "GetBlocks Test",
		EventSigs: []common.Hash{EmitterABI.Events["Log1"].ID, EmitterABI.Events["Log2"].ID},
		Addresses: []common.Address{th.EmitterAddress1, th.EmitterAddress2},
	})
	require.NoError(t, err)

	// LP retrieves 0 blocks
	blockNums := []uint64{}
	blocks, err := th.LogPoller.GetBlocksRange(testutils.Context(t), blockNums)
	require.NoError(t, err)
	assert.Empty(t, blocks)

	// LP retrieves block 1
	blockNums = []uint64{1}
	blocks, err = th.LogPoller.GetBlocksRange(testutils.Context(t), blockNums)
	require.NoError(t, err)
	assert.Len(t, blocks, 1)
	assert.Equal(t, 1, int(blocks[0].BlockNumber))
	assert.Equal(t, 1, int(blocks[0].FinalizedBlockNumber))

	// LP fails to return block 2 because it hasn't been finalized yet
	blockNums = []uint64{2}
	_, err = th.LogPoller.GetBlocksRange(testutils.Context(t), blockNums)
	require.Error(t, err)
	assert.Equal(t, "received unfinalized block 2 while expecting finalized block (latestFinalizedBlockNumber = 1)", err.Error())

	th.Backend.Commit() // Commit block #4, so that block #2 is finalized

	// Assert block 2 is not yet in DB
	_, err = th.ORM.SelectBlockByNumber(testutils.Context(t), 2)
	require.Error(t, err)

	// getBlocksRange is able to retrieve block 2 by calling RPC
	rpcBlocks, err := th.LogPoller.GetBlocksRange(testutils.Context(t), blockNums)
	require.NoError(t, err)
	assert.Len(t, rpcBlocks, 1)
	assert.Equal(t, 2, int(rpcBlocks[0].BlockNumber))
	assert.Equal(t, 2, int(rpcBlocks[0].FinalizedBlockNumber))

	th.Backend.Commit() // commit block #5 so that #3 becomes finalized

	// Assert block 3 is not yet in DB
	_, err = th.ORM.SelectBlockByNumber(testutils.Context(t), 3)
	require.Error(t, err)

	// getBlocksRange is able to retrieve blocks 1 and 3, without retrieving block 2
	blockNums2 := []uint64{1, 3}
	rpcBlocks2, err := th.LogPoller.GetBlocksRange(testutils.Context(t), blockNums2)
	require.NoError(t, err)
	assert.Len(t, rpcBlocks2, 2)
	assert.Equal(t, 1, int(rpcBlocks2[0].BlockNumber))
	assert.Equal(t, 3, int(rpcBlocks2[1].BlockNumber))
	assert.Equal(t, 3, int(rpcBlocks2[1].FinalizedBlockNumber))

	// after calling PollAndSaveLogs, block 3 (latest finalized block) is persisted in DB
	th.LogPoller.PollAndSaveLogs(testutils.Context(t), 1)
	block, err := th.ORM.SelectBlockByNumber(testutils.Context(t), 3)
	require.NoError(t, err)
	assert.Equal(t, 3, int(block.BlockNumber))

	// getBlocksRange should still be able to return block 2 by fetching from DB
	lpBlocks, err := th.LogPoller.GetBlocksRange(testutils.Context(t), blockNums)
	require.NoError(t, err)
	assert.Len(t, lpBlocks, 1)
	assert.Equal(t, rpcBlocks[0].BlockNumber, lpBlocks[0].BlockNumber)
	assert.Equal(t, rpcBlocks[0].BlockHash, lpBlocks[0].BlockHash)
	assert.Equal(t, rpcBlocks[0].FinalizedBlockNumber, lpBlocks[0].FinalizedBlockNumber)

	// getBlocksRange return multiple blocks
	blockNums = []uint64{1, 2}
	blocks, err = th.LogPoller.GetBlocksRange(testutils.Context(t), blockNums)
	require.NoError(t, err)
	assert.Equal(t, 1, int(blocks[0].BlockNumber))
	assert.NotEmpty(t, blocks[0].BlockHash)
	assert.Equal(t, 2, int(blocks[1].BlockNumber))
	assert.NotEmpty(t, blocks[1].BlockHash)
	assert.Equal(t, 2, int(blocks[1].FinalizedBlockNumber))

	// getBlocksRange return blocks in requested order
	blockNums = []uint64{2, 1}
	reversedBlocks, err := th.LogPoller.GetBlocksRange(testutils.Context(t), blockNums)
	require.NoError(t, err)
	assert.Equal(t, blocks[0].BlockNumber, reversedBlocks[1].BlockNumber)
	assert.Equal(t, blocks[0].BlockHash, reversedBlocks[1].BlockHash)
	assert.Equal(t, blocks[1].BlockNumber, reversedBlocks[0].BlockNumber)
	assert.Equal(t, blocks[1].BlockHash, reversedBlocks[0].BlockHash)

	// test RPC context cancellation
	ctx, cancel := context.WithCancel(testutils.Context(t))
	cancel()
	_, err = th.LogPoller.GetBlocksRange(ctx, blockNums)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "context canceled")
}

func TestGetReplayFromBlock(t *testing.T) {
	t.Parallel()
	lpOpts := logpoller.Opts{
		UseFinalityTag:           false,
		FinalityDepth:            2,
		BackfillBatchSize:        3,
		RPCBatchSize:             2,
		KeepFinalizedBlocksDepth: 1000,
	}
	th := SetupTH(t, lpOpts)
	// Commit a few blocks
	for i := 0; i < 10; i++ {
		th.Backend.Commit()
	}

	// Nothing in the DB yet, should use whatever we specify.
	requested := int64(5)
	fromBlock, err := th.LogPoller.GetReplayFromBlock(testutils.Context(t), requested)
	require.NoError(t, err)
	assert.Equal(t, requested, fromBlock)

	// Do a poll, then we should have up to block 11 (blocks 0 & 1 are contract deployments, 2-10 logs).
	nextBlock := th.PollAndSaveLogs(testutils.Context(t), 1)
	require.Equal(t, int64(12), nextBlock)

	// Commit a few more so chain is ahead.
	for i := 0; i < 3; i++ {
		th.Backend.Commit()
	}
	// Should take min(latest, requested), in this case latest.
	requested = int64(15)
	fromBlock, err = th.LogPoller.GetReplayFromBlock(testutils.Context(t), requested)
	require.NoError(t, err)
	latest, err := th.LogPoller.LatestBlock(testutils.Context(t))
	require.NoError(t, err)
	assert.Equal(t, latest.BlockNumber, fromBlock)

	// Should take min(latest, requested) in this case requested.
	requested = int64(7)
	fromBlock, err = th.LogPoller.GetReplayFromBlock(testutils.Context(t), requested)
	require.NoError(t, err)
	assert.Equal(t, requested, fromBlock)
}

func TestLogPoller_DBErrorHandling(t *testing.T) {
	t.Parallel()
	ctx := testutils.Context(t)
	lggr, observedLogs := logger.TestObserved(t, zapcore.WarnLevel)
	chainID1 := testutils.NewRandomEVMChainID()
	chainID2 := testutils.NewRandomEVMChainID()
	db := testutils.NewSqlxDB(t)
	o := logpoller.NewORM(chainID1, db, lggr)

	owner := testutils.MustNewSimTransactor(t)
	backend := simulated.NewBackend(types.GenesisAlloc{
		owner.From: {
			Balance: big.NewInt(0).Mul(big.NewInt(10), big.NewInt(1e18)),
		},
	}, simulated.WithBlockGasLimit(10e6))
	ec := backend.Client()
	_, _, emitter, err := log_emitter.DeployLogEmitter(owner, ec)
	require.NoError(t, err)
	_, err = emitter.EmitLog1(owner, []*big.Int{big.NewInt(9)})
	require.NoError(t, err)
	_, err = emitter.EmitLog1(owner, []*big.Int{big.NewInt(7)})
	require.NoError(t, err)
	backend.Commit()
	backend.Commit()
	backend.Commit()

	lpOpts := logpoller.Opts{
		PollPeriod:               time.Hour,
		FinalityDepth:            2,
		BackfillBatchSize:        3,
		RPCBatchSize:             2,
		KeepFinalizedBlocksDepth: 1000,
	}
	lp := logpoller.NewLogPoller(o, client.NewSimulatedBackendClient(t, backend, chainID2), lggr, nil, lpOpts)

	err = lp.Replay(ctx, 5) // block number too high
	require.ErrorContains(t, err, "Invalid replay block number")

	// Force a db error while loading the filters (tx aborted, already rolled back)
	require.Error(t, commonutils.JustError(db.Exec(`invalid query`)))
	go func() {
		err = lp.Replay(ctx, 2)
		assert.ErrorContains(t, err, "current transaction is aborted")
	}()

	time.Sleep(100 * time.Millisecond)
	require.NoError(t, lp.Start(ctx))
	testutils.RequireEventually(t, func() bool {
		return observedLogs.Len() >= 1
	})
	err = lp.Close()
	require.NoError(t, err)

	logMsgs := make(map[string]int)
	for _, obs := range observedLogs.All() {
		_, ok := logMsgs[obs.Entry.Message]
		if ok {
			logMsgs[(obs.Entry.Message)] = 1
		} else {
			logMsgs[(obs.Entry.Message)]++
		}
	}

	assert.Contains(t, logMsgs, "Failed loading filters in main logpoller loop, retrying later")
}

type getLogErrData struct {
	From  string
	To    string
	Limit int
}

func TestTooManyLogResults(t *testing.T) {
	t.Parallel()

	ctx := testutils.Context(t)
	ec := clienttest.NewClientWithDefaultChainID(t)
	lggr, obs := logger.TestObserved(t, zapcore.DebugLevel)
	chainID := testutils.NewRandomEVMChainID()
	db := testutils.NewSqlxDB(t)

	o := logpoller.NewORM(chainID, db, lggr)

	lpOpts := logpoller.Opts{
		PollPeriod:               time.Hour,
		FinalityDepth:            2,
		BackfillBatchSize:        20,
		RPCBatchSize:             10,
		KeepFinalizedBlocksDepth: 1000,
	}
	headTracker := headstest.NewTracker[*evmtypes.Head, common.Hash](t)
	lp := logpoller.NewLogPoller(o, ec, lggr, headTracker, lpOpts)
	expected := []int64{10, 5, 2, 1}

	tooLargeErr := client.JsonError{
		Code:    -32005,
		Data:    getLogErrData{"0x100E698", "0x100E6D4", 10000},
		Message: "query returned more than 10000 results. Try with this block range [0x100E698, 0x100E6D4].",
	}

	var filterLogsCall *mock.Call
	head := &evmtypes.Head{}
	finalized := &evmtypes.Head{}

	ec.On("HeadByNumber", mock.Anything, mock.Anything).Return(func(ctx context.Context, blockNumber *big.Int) (*evmtypes.Head, error) {
		if blockNumber == nil {
			require.FailNow(t, "unexpected call to get current head")
		}
		return &evmtypes.Head{Number: blockNumber.Int64(), ParentHash: common.HexToHash(fmt.Sprintf("0x%x", blockNumber.Int64()-1))}, nil
	})

	t.Run("halves size until small enough, then succeeds", func(t *testing.T) {
		// Simulate latestBlock = 300
		head.Number = 300
		head.Hash = common.HexToHash("0x1234") // needed to satisfy validation in fetchBlocks()
		finalized.Number = head.Number - lpOpts.FinalityDepth

		headTracker.On("LatestAndFinalizedBlock", mock.Anything).Return(head, finalized, nil).Once()

		headByHash := ec.On("HeadByHash", mock.Anything, mock.Anything).Return(func(ctx context.Context, blockHash common.Hash) (*evmtypes.Head, error) {
			return &evmtypes.Head{Hash: blockHash}, nil
		})

		batchCallContext := ec.On("BatchCallContext", mock.Anything, mock.Anything).Return(
			func(ctx context.Context, calls []rpc.BatchElem) error {
				for i := range calls {
					blockNumberHex := calls[i].Args[0].(string)
					if blockNumberHex == "latest" {
						calls[i].Result = head
						continue
					}
					blockNumber, ok := new(big.Int).SetString(blockNumberHex[2:], 16)
					require.True(t, ok, blockNumberHex)

					calls[i].Result = &evmtypes.Head{
						Number:     blockNumber.Int64(),
						Hash:       common.HexToHash(fmt.Sprintf("0x%x", blockNumber.Int64())),
						ParentHash: common.HexToHash(fmt.Sprintf("0x%x", blockNumber.Int64()-1)),
					}
				}
				return nil
			},
		)

		filterLogsCall = ec.On("FilterLogs", mock.Anything, mock.Anything).Return(func(ctx context.Context, fq ethereum.FilterQuery) (logs []types.Log, err error) {
			if fq.BlockHash != nil {
				return []types.Log{}, nil // succeed when single block requested
			}
			from := fq.FromBlock.Uint64()
			to := fq.ToBlock.Uint64()
			if to-from >= 8 {
				return []types.Log{}, context.DeadlineExceeded // simulate RPC client timeout as a "too many results" scenario
			}
			if to-from >= 4 {
				return []types.Log{}, tooLargeErr // return "too many results" error if block range spans 4 or more blocks
			}
			return logs, err
		})

		addr := testutils.NewAddress()
		err := lp.RegisterFilter(ctx, logpoller.Filter{
			Name:      "Integration test",
			EventSigs: []common.Hash{EmitterABI.Events["Log1"].ID},
			Addresses: []common.Address{addr},
		})
		require.NoError(t, err)
		lp.PollAndSaveLogs(ctx, 5)
		block, err2 := o.SelectLatestBlock(ctx)
		require.NoError(t, err2)
		assert.Equal(t, int64(298), block.BlockNumber)

		logs := obs.FilterLevelExact(zapcore.WarnLevel).FilterMessageSnippet("halving block range batch size").FilterFieldKey("newBatchSize").All()
		// Should have tried again 3 times--first reducing batch size to 10, then 5, then 2
		require.Len(t, logs, 3)
		for i, s := range expected[:3] {
			assert.Equal(t, s, logs[i].ContextMap()["newBatchSize"])
		}
		filterLogsCall.Unset()
		batchCallContext.Unset()
		headByHash.Unset()
	})

	t.Run("Halves size until single block, then reports critical error", func(t *testing.T) {
		obs.TakeAll()

		// Now jump to block 500, but return error no matter how small the block range gets.
		//  Should exit the loop with a critical error instead of hanging.
		head.Number = 500
		finalized.Number = head.Number - lpOpts.FinalityDepth
		headTracker.On("LatestAndFinalizedBlock", mock.Anything).Return(head, finalized, nil).Once()
		filterLogsCall = ec.On("FilterLogs", mock.Anything, mock.Anything).Return(func(ctx context.Context, fq ethereum.FilterQuery) (logs []types.Log, err error) {
			if fq.BlockHash != nil {
				return []types.Log{}, nil // succeed when single block requested
			}
			return []types.Log{}, tooLargeErr // return "too many results" error if block range spans 4 or more blocks
		})

		lp.PollAndSaveLogs(ctx, 298)
		block, err := o.SelectLatestBlock(ctx)
		if err != nil {
			require.ErrorContains(t, err, "no rows") // In case this subtest is run by itself
		} else {
			assert.Equal(t, int64(298), block.BlockNumber)
		}
		warns := obs.FilterMessageSnippet("halving block range").FilterLevelExact(zapcore.WarnLevel).All()
		crit := obs.FilterMessageSnippet("failed to retrieve logs").FilterLevelExact(zapcore.DPanicLevel).All()
		require.Len(t, warns, 4)
		for i, s := range expected {
			assert.Equal(t, s, warns[i].ContextMap()["newBatchSize"])
		}

		require.Len(t, crit, 1)
		assert.Contains(t, crit[0].Message, "Too many log results in a single block")
		filterLogsCall.Unset()
	})

	t.Run("Unrelated error are retried without adjusting size", func(t *testing.T) {
		unrelatedError := errors.New("Unrelated to the size of the request")
		head.Number = 500
		finalized.Number = head.Number - lpOpts.FinalityDepth

		obs.TakeAll()
		filterLogsCall = ec.On("FilterLogs", mock.Anything, mock.Anything).Return(func(ctx context.Context, fq ethereum.FilterQuery) (logs []types.Log, err error) {
			if fq.BlockHash != nil {
				return []types.Log{}, nil // succeed when single block requested
			}
			return []types.Log{}, unrelatedError // return an unrelated error that should just be retried with same size
		})
		headTracker.On("LatestAndFinalizedBlock", mock.Anything).Return(head, finalized, nil).Once()

		lp.PollAndSaveLogs(ctx, 298)
		block, err := o.SelectLatestBlock(ctx)
		if err != nil {
			require.ErrorContains(t, err, "no rows") // In case this subtest is run by itself
		} else {
			assert.Equal(t, int64(298), block.BlockNumber)
		}
		crit := obs.FilterLevelExact(zapcore.DPanicLevel).All()
		errors := obs.FilterLevelExact(zapcore.ErrorLevel).All()
		warns := obs.FilterLevelExact(zapcore.WarnLevel).All()
		assert.Empty(t, crit)
		require.Len(t, errors, 2)
		assert.Contains(t, errors[0].Message, "Unable to query for logs")
		assert.Contains(t, errors[1].Message, "Failed to poll and save logs, retrying later")
		require.Empty(t, warns)
	})
}

func Test_PollAndQueryFinalizedBlocks(t *testing.T) {
	t.Parallel()
	ctx := testutils.Context(t)
	firstBatchLen := 3
	secondBatchLen := 5

	lpOpts := logpoller.Opts{
		UseFinalityTag:           true,
		BackfillBatchSize:        3,
		RPCBatchSize:             2,
		KeepFinalizedBlocksDepth: 1000,
	}
	th := SetupTH(t, lpOpts)

	eventSig := EmitterABI.Events["Log1"].ID
	err := th.LogPoller.RegisterFilter(ctx, logpoller.Filter{
		Name:      "GetBlocks Test",
		EventSigs: []common.Hash{eventSig},
		Addresses: []common.Address{th.EmitterAddress1}},
	)
	require.NoError(t, err)

	// Generate block that will be finalized
	for i := 0; i < firstBatchLen; i++ {
		_, err1 := th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(int64(i))})
		require.NoError(t, err1)
		th.Backend.Commit()
	}

	// Mark current head as finalized

	h, err := th.Client.HeaderByNumber(ctx, nil)
	require.NoError(t, err)
	assert.NotNil(t, h)
	th.finalizeThroughBlock(t, h.Number.Int64())

	// Generate next blocks, not marked as finalized
	for i := 0; i < secondBatchLen; i++ {
		_, err1 := th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(int64(i))})
		require.NoError(t, err1)
		th.Backend.Commit()
	}

	currentBlock := th.PollAndSaveLogs(ctx, 1)
	require.Equal(t, 32+secondBatchLen+1, int(currentBlock))

	finalizedLogs, err := th.LogPoller.LogsDataWordGreaterThan(
		ctx,
		eventSig,
		th.EmitterAddress1,
		0,
		common.Hash{},
		evmtypes.Finalized,
	)
	require.NoError(t, err)
	require.Len(t, finalizedLogs, firstBatchLen, "len(finalizedLogs) = %d, should have been %d", len(finalizedLogs), firstBatchLen)

	numberOfConfirmations := 1
	logsByConfs, err := th.LogPoller.LogsDataWordGreaterThan(
		ctx,
		eventSig,
		th.EmitterAddress1,
		0,
		common.Hash{},
		evmtypes.Confirmations(numberOfConfirmations),
	)
	require.NoError(t, err)
	require.Len(t, logsByConfs, firstBatchLen+secondBatchLen-numberOfConfirmations)
}

func Test_PollAndSavePersistsFinalityInBlocks(t *testing.T) {
	ctx := testutils.Context(t)
	numberOfBlocks := 37 // must be greater than 1 epoch

	tests := []struct {
		name                   string
		useFinalityTag         bool
		finalityDepth          int64
		expectedFinalizedBlock int64
	}{
		{
			name:                   "using fixed finality depth",
			useFinalityTag:         false,
			finalityDepth:          2,
			expectedFinalizedBlock: int64(numberOfBlocks - 2),
		},
		{
			name:                   "setting last finalized block number to 0 if finality is too deep",
			useFinalityTag:         false,
			finalityDepth:          40,
			expectedFinalizedBlock: 1,
		},
		{
			name:                   "using finality from chain",
			useFinalityTag:         true,
			finalityDepth:          0,
			expectedFinalizedBlock: 32,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lpOpts := logpoller.Opts{
				UseFinalityTag:           tt.useFinalityTag,
				FinalityDepth:            tt.finalityDepth,
				BackfillBatchSize:        3,
				RPCBatchSize:             2,
				KeepFinalizedBlocksDepth: 1000,
			}
			th := SetupTH(t, lpOpts)
			// Should return error before the first poll and save
			_, err := th.LogPoller.LatestBlock(ctx)
			require.Error(t, err)

			// Create a couple of blocks
			for i := 0; i < numberOfBlocks-1; i++ {
				th.Backend.Commit()
			}

			if tt.useFinalityTag {
				th.finalizeThroughBlock(t, tt.expectedFinalizedBlock)
			}

			th.PollAndSaveLogs(ctx, 1)

			latestBlock, err := th.LogPoller.LatestBlock(ctx)
			require.NoError(t, err)
			require.Equal(t, int64(numberOfBlocks), latestBlock.BlockNumber)
			require.Equal(t, tt.expectedFinalizedBlock, latestBlock.FinalizedBlockNumber)
		})
	}
}

func Test_CreatedAfterQueriesWithBackfill(t *testing.T) {
	emittedLogs := 60
	ctx := testutils.Context(t)

	tests := []struct {
		name          string
		finalityDepth int64
		finalityTag   bool
	}{
		{
			name:          "fixed finality depth without finality tag",
			finalityDepth: 10,
			finalityTag:   false,
		},
		{
			name:          "chain finality in use",
			finalityDepth: 0,
			finalityTag:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lpOpts := logpoller.Opts{
				UseFinalityTag:           tt.finalityTag,
				FinalityDepth:            tt.finalityDepth,
				BackfillBatchSize:        3,
				RPCBatchSize:             2,
				KeepFinalizedBlocksDepth: 1000,
				BackupPollerBlockDelay:   100,
			}
			th := SetupTH(t, lpOpts)

			header, err := th.Client.HeaderByNumber(ctx, nil)
			require.NoError(t, err)
			require.LessOrEqual(t, header.Time, uint64(math.MaxInt64))
			genesisBlockTime := time.Unix(int64(header.Time), 0) //nolint:gosec // G115 false positive

			// Emit some logs in blocks
			for i := 0; i < emittedLogs; i++ {
				_, err2 := th.Emitter1.EmitLog1(th.Owner, []*big.Int{big.NewInt(int64(i))})
				require.NoError(t, err2)
				th.Backend.Commit()
			}

			// First PollAndSave, no filters are registered
			currentBlock := th.PollAndSaveLogs(ctx, 1)

			err = th.LogPoller.RegisterFilter(ctx, logpoller.Filter{
				Name:      "Test Emitter",
				EventSigs: []common.Hash{EmitterABI.Events["Log1"].ID},
				Addresses: []common.Address{th.EmitterAddress1},
			})
			require.NoError(t, err)

			// Finalize current block, because backup always backfill up to one block before last finalized
			if tt.finalityTag {
				th.finalizeThroughBlock(t, currentBlock)
			} else {
				for i := 0; i < int(tt.finalityDepth)+1; i++ {
					th.Backend.Commit()
				}
			}

			// LogPoller should backfill entire history
			require.NoError(t, th.LogPoller.BackupPollAndSaveLogs(ctx))
			require.NoError(t, err)

			// Make sure that all logs are backfilled
			logs, err := th.LogPoller.Logs(
				ctx,
				0,
				currentBlock,
				EmitterABI.Events["Log1"].ID,
				th.EmitterAddress1,
			)
			require.NoError(t, err)
			require.Len(t, logs, emittedLogs)

			// We should get all the logs by the block_timestamp
			logs, err = th.LogPoller.LogsCreatedAfter(
				ctx,
				EmitterABI.Events["Log1"].ID,
				th.EmitterAddress1,
				genesisBlockTime,
				0,
			)
			require.NoError(t, err)
			require.Len(t, logs, emittedLogs)
		})
	}
}

func Test_PruneOldBlocks(t *testing.T) {
	ctx := testutils.Context(t)

	tests := []struct {
		name                     string
		keepFinalizedBlocksDepth int64
		blockToCreate            int
		blocksLeft               int
		wantErr                  bool
	}{
		{
			name:                     "returns error if no blocks yet",
			keepFinalizedBlocksDepth: 10,
			blockToCreate:            0,
			wantErr:                  true,
		},
		{
			name:                     "returns if there is not enough blocks in the db",
			keepFinalizedBlocksDepth: 11,
			blockToCreate:            10,
			blocksLeft:               10,
		},
		{
			name:                     "prunes matching blocks",
			keepFinalizedBlocksDepth: 1000,
			blockToCreate:            2000,
			blocksLeft:               1010, // last finalized block is 10 block behind
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lpOpts := logpoller.Opts{
				UseFinalityTag:           true,
				BackfillBatchSize:        3,
				RPCBatchSize:             2,
				KeepFinalizedBlocksDepth: tt.keepFinalizedBlocksDepth,
			}
			th := SetupTH(t, lpOpts)

			for i := 1; i <= tt.blockToCreate; i++ {
				err := th.ORM.InsertBlock(ctx, utils.RandomBytes32(), int64(i+10), time.Now(), int64(i))
				require.NoError(t, err)
			}

			if tt.wantErr {
				_, err := th.LogPoller.PruneOldBlocks(ctx)
				require.Error(t, err)
				return
			}

			allDeleted, err := th.LogPoller.PruneOldBlocks(ctx)
			require.NoError(t, err)
			assert.True(t, allDeleted)
			blocks, err := th.ORM.GetBlocksRange(ctx, 0, math.MaxInt64)
			require.NoError(t, err)
			assert.Len(t, blocks, tt.blocksLeft)
		})
	}
}

func TestFindLCA(t *testing.T) {
	ctx := testutils.Context(t)
	ec := clienttest.NewClientWithDefaultChainID(t)
	lggr := logger.Test(t)
	chainID := testutils.NewRandomEVMChainID()
	db := testutils.NewSqlxDB(t)

	orm := logpoller.NewORM(chainID, db, lggr)

	lpOpts := logpoller.Opts{
		PollPeriod:               time.Hour,
		FinalityDepth:            2,
		BackfillBatchSize:        20,
		RPCBatchSize:             10,
		KeepFinalizedBlocksDepth: 1000,
	}

	lp := logpoller.NewLogPoller(orm, ec, lggr, nil, lpOpts)
	t.Run("Fails, if failed to select oldest block", func(t *testing.T) {
		_, err := lp.FindLCA(ctx)
		require.ErrorContains(t, err, "failed to select the latest block")
	})
	// oldest
	require.NoError(t, orm.InsertBlock(ctx, common.HexToHash("0x123"), 10, time.Now(), 0))
	// latest
	latestBlockHash := common.HexToHash("0x124")
	require.NoError(t, orm.InsertBlock(ctx, latestBlockHash, 16, time.Now(), 0))
	t.Run("Fails, if caller's context canceled", func(t *testing.T) {
		lCtx, cancel := context.WithCancel(ctx)
		ec.On("HeadByHash", mock.Anything, latestBlockHash).Return(nil, nil).Run(func(_ mock.Arguments) {
			cancel()
		}).Once()
		_, err := lp.FindLCA(lCtx)
		require.ErrorContains(t, err, "aborted, FindLCA request cancelled")
	})
	t.Run("Fails, if RPC returns an error", func(t *testing.T) {
		expectedError := errors.New("failed to call RPC")
		ec.On("HeadByHash", mock.Anything, latestBlockHash).Return(nil, expectedError).Once()
		_, err := lp.FindLCA(ctx)
		require.ErrorContains(t, err, expectedError.Error())
	})
	t.Run("Fails, if block numbers do not match", func(t *testing.T) {
		ec.On("HeadByHash", mock.Anything, latestBlockHash).Return(&evmtypes.Head{
			Number: 123,
		}, nil).Once()
		_, err := lp.FindLCA(ctx)
		require.ErrorContains(t, err, "expected block numbers to match")
	})
	t.Run("Fails, if none of the blocks in db matches on chain", func(t *testing.T) {
		ec.On("HeadByHash", mock.Anything, mock.Anything).Return(nil, nil).Times(3)
		_, err := lp.FindLCA(ctx)
		require.ErrorContains(t, err, "failed to find LCA, this means that whole database LogPoller state was reorged out of chain or RPC/Core node is misconfigured")
	})

	type block struct {
		BN     int
		Exists bool
	}
	testCases := []struct {
		Name                string
		Blocks              []block
		ExpectedBlockNumber int
		ExpectedError       error
	}{
		{
			Name:                "All of the blocks are present on chain - returns the latest",
			Blocks:              []block{{BN: 1, Exists: true}, {BN: 2, Exists: true}, {BN: 3, Exists: true}, {BN: 4, Exists: true}},
			ExpectedBlockNumber: 4,
		},
		{
			Name:                "None of the blocks exists on chain - returns an erro",
			Blocks:              []block{{BN: 1, Exists: false}, {BN: 2, Exists: false}, {BN: 3, Exists: false}, {BN: 4, Exists: false}},
			ExpectedBlockNumber: 0,
			ExpectedError:       errors.New("failed to find LCA, this means that whole database LogPoller state was reorged out of chain or RPC/Core node is misconfigured"),
		},
		{
			Name:                "Only latest block does not exist",
			Blocks:              []block{{BN: 1, Exists: true}, {BN: 2, Exists: true}, {BN: 3, Exists: true}, {BN: 4, Exists: false}},
			ExpectedBlockNumber: 3,
		},
		{
			Name:                "Only oldest block exists on chain",
			Blocks:              []block{{BN: 1, Exists: true}, {BN: 2, Exists: false}, {BN: 3, Exists: false}, {BN: 4, Exists: false}},
			ExpectedBlockNumber: 1,
		},
	}

	blockHashI := int64(0)
	for _, tc := range testCases {
		t.Run(tc.Name, func(t *testing.T) {
			// reset the database
			require.NoError(t, orm.DeleteLogsAndBlocksAfter(ctx, 0))
			for _, b := range tc.Blocks {
				blockHashI++
				hash := common.BigToHash(big.NewInt(blockHashI))
				require.NoError(t, orm.InsertBlock(ctx, hash, int64(b.BN), time.Now(), 0))
				// Hashes are unique for all test cases
				var onChainBlock *evmtypes.Head
				if b.Exists {
					onChainBlock = &evmtypes.Head{Number: int64(b.BN)}
				}
				ec.On("HeadByHash", mock.Anything, hash).Return(onChainBlock, nil).Maybe()
			}

			result, err := lp.FindLCA(ctx)
			if tc.ExpectedError != nil {
				require.ErrorContains(t, err, tc.ExpectedError.Error())
			} else {
				require.NotNil(t, result)
				require.Equal(t, result.BlockNumber, int64(tc.ExpectedBlockNumber), "expected block numbers to match")
			}
		})
	}
}

func TestWhere(t *testing.T) {
	address := common.HexToAddress("0x1234567890abcdef1234567890abcdef12345678")
	eventSig := common.HexToHash("0xabcdef1234567890abcdef1234567890abcdef1234")
	ts := time.Now()

	expr1 := logpoller.NewAddressFilter(address)
	expr2 := logpoller.NewEventSigFilter(eventSig)
	expr3 := query.Timestamp(uint64(ts.Unix()), primitives.Gte)
	expr4 := logpoller.NewConfirmationsFilter(evmtypes.Confirmations(0))

	t.Run("Valid combination of filters", func(t *testing.T) {
		result, err := logpoller.Where(expr1, expr2, expr3, expr4)
		require.NoError(t, err)
		assert.Equal(t, []query.Expression{expr1, expr2, expr3, expr4}, result)
	})

	t.Run("No expressions (should return empty slice)", func(t *testing.T) {
		result, err := logpoller.Where()
		require.NoError(t, err)
		assert.Equal(t, []query.Expression{}, result)
	})

	t.Run("Invalid boolean expression", func(t *testing.T) {
		invalidExpr := query.Expression{
			BoolExpression: query.BoolExpression{
				Expressions: []query.Expression{},
			},
		}

		result, err := logpoller.Where(invalidExpr)
		require.Error(t, err)
		assert.EqualError(t, err, "all boolean expressions should have at least 2 expressions")
		assert.Equal(t, []query.Expression{}, result)
	})
}
