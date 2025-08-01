package logpoller

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/binary"
	"errors"
	"fmt"
	"math/big"
	"math/rand/v2"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/rpc"
	pkgerrors "github.com/pkg/errors"
	"golang.org/x/exp/maps"

	"github.com/smartcontractkit/chainlink-common/pkg/logger"
	"github.com/smartcontractkit/chainlink-common/pkg/services"
	"github.com/smartcontractkit/chainlink-common/pkg/timeutil"
	commontypes "github.com/smartcontractkit/chainlink-common/pkg/types"
	"github.com/smartcontractkit/chainlink-common/pkg/types/query"
	"github.com/smartcontractkit/chainlink-common/pkg/utils/mathutil"

	"github.com/smartcontractkit/chainlink-evm/pkg/client"
	"github.com/smartcontractkit/chainlink-evm/pkg/config"
	evmtypes "github.com/smartcontractkit/chainlink-evm/pkg/types"
	ubig "github.com/smartcontractkit/chainlink-evm/pkg/utils/big"
)

type LogPoller interface {
	services.Service
	Healthy() error
	Replay(ctx context.Context, fromBlock int64) error
	ReplayAsync(fromBlock int64)
	RegisterFilter(ctx context.Context, filter Filter) error
	UnregisterFilter(ctx context.Context, name string) error
	HasFilter(name string) bool
	GetFilters() map[string]Filter
	LatestBlock(ctx context.Context) (Block, error)
	GetBlocksRange(ctx context.Context, numbers []uint64) ([]Block, error)
	FindLCA(ctx context.Context) (*Block, error)
	DeleteLogsAndBlocksAfter(ctx context.Context, start int64) error

	// General querying
	Logs(ctx context.Context, start, end int64, eventSig common.Hash, address common.Address) ([]Log, error)
	LogsWithSigs(ctx context.Context, start, end int64, eventSigs []common.Hash, address common.Address) ([]Log, error)
	LogsCreatedAfter(ctx context.Context, eventSig common.Hash, address common.Address, time time.Time, confs evmtypes.Confirmations) ([]Log, error)
	LatestLogByEventSigWithConfs(ctx context.Context, eventSig common.Hash, address common.Address, confs evmtypes.Confirmations) (*Log, error)
	LatestLogEventSigsAddrsWithConfs(ctx context.Context, fromBlock int64, eventSigs []common.Hash, addresses []common.Address, confs evmtypes.Confirmations) ([]Log, error)
	LatestBlockByEventSigsAddrsWithConfs(ctx context.Context, fromBlock int64, eventSigs []common.Hash, addresses []common.Address, confs evmtypes.Confirmations) (int64, error)

	// Content based querying
	IndexedLogs(ctx context.Context, eventSig common.Hash, address common.Address, topicIndex int, topicValues []common.Hash, confs evmtypes.Confirmations) ([]Log, error)
	IndexedLogsByBlockRange(ctx context.Context, start, end int64, eventSig common.Hash, address common.Address, topicIndex int, topicValues []common.Hash) ([]Log, error)
	IndexedLogsCreatedAfter(ctx context.Context, eventSig common.Hash, address common.Address, topicIndex int, topicValues []common.Hash, after time.Time, confs evmtypes.Confirmations) ([]Log, error)
	IndexedLogsByTxHash(ctx context.Context, eventSig common.Hash, address common.Address, txHash common.Hash) ([]Log, error)
	IndexedLogsTopicGreaterThan(ctx context.Context, eventSig common.Hash, address common.Address, topicIndex int, topicValueMin common.Hash, confs evmtypes.Confirmations) ([]Log, error)
	IndexedLogsTopicRange(ctx context.Context, eventSig common.Hash, address common.Address, topicIndex int, topicValueMin common.Hash, topicValueMax common.Hash, confs evmtypes.Confirmations) ([]Log, error)
	IndexedLogsWithSigsExcluding(ctx context.Context, address common.Address, eventSigA, eventSigB common.Hash, topicIndex int, fromBlock, toBlock int64, confs evmtypes.Confirmations) ([]Log, error)
	LogsDataWordRange(ctx context.Context, eventSig common.Hash, address common.Address, wordIndex int, wordValueMin, wordValueMax common.Hash, confs evmtypes.Confirmations) ([]Log, error)
	LogsDataWordGreaterThan(ctx context.Context, eventSig common.Hash, address common.Address, wordIndex int, wordValueMin common.Hash, confs evmtypes.Confirmations) ([]Log, error)
	LogsDataWordBetween(ctx context.Context, eventSig common.Hash, address common.Address, wordIndexMin, wordIndexMax int, wordValue common.Hash, confs evmtypes.Confirmations) ([]Log, error)

	// chainlink-common query filtering
	FilteredLogs(ctx context.Context, filter []query.Expression, limitAndSort query.LimitAndSort, queryName string) ([]Log, error)
}

type LogPollerTest interface {
	LogPoller
	PollAndSaveLogs(ctx context.Context, currentBlockNumber int64)
	BackupPollAndSaveLogs(ctx context.Context) error
	Filter(from, to *big.Int, bh *common.Hash) ethereum.FilterQuery
	GetReplayFromBlock(ctx context.Context, requested int64) (int64, error)
	PruneOldBlocks(ctx context.Context) (bool, error)
}

type Client interface {
	HeadByNumber(ctx context.Context, n *big.Int) (*evmtypes.Head, error)
	HeadByHash(ctx context.Context, n common.Hash) (*evmtypes.Head, error)
	BatchCallContext(ctx context.Context, b []rpc.BatchElem) error
	FilterLogs(ctx context.Context, q ethereum.FilterQuery) ([]types.Log, error)
	ConfiguredChainID() *big.Int
}

type HeadTracker interface {
	services.Service
	LatestAndFinalizedBlock(ctx context.Context) (latest, finalized *evmtypes.Head, err error)
}

var (
	_                       LogPollerTest = &logPoller{}
	ErrReplayRequestAborted               = pkgerrors.New("aborted, replay request cancelled")
	ErrReplayInProgress                   = pkgerrors.New("replay request cancelled, but replay is already in progress")
	ErrLogPollerShutdown                  = pkgerrors.New("replay aborted due to log poller shutdown")
)

type logPoller struct {
	services.StateMachine
	ec                       Client
	orm                      ORM
	headTracker              HeadTracker
	latencyMonitor           LatencyMonitor
	lggr                     logger.SugaredLogger
	pollPeriod               time.Duration // poll period set by block production rate
	useFinalityTag           bool          // indicates whether logPoller should use chain's finality or pick a fixed depth for finality
	finalityDepth            int64         // finality depth is taken to mean that block (head - finality) is finalized. If `useFinalityTag` is set to true, this value is ignored, because finalityDepth is fetched from chain
	keepFinalizedBlocksDepth int64         // the number of blocks behind the last finalized block we keep in database
	backfillBatchSize        int64         // batch size to use when backfilling finalized logs
	rpcBatchSize             int64         // batch size to use for fallback RPC calls made in GetBlocks
	logPrunePageSize         int64
	clientErrors             config.ClientErrors
	backupPollerNextBlock    int64 // next block to be processed by Backup LogPoller
	backupPollerBlockDelay   int64 // how far behind regular LogPoller should BackupLogPoller run. 0 = disabled

	filterMu        sync.RWMutex
	filters         map[string]Filter
	filterDirty     bool
	cachedAddresses []common.Address
	cachedEventSigs []common.Hash

	replayStart    chan int64
	replayComplete chan error
	stopCh         services.StopChan
	wg             sync.WaitGroup
	// This flag is raised whenever the log poller detects that the chain's finality has been violated.
	// It can happen when reorg is deeper than the latest finalized block that LogPoller saw in a previous PollAndSave tick.
	// Usually the only way to recover is to manually remove the offending logs and block from the database.
	// LogPoller keeps running in infinite loop, so whenever the invalid state is removed from the database it should
	// recover automatically without needing to restart the LogPoller.
	finalityViolated           atomic.Bool
	missingBlocksErrorCount    atomic.Uint64
	countBasedLogPruningActive atomic.Bool
}

type Opts struct {
	PollPeriod               time.Duration
	UseFinalityTag           bool
	FinalityDepth            int64
	BackfillBatchSize        int64
	RPCBatchSize             int64
	KeepFinalizedBlocksDepth int64
	BackupPollerBlockDelay   int64
	LogPrunePageSize         int64
	ClientErrors             config.ClientErrors
}

// NewLogPoller creates a log poller. Note there is an assumption
// that blocks can be processed faster than they are produced for the given chain, or the poller will fall behind.
// Block processing involves the following calls in steady state (without reorgs):
//   - eth_getBlockByNumber - headers only (transaction hashes, not full transaction objects),
//   - eth_getLogs - get the logs for the block
//   - 1 db read latest block - for checking reorgs
//   - 1 db tx including block write and logs write to logs.
//
// How fast that can be done depends largely on network speed and DB, but even for the fastest
// support chain, polygon, which has 2s block times, we need RPCs roughly with <= 500ms latency
func NewLogPoller(orm ORM, ec Client, lggr logger.Logger, headTracker HeadTracker, opts Opts) *logPoller {
	return &logPoller{
		stopCh:                   make(chan struct{}),
		ec:                       ec,
		orm:                      orm,
		headTracker:              headTracker,
		latencyMonitor:           NewLatencyMonitor(ec, lggr, opts.PollPeriod),
		lggr:                     logger.Sugared(logger.Named(lggr, "LogPoller")),
		replayStart:              make(chan int64),
		replayComplete:           make(chan error),
		pollPeriod:               opts.PollPeriod,
		backupPollerBlockDelay:   opts.BackupPollerBlockDelay,
		finalityDepth:            opts.FinalityDepth,
		useFinalityTag:           opts.UseFinalityTag,
		backfillBatchSize:        opts.BackfillBatchSize,
		rpcBatchSize:             opts.RPCBatchSize,
		keepFinalizedBlocksDepth: opts.KeepFinalizedBlocksDepth,
		logPrunePageSize:         opts.LogPrunePageSize,
		clientErrors:             opts.ClientErrors,
		filters:                  make(map[string]Filter),
		filterDirty:              true, // Always build Filter on first call to cache an empty filter if nothing registered yet.
	}
}

type Filter struct {
	Name         string // see FilterName(id, args) below
	Addresses    evmtypes.AddressArray
	EventSigs    evmtypes.HashArray // list of possible values for eventsig (aka topic1)
	Topic2       evmtypes.HashArray // list of possible values for topic2
	Topic3       evmtypes.HashArray // list of possible values for topic3
	Topic4       evmtypes.HashArray // list of possible values for topic4
	Retention    time.Duration      // maximum amount of time to retain logs
	MaxLogsKept  uint64             // maximum number of logs to retain ( 0 = unlimited )
	LogsPerBlock uint64             // rate limit ( maximum # of logs per block, 0 = unlimited )
}

// FilterName is a suggested convenience function for clients to construct unique filter names
// to populate Name field of struct Filter
func FilterName(id string, args ...any) string {
	if len(args) == 0 {
		return id
	}
	s := &strings.Builder{}
	s.WriteString(id)
	s.WriteString(" - ")
	fmt.Fprintf(s, "%s", args[0])
	for _, a := range args[1:] {
		fmt.Fprintf(s, ":%s", a)
	}
	return s.String()
}

// Contains returns true if this filter already fully Contains a
// filter passed to it.
func (filter *Filter) Contains(other *Filter) bool {
	if other == nil {
		return true
	}
	if other.Retention != filter.Retention {
		return false
	}
	if other.MaxLogsKept != filter.MaxLogsKept {
		return false
	}
	addresses := make(map[common.Address]interface{})
	for _, addr := range filter.Addresses {
		addresses[addr] = struct{}{}
	}
	events := make(map[common.Hash]interface{})
	for _, ev := range filter.EventSigs {
		events[ev] = struct{}{}
	}

	for _, addr := range other.Addresses {
		if _, ok := addresses[addr]; !ok {
			return false
		}
	}
	for _, ev := range other.EventSigs {
		if _, ok := events[ev]; !ok {
			return false
		}
	}
	return true
}

// RegisterFilter adds the provided EventSigs and Addresses to the log poller's log filter query.
// If any eventSig is emitted from any address, it will be captured by the log poller.
// If an event matching any of the given event signatures is emitted from any of the provided Addresses,
// the log poller will pick those up and save them. For topic specific queries see content based querying.
// Clients may choose to MergeFilter and then Replay in order to ensure desired logs are present.
// NOTE: due to constraints of the eth filter, there is "leakage" between successive MergeFilter calls, for example
//
//	RegisterFilter(event1, addr1)
//	RegisterFilter(event2, addr2)
//
// will result in the poller saving (event1, addr2) or (event2, addr1) as well, should it exist.
// Generally speaking this is harmless. We enforce that EventSigs and Addresses are non-empty,
// which means that anonymous events are not supported and log.Topics >= 1 always (log.Topics[0] is the event signature).
// The filter may be unregistered later by Filter.Name
// Warnings/debug information is keyed by filter name.
func (lp *logPoller) RegisterFilter(ctx context.Context, filter Filter) error {
	if len(filter.Addresses) == 0 {
		return pkgerrors.Errorf("at least one address must be specified")
	}
	if len(filter.EventSigs) == 0 {
		return pkgerrors.Errorf("at least one event must be specified")
	}

	for _, eventSig := range filter.EventSigs {
		if eventSig == [common.HashLength]byte{} {
			return pkgerrors.Errorf("empty event sig")
		}
	}
	for _, addr := range filter.Addresses {
		if addr == [common.AddressLength]byte{} {
			return pkgerrors.Errorf("empty address")
		}
	}

	lp.filterMu.Lock()
	defer lp.filterMu.Unlock()

	if existingFilter, ok := lp.filters[filter.Name]; ok {
		if existingFilter.Contains(&filter) {
			// Nothing new in this Filter
			lp.lggr.Warnw("Filter already present, no-op", "name", filter.Name, "filter", filter)
			return nil
		}
		lp.lggr.Warnw("Updating existing filter", "name", filter.Name, "filter", filter)
	}

	if err := lp.orm.InsertFilter(ctx, filter); err != nil {
		return pkgerrors.Wrap(err, "error inserting filter")
	}
	lp.filters[filter.Name] = filter
	lp.filterDirty = true
	if filter.MaxLogsKept > 0 {
		lp.countBasedLogPruningActive.Store(true)
	}
	return nil
}

// UnregisterFilter will remove the filter with the given name.
// If the name does not exist, it will log an error but not return an error.
// Warnings/debug information is keyed by filter name.
func (lp *logPoller) UnregisterFilter(ctx context.Context, name string) error {
	lp.filterMu.Lock()
	defer lp.filterMu.Unlock()

	_, ok := lp.filters[name]
	if !ok {
		lp.lggr.Warnw("Filter not found", "name", name)
		return nil
	}

	if err := lp.orm.DeleteFilter(ctx, name); err != nil {
		return pkgerrors.Wrap(err, "error deleting filter")
	}
	delete(lp.filters, name)
	lp.filterDirty = true
	return nil
}

// HasFilter returns true if the log poller has an active filter with the given name.
func (lp *logPoller) HasFilter(name string) bool {
	lp.filterMu.RLock()
	defer lp.filterMu.RUnlock()

	_, ok := lp.filters[name]
	return ok
}

// GetFilters returns a deep copy of the filters map.
func (lp *logPoller) GetFilters() map[string]Filter {
	lp.filterMu.RLock()
	defer lp.filterMu.RUnlock()

	filters := make(map[string]Filter)
	for k, v := range lp.filters {
		deepCopyFilter := Filter{
			Name:         v.Name,
			Addresses:    make(evmtypes.AddressArray, len(v.Addresses)),
			EventSigs:    make(evmtypes.HashArray, len(v.EventSigs)),
			Topic2:       make(evmtypes.HashArray, len(v.Topic2)),
			Topic3:       make(evmtypes.HashArray, len(v.Topic3)),
			Topic4:       make(evmtypes.HashArray, len(v.Topic4)),
			Retention:    v.Retention,
			MaxLogsKept:  v.MaxLogsKept,
			LogsPerBlock: v.LogsPerBlock,
		}
		copy(deepCopyFilter.Addresses, v.Addresses)
		copy(deepCopyFilter.EventSigs, v.EventSigs)
		copy(deepCopyFilter.Topic2, v.Topic2)
		copy(deepCopyFilter.Topic3, v.Topic3)
		copy(deepCopyFilter.Topic4, v.Topic4)

		filters[k] = deepCopyFilter
	}
	return filters
}

func (lp *logPoller) Filter(from, to *big.Int, bh *common.Hash) ethereum.FilterQuery {
	lp.filterMu.Lock()
	defer lp.filterMu.Unlock()
	if !lp.filterDirty {
		return ethereum.FilterQuery{FromBlock: from, ToBlock: to, BlockHash: bh, Topics: [][]common.Hash{lp.cachedEventSigs}, Addresses: lp.cachedAddresses}
	}
	var (
		addressMp  = make(map[common.Address]struct{})
		eventSigMp = make(map[common.Hash]struct{})
	)
	// Merge filters.
	for _, filter := range lp.filters {
		for _, addr := range filter.Addresses {
			addressMp[addr] = struct{}{}
		}
		for _, eventSig := range filter.EventSigs {
			eventSigMp[eventSig] = struct{}{}
		}
	}
	addresses := make([]common.Address, 0, len(addressMp))
	for addr := range addressMp {
		addresses = append(addresses, addr)
	}
	sort.Slice(addresses, func(i, j int) bool {
		return bytes.Compare(addresses[i][:], addresses[j][:]) < 0
	})
	eventSigs := make([]common.Hash, 0, len(eventSigMp))
	for eventSig := range eventSigMp {
		eventSigs = append(eventSigs, eventSig)
	}
	sort.Slice(eventSigs, func(i, j int) bool {
		return bytes.Compare(eventSigs[i][:], eventSigs[j][:]) < 0
	})
	if len(eventSigs) == 0 && len(addresses) == 0 {
		// If no filter specified, ignore everything.
		// This allows us to keep the log poller up and running with no filters present (e.g. no jobs on the node),
		// then as jobs are added dynamically start using their filters.
		addresses = []common.Address{common.HexToAddress("0x0000000000000000000000000000000000000000")}
		eventSigs = []common.Hash{}
	}
	lp.cachedAddresses = addresses
	lp.cachedEventSigs = eventSigs
	lp.filterDirty = false
	return ethereum.FilterQuery{FromBlock: from, ToBlock: to, BlockHash: bh, Topics: [][]common.Hash{eventSigs}, Addresses: addresses}
}

// Replay signals that the poller should resume from a new block.
// Blocks until the replay is complete.
// Replay can be used to ensure that filter modification has been applied for all blocks from "fromBlock" up to latest.
// If ctx is cancelled before the replay request has been initiated, ErrReplayRequestAborted is returned.  If the replay
// is already in progress, the replay will continue and ErrReplayInProgress will be returned.  If the client needs a
// guarantee that the replay is complete before proceeding, it should either avoid cancelling or retry until nil is returned
func (lp *logPoller) Replay(ctx context.Context, fromBlock int64) (err error) {
	defer func() {
		if errors.Is(err, context.Canceled) {
			err = ErrReplayRequestAborted
		} else if errors.Is(err, commontypes.ErrFinalityViolated) {
			// Replay only declares finality violation and does not resolve it, as it's possible that [fromBlock, savedFinalizedBlockNumber]
			// does not contain the violation.
			lp.lggr.Criticalw("Replay failed due to finality violation", "fromBlock", fromBlock, "err", err)
			lp.finalityViolated.Store(true)
			lp.SvcErrBuffer.Append(err)
		}
	}()

	lp.lggr.Debugf("Replaying from block %d", fromBlock)
	latest, err := lp.latencyMonitor.HeadByNumber(ctx, nil)
	if err != nil {
		return err
	}
	if fromBlock < 1 || fromBlock > latest.Number {
		return pkgerrors.Errorf("Invalid replay block number %v, acceptable range [1, %v]", fromBlock, latest.Number)
	}

	// Backfill all logs up to the latest saved finalized block outside the LogPoller's main loop.
	// This is safe, because chain cannot be rewinded deeper than that, so there must not be any race conditions.
	savedFinalizedBlockNumber, err := lp.savedFinalizedBlockNumber(ctx)
	if err != nil {
		return err
	}
	if fromBlock <= savedFinalizedBlockNumber {
		err = lp.backfill(ctx, fromBlock, savedFinalizedBlockNumber)
		if err != nil {
			return err
		}
	}

	// Poll everything after latest finalized block in main loop to avoid concurrent writes during reorg
	// We assume that number of logs between saved finalized block and current head is small enough to be processed in main loop
	fromBlock = mathutil.Max(fromBlock, savedFinalizedBlockNumber+1)
	// Don't continue if latest block number is the same as saved finalized block number
	if fromBlock > latest.Number {
		return nil
	}
	// Block until replay notification accepted or cancelled.
	select {
	case lp.replayStart <- fromBlock:
	case <-ctx.Done():
		return pkgerrors.Wrap(ErrReplayRequestAborted, ctx.Err().Error())
	}
	// Block until replay complete or cancelled.
	select {
	case err = <-lp.replayComplete:
		return err
	case <-ctx.Done():
		// Note: this will not abort the actual replay, it just means the client gave up on waiting for it to complete
		lp.wg.Add(1)
		go lp.recvReplayComplete()
		return ErrReplayInProgress
	}
}

// savedFinalizedBlockNumber returns the FinalizedBlockNumber saved with the last processed block in the db
// (latestFinalizedBlock at the time the last processed block was saved)
// If this is the first poll and no blocks are in the db, it returns 0
func (lp *logPoller) savedFinalizedBlockNumber(ctx context.Context) (int64, error) {
	latestProcessed, err := lp.LatestBlock(ctx)
	if err == nil {
		return latestProcessed.FinalizedBlockNumber, nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	return 0, err
}

func (lp *logPoller) recvReplayComplete() {
	defer lp.wg.Done()
	err := <-lp.replayComplete
	if err != nil {
		lp.lggr.Error(err)
	}
}

// Asynchronous wrapper for Replay()
func (lp *logPoller) ReplayAsync(fromBlock int64) {
	lp.wg.Add(1)
	go func() {
		defer lp.wg.Done()
		ctx, cancel := lp.stopCh.NewCtx()
		defer cancel()
		if err := lp.Replay(ctx, fromBlock); err != nil {
			lp.lggr.Error(err)
		}
	}()
}

func (lp *logPoller) Start(context.Context) error {
	return lp.StartOnce("LogPoller", func() error {
		lp.wg.Add(2)
		go lp.run()
		go lp.backgroundWorkerRun()
		return nil
	})
}

func (lp *logPoller) Close() error {
	return lp.StopOnce("LogPoller", func() error {
		select {
		case lp.replayComplete <- ErrLogPollerShutdown:
		default:
		}
		close(lp.stopCh)
		lp.wg.Wait()
		return nil
	})
}

func (lp *logPoller) Healthy() error {
	if lp.finalityViolated.Load() {
		return commontypes.ErrFinalityViolated
	}
	if errCount := lp.missingBlocksErrorCount.Load(); errCount > 2 {
		return pkgerrors.Errorf("rpc servers reported missing blocks %d times in a row", errCount)
	}
	return nil
}

func (lp *logPoller) Name() string {
	return lp.lggr.Name()
}

func (lp *logPoller) HealthReport() map[string]error {
	return map[string]error{lp.Name(): lp.Healthy()}
}

func (lp *logPoller) GetReplayFromBlock(ctx context.Context, requested int64) (int64, error) {
	lastProcessed, err := lp.orm.SelectLatestBlock(ctx)
	if err != nil {
		if !pkgerrors.Is(err, sql.ErrNoRows) {
			// Real DB error
			return 0, err
		}
		// Nothing in db, use requested
		return requested, nil
	}
	// We have lastProcessed, take min(requested, lastProcessed).
	// This is to avoid replaying from a block later than what we have in the DB
	// and skipping blocks.
	return mathutil.Min(requested, lastProcessed.BlockNumber), nil
}

// loadFilters loads the filters from db, and activates count-based Log Pruning
// if required by any of the filters
func (lp *logPoller) loadFilters(ctx context.Context) error {
	filters, err := lp.lockAndLoadFilters(ctx)
	if err != nil {
		return pkgerrors.Wrapf(err, "Failed to load initial filters from db, retrying")
	}
	if lp.countBasedLogPruningActive.Load() {
		return nil
	}
	for _, filter := range filters {
		if filter.MaxLogsKept != 0 {
			lp.countBasedLogPruningActive.Store(true)
			return nil
		}
	}
	return nil
}

// lockAndLoadFilters is the part of loadFilters() requiring a filterMu lock
func (lp *logPoller) lockAndLoadFilters(ctx context.Context) (filters map[string]Filter, err error) {
	lp.filterMu.Lock()
	defer lp.filterMu.Unlock()

	filters, err = lp.orm.LoadFilters(ctx)
	if err != nil {
		return filters, err
	}

	lp.filters = filters
	lp.filterDirty = true
	return filters, nil
}

// tickStaggeredDelay chooses a uniformly random amount of time to delay between minDelay and minDelay + period
func tickStaggeredDelay(minDelay time.Duration, period time.Duration) <-chan time.Time {
	return time.After(minDelay + timeutil.JitterPct(1.0).Apply(period/2))
}

func tickWithDefaultJitter(interval time.Duration) <-chan time.Time {
	return time.After(services.DefaultJitter.Apply(interval))
}

func (lp *logPoller) run() {
	defer lp.wg.Done()
	ctx, cancel := lp.stopCh.NewCtx()
	defer cancel()
	logPollTicker := services.NewTicker(lp.pollPeriod)
	defer logPollTicker.Stop()
	// stagger these somewhat, so they don't all run back-to-back
	backupLogPollTicker := services.TickerConfig{
		Initial:   100 * time.Millisecond,
		JitterPct: services.DefaultJitter,
	}.NewTicker(time.Duration(lp.backupPollerBlockDelay) * lp.pollPeriod)
	defer backupLogPollTicker.Stop()
	filtersLoaded := false

	for {
		select {
		case <-ctx.Done():
			return
		case fromBlockReq := <-lp.replayStart:
			lp.handleReplayRequest(ctx, fromBlockReq, filtersLoaded)
		case <-logPollTicker.C:
			if !filtersLoaded {
				if err := lp.loadFilters(ctx); err != nil {
					lp.lggr.Errorw("Failed loading filters in main logpoller loop, retrying later", "err", err)
					continue
				}
				filtersLoaded = true
			}

			// Always start from the latest block in the db.
			var start int64
			lastProcessed, err := lp.orm.SelectLatestBlock(ctx)
			if err != nil {
				if !pkgerrors.Is(err, sql.ErrNoRows) {
					// Assume transient db reading issue, retry forever.
					lp.lggr.Errorw("unable to get starting block", "err", err)
					continue
				}
				// Otherwise this is the first poll _ever_ on a new chain.
				// Only safe thing to do is to start at the first finalized block.
				_, latestFinalizedBlockNumber, err := lp.latestBlocks(ctx)
				if err != nil {
					lp.lggr.Warnw("Unable to get latest for first poll", "err", err)
					continue
				}
				// Starting at the first finalized block. We do not backfill the first finalized block.
				start = latestFinalizedBlockNumber
			} else {
				start = lastProcessed.BlockNumber + 1
			}
			lp.PollAndSaveLogs(ctx, start)
		case <-backupLogPollTicker.C:
			if lp.backupPollerBlockDelay == 0 {
				continue // backup poller is disabled
			}
			// Backup log poller:  this serves as an emergency backup to protect against eventual-consistency behavior
			// of an rpc node (seen occasionally on optimism, but possibly could happen on other chains?).  If the first
			// time we request a block, no logs or incomplete logs come back, this ensures that every log is eventually
			// re-requested after it is finalized. This doesn't add much overhead, because we can request all of them
			// in one shot, since we don't need to worry about re-orgs after finality depth, and it runs far less
			// frequently than the primary log poller (instead of roughly once per block it runs once roughly once every
			// lp.backupPollerDelay blocks--with default settings about 100x less frequently).

			if !filtersLoaded {
				lp.lggr.Warnw("Backup log poller ran before filters loaded, skipping")
				continue
			}
			err := lp.BackupPollAndSaveLogs(ctx)
			switch {
			case errors.Is(err, commontypes.ErrFinalityViolated):
				// BackupPoll only declares finality violation and does not resolve it, as it's possible that processed range
				// does not contain the violation.
				lp.lggr.Criticalw("Backup poll failed due to finality violation", "err", err)
				lp.finalityViolated.Store(true)
				lp.SvcErrBuffer.Append(err)
			case err != nil:
				lp.lggr.Errorw("Backup poller failed, retrying later", "err", err)
			}
		}
	}
}

func (lp *logPoller) backgroundWorkerRun() {
	defer lp.wg.Done()
	ctx, cancel := lp.stopCh.NewCtx()
	defer cancel()

	blockPruneShortInterval := lp.pollPeriod * 100
	blockPruneInterval := blockPruneShortInterval * 10
	logPruneShortInterval := lp.pollPeriod * 241 // no common factors with 100
	logPruneInterval := logPruneShortInterval * 10

	// Avoid putting too much pressure on the database by staggering the pruning of old blocks and logs.
	// Usually, node after restart will have some work to boot the plugins and other services.
	// Deferring first prune by at least 5 mins reduces risk of putting too much pressure on the database.
	blockPruneTick := tickStaggeredDelay(5*time.Minute, blockPruneInterval)
	logPruneTick := tickStaggeredDelay(5*time.Minute, logPruneInterval)

	// Start initial prune of unmatched logs after 5-15 successful expired log prunes, so that not all chains start
	// around the same time. After that, every 20 successful expired log prunes.
	successfulExpiredLogPrunes := 5 + rand.IntN(10) //nolint:gosec // G404

	for {
		select {
		case <-ctx.Done():
			return
		case <-blockPruneTick:
			lp.lggr.Infow("pruning old blocks")
			blockPruneTick = tickWithDefaultJitter(blockPruneInterval)
			if allRemoved, err := lp.PruneOldBlocks(ctx); err != nil {
				lp.lggr.Errorw("unable to prune old blocks", "err", err)
			} else if !allRemoved {
				// Tick faster when cleanup can't keep up with the pace of new blocks
				blockPruneTick = tickWithDefaultJitter(blockPruneShortInterval)
				lp.lggr.Warnw("reached page limit while pruning old blocks")
			} else {
				lp.lggr.Debugw("finished pruning old blocks")
			}
		case <-logPruneTick:
			logPruneTick = tickWithDefaultJitter(logPruneInterval)
			lp.lggr.Infof("pruning expired logs")
			if allRemoved, err := lp.PruneExpiredLogs(ctx); err != nil {
				lp.lggr.Errorw("unable to prune expired logs", "err", err)
			} else if !allRemoved {
				lp.lggr.Warnw("reached page limit while pruning expired logs")
				// Tick faster when cleanup can't keep up with the pace of new logs
				logPruneTick = tickWithDefaultJitter(logPruneShortInterval)
			} else if successfulExpiredLogPrunes >= 20 {
				// Only prune unmatched logs if we've successfully pruned all expired logs at least 20 times
				// since the last time unmatched logs were pruned
				lp.lggr.Infof("finished pruning expired logs: pruning unmatched logs")
				if allRemoved, err := lp.PruneUnmatchedLogs(ctx); err != nil {
					lp.lggr.Errorw("unable to prune unmatched logs", "err", err)
				} else if !allRemoved {
					lp.lggr.Warnw("reached page limit while pruning unmatched logs")
					logPruneTick = tickWithDefaultJitter(logPruneShortInterval)
				} else {
					lp.lggr.Debugw("finished pruning unmatched logs")
					successfulExpiredLogPrunes = 0
				}
			} else {
				lp.lggr.Debugw("finished pruning expired logs")
				successfulExpiredLogPrunes++
			}
		}
	}
}

func (lp *logPoller) handleReplayRequest(ctx context.Context, fromBlockReq int64, filtersLoaded bool) {
	fromBlock, err := lp.GetReplayFromBlock(ctx, fromBlockReq)
	if err == nil {
		if !filtersLoaded {
			lp.lggr.Warnw("Received replayReq before filters loaded", "fromBlock", fromBlock, "requested", fromBlockReq)
			if err = lp.loadFilters(ctx); err != nil {
				lp.lggr.Errorw("Failed loading filters during Replay", "err", err, "fromBlock", fromBlock)
			}
		}
		if err == nil {
			// Serially process replay requests.
			lp.lggr.Infow("Executing replay", "fromBlock", fromBlock, "requested", fromBlockReq)
			lp.PollAndSaveLogs(ctx, fromBlock)
			lp.lggr.Infow("Executing replay finished", "fromBlock", fromBlock, "requested", fromBlockReq)
		}
	} else {
		lp.lggr.Errorw("Error executing replay, could not get fromBlock", "err", err)
	}
	select {
	case <-ctx.Done():
		// We're shutting down, notify client and exit
		select {
		case lp.replayComplete <- ErrReplayRequestAborted:
		default:
		}
		return
	case lp.replayComplete <- err:
	}
}

func (lp *logPoller) BackupPollAndSaveLogs(ctx context.Context) error {
	if lp.backupPollerNextBlock == 0 {
		lastProcessed, err := lp.orm.SelectLatestBlock(ctx)
		if err != nil {
			if pkgerrors.Is(err, sql.ErrNoRows) {
				lp.lggr.Warnw("Backup log poller ran before first successful log poller run, skipping")
				return nil
			}

			return fmt.Errorf("unable to get starting block: %w", err)
		}
		// If this is our first run, start from block min(lastProcessed.FinalizedBlockNumber, lastProcessed.BlockNumber-backupPollerBlockDelay)
		backupStartBlock := mathutil.Min(lastProcessed.FinalizedBlockNumber, lastProcessed.BlockNumber-lp.backupPollerBlockDelay)
		// (or at block 0 if whole blockchain is too short)
		lp.backupPollerNextBlock = mathutil.Max(backupStartBlock, 0)
	}

	_, latestFinalizedBlockNumber, err := lp.latestBlocks(ctx)
	if err != nil {
		lp.lggr.Warnw("Backup logpoller failed to get latest block", "err", err)
		return nil
	}

	lastSafeBackfillBlock := latestFinalizedBlockNumber - 1
	if lastSafeBackfillBlock >= lp.backupPollerNextBlock {
		lp.lggr.Infow("Backup poller started backfilling logs", "start", lp.backupPollerNextBlock, "end", lastSafeBackfillBlock)
		if err = lp.backfill(ctx, lp.backupPollerNextBlock, lastSafeBackfillBlock); err != nil {
			// If there's an error backfilling, we can just return and retry from the last block saved
			// since we don't save any blocks on backfilling. We may re-insert the same logs but thats ok.
			return fmt.Errorf("backfill failed: %w", err)
		}
		lp.lggr.Infow("Backup poller finished backfilling", "start", lp.backupPollerNextBlock, "end", lastSafeBackfillBlock)
		lp.backupPollerNextBlock = lastSafeBackfillBlock + 1
	}

	return nil
}

// convertLogs converts an array of geth logs ([]type.Log) to an array of logpoller logs ([]Log)
//
//	Block timestamps are extracted from blocks param.  If len(blocks) == 1, the same timestamp from this block
//	will be used for all logs.  If len(blocks) == len(logs) then the block number of each block is used for the
//	corresponding log.  Any other length for blocks is invalid.
func convertLogs(logs []types.Log, blocks []Block, lggr logger.Logger, chainID *big.Int) []Log {
	blockTimestamp := time.Now()
	if len(logs) == 0 {
		return []Log{}
	}
	if len(blocks) != 1 && len(blocks) != len(logs) {
		lggr.Errorw("AssumptionViolation:  invalid params passed to convertLogs, length of blocks must either be 1 or match length of logs", "len", len(blocks))
		return []Log{}
	}

	lgs := make([]Log, 0, len(logs))
	for i, l := range logs {
		if i == 0 || len(blocks) == len(logs) {
			blockTimestamp = blocks[i].BlockTimestamp
		}
		lgs = append(lgs, Log{
			EVMChainID: ubig.New(chainID),
			LogIndex:   int64(l.Index),
			BlockHash:  l.BlockHash,
			// We assume block numbers fit in int64
			// in many places.
			BlockNumber:    int64(l.BlockNumber),
			BlockTimestamp: blockTimestamp,
			EventSig:       l.Topics[0], // First topic is always event signature.
			Topics:         convertTopics(l.Topics),
			Address:        l.Address,
			TxHash:         l.TxHash,
			Data:           l.Data,
		})
	}
	return lgs
}

func convertTopics(topics []common.Hash) [][]byte {
	topicsForDB := make([][]byte, 0, len(topics))
	for _, t := range topics {
		topicsForDB = append(topicsForDB, t.Bytes())
	}
	return topicsForDB
}

// blocksFromFinalizedLogs fetches all of the blocks associated with a given list of logs. It will also unconditionally fetch endBlockNumber,
// whether or not there are any logs in the list from that block
func (lp *logPoller) blocksFromFinalizedLogs(ctx context.Context, logs []types.Log, endBlockNumber uint64) (blocks []Block, err error) {
	numbers := make([]uint64, 0, len(logs))
	for _, log := range logs {
		numbers = append(numbers, log.BlockNumber)
	}
	if len(numbers) == 0 || numbers[len(numbers)-1] != endBlockNumber {
		numbers = append(numbers, endBlockNumber)
	}
	blocks, err = lp.GetBlocksRange(ctx, numbers)
	if err != nil {
		return nil, err
	}

	for i, log := range logs {
		if log.BlockHash != blocks[i].BlockHash {
			return nil, fmt.Errorf("finalized log produced by tx %s has block hash %s that does not match fetched block's hash %s: %w", log.TxHash, log.BlockHash, blocks[i].BlockHash, commontypes.ErrFinalityViolated)
		}
	}

	return blocks, nil
}

// backfill will query FilterLogs in batches for logs in the
// block range [start, end] and save them to the db.
func (lp *logPoller) backfill(ctx context.Context, start, end int64) error {
	batchSize := lp.backfillBatchSize
	for from := start; from <= end; from += batchSize {
		to := mathutil.Min(from+batchSize-1, end)

		gethLogs, err := lp.latencyMonitor.FilterLogs(ctx, lp.Filter(big.NewInt(from), big.NewInt(to), nil))
		if err != nil {
			if client.IsMissingBlocks(err, lp.clientErrors) {
				errCount := lp.missingBlocksErrorCount.Add(1)
				if errCount < 2 {
					lp.lggr.Errorw("Missing blocks", "err", err, "from", from, "to", to)
					return err
				}
				lp.lggr.Criticalw("Missing blocks: cannot continue until at least one rpc server we're connected to has the logs for these blocks", "err", err, "from", from, "to", to)
				lp.SvcErrBuffer.Append(err)
				return err
			}
			if !client.IsTooManyResults(err, lp.clientErrors) {
				lp.lggr.Errorw("Unable to query for logs", "err", err, "from", from, "to", to)
				return err
			}

			if batchSize == 1 {
				lp.lggr.Criticalw("Too many log results in a single block, failed to retrieve logs! Node may be running in a degraded state.", "err", err, "from", from, "to", to, "LogBackfillBatchSize", lp.backfillBatchSize)
				return err
			}
			batchSize /= 2
			lp.lggr.Warnw("Too many log results, halving block range batch size.  Consider increasing LogBackfillBatchSize if this happens frequently", "err", err, "from", from, "to", to, "newBatchSize", batchSize, "LogBackfillBatchSize", lp.backfillBatchSize)
			from -= batchSize // counteract +=batchSize on next loop iteration, so starting block does not change
			continue
		}
		lp.missingBlocksErrorCount.Store(0) // clear unhealthy node state in case we were missing blocks and just found them

		blocks, err := lp.blocksFromFinalizedLogs(ctx, gethLogs, uint64(to)) //nolint:gosec // G115
		if err != nil {
			return err
		}

		endblock := blocks[len(blocks)-1]
		if len(gethLogs) == 0 || gethLogs[len(gethLogs)-1].BlockNumber != uint64(to) { //nolint:gosec // G115
			// Pop endblock if there were no logs for it, so that length of blocks & gethLogs are the same to pass to convertLogs
			blocks = blocks[:len(blocks)-1]
		}

		lp.lggr.Debugw("Inserting backfilled logs with batch endblock", "from", from, "to", to, "logs", len(gethLogs), "blocks", blocks)
		err = lp.orm.InsertLogsWithBlock(ctx, convertLogs(gethLogs, blocks, lp.lggr, lp.ec.ConfiguredChainID()), endblock)
		if err != nil {
			lp.lggr.Warnw("Unable to insert logs, retrying", "err", err, "from", from, "to", to)
			return err
		}
	}
	return nil
}

// getCurrentBlockMaybeHandleReorg accepts a block number
// and will return that block if its parent points to our last saved block.
// One can optionally pass the block header if it has already been queried to avoid an extra RPC call.
// If its parent does not point to our last saved block we know a reorg has occurred,
// so we:
// 1. Find the LCA by following parent hashes.
// 2. Delete all logs and blocks after the LCA
// 3. Return the LCA+1, i.e. our new current (unprocessed) block.
func (lp *logPoller) getCurrentBlockMaybeHandleReorg(ctx context.Context, currentBlockNumber int64, currentBlock *evmtypes.Head) (head *evmtypes.Head, err error) {
	var err1 error
	if currentBlock == nil {
		// If we don't have the current block already, lets get it.
		currentBlock, err1 = lp.latencyMonitor.HeadByNumber(ctx, big.NewInt(currentBlockNumber))
		if err1 != nil {
			lp.lggr.Warnw("Unable to get currentBlock", "err", err1, "currentBlockNumber", currentBlockNumber)
			return nil, err1
		}
		// Additional sanity checks, don't necessarily trust the RPC.
		if currentBlock == nil {
			lp.lggr.Errorw("Unexpected nil block from RPC", "currentBlockNumber", currentBlockNumber)
			return nil, pkgerrors.Errorf("Got nil block for %d", currentBlockNumber)
		}
		if currentBlock.Number != currentBlockNumber {
			lp.lggr.Warnw("Unable to get currentBlock, rpc returned incorrect block", "currentBlockNumber", currentBlockNumber, "got", currentBlock.Number)
			return nil, pkgerrors.Errorf("Block mismatch have %d want %d", currentBlock.Number, currentBlockNumber)
		}
	}
	// Does this currentBlock point to the same parent that we have saved?
	// If not, there was a reorg, so we need to rewind.
	expectedParent, err1 := lp.orm.SelectBlockByNumber(ctx, currentBlockNumber-1)
	if err1 != nil && !pkgerrors.Is(err1, sql.ErrNoRows) {
		// If err is not a 'no rows' error, assume transient db issue and retry
		lp.lggr.Warnw("Unable to read latestBlockNumber currentBlock saved", "err", err1, "currentBlockNumber", currentBlockNumber)
		return nil, pkgerrors.New("Unable to read latestBlockNumber currentBlock saved")
	}
	// We will not have the previous currentBlock on initial poll.
	havePreviousBlock := err1 == nil
	if !havePreviousBlock {
		lp.lggr.Infow("Do not have previous block, first poll ever on new chain", "currentBlockNumber", currentBlockNumber)
		return currentBlock, nil
	}
	// Check for reorg.
	if currentBlock.ParentHash != expectedParent.BlockHash {
		// There can be another reorg while we're finding the LCA.
		// That is ok, since we'll detect it on the next iteration.
		// Since we go currentBlock by currentBlock for unfinalized logs, the mismatch starts at currentBlockNumber - 1.
		blockAfterLCA, err2 := lp.findBlockAfterLCA(ctx, currentBlock, expectedParent.FinalizedBlockNumber)
		if err2 != nil {
			return nil, fmt.Errorf("unable to find LCA after reorg: %w", err2)
		}

		lp.lggr.Infow("Reorg detected", "blockAfterLCA", blockAfterLCA.Number, "currentBlockNumber", currentBlockNumber)
		// We truncate all the blocks and logs after the LCA.
		// We could preserve the logs for forensics, since its possible
		// that applications see them and take action upon it, however that
		// results in significantly slower reads since we must then compute
		// the canonical set per read. Typically, if an application took action on a log
		// it would be saved elsewhere e.g. evm.txes, so it seems better to just support the fast reads.
		// Its also nicely analogous to reading from the chain itself.
		err2 = lp.orm.DeleteLogsAndBlocksAfter(ctx, blockAfterLCA.Number)
		if err2 != nil {
			// If we error on db commit, we can't know if the tx went through or not.
			// We return an error here which will cause us to restart polling from lastBlockSaved + 1
			return nil, err2
		}
		return blockAfterLCA, nil
	}
	// No reorg, return current block.
	return currentBlock, nil
}

// PollAndSaveLogs On startup/crash current is the first block after the last processed block.
// currentBlockNumber is the block from where new logs are to be polled & saved. Under normal
// conditions this would be equal to lastProcessed.BlockNumber + 1.
func (lp *logPoller) PollAndSaveLogs(ctx context.Context, currentBlockNumber int64) {
	err := lp.pollAndSaveLogs(ctx, currentBlockNumber)
	if errors.Is(err, commontypes.ErrFinalityViolated) {
		lp.lggr.Criticalw("Failed to poll and save logs due to finality violation, retrying later", "err", err)
		lp.finalityViolated.Store(true)
		lp.SvcErrBuffer.Append(err)
		return
	}

	if err != nil {
		lp.lggr.Errorw("Failed to poll and save logs, retrying later", "err", err)
		return
	}

	if lp.finalityViolated.Load() {
		lp.lggr.Info("PollAndSaveLogs completed successfully - removing finality violation flag")
		lp.finalityViolated.Store(false)
	}
}

func (lp *logPoller) pollAndSaveLogs(ctx context.Context, currentBlockNumber int64) (err error) {
	lp.lggr.Debugw("Polling for logs", "currentBlockNumber", currentBlockNumber)
	// Intentionally not using logPoller.finalityDepth directly but the latestFinalizedBlockNumber returned from lp.latestBlocks()
	// latestBlocks knows how to pick a proper latestFinalizedBlockNumber based on the logPoller's configuration
	latestBlock, latestFinalizedBlockNumber, err := lp.latestBlocks(ctx)
	if err != nil {
		lp.lggr.Warnw("Unable to get latestBlockNumber block", "err", err, "currentBlockNumber", currentBlockNumber)
		return nil
	}
	latestBlockNumber := latestBlock.Number
	if currentBlockNumber > latestBlockNumber {
		// Note there can also be a reorg "shortening" i.e. chain height decreases but TDD increases. In that case
		// we also just wait until the new tip is longer and then detect the reorg.
		lp.lggr.Debugw("No new blocks since last poll", "currentBlockNumber", currentBlockNumber, "latestBlockNumber", latestBlockNumber)
		return nil
	}
	var currentBlock *evmtypes.Head
	if currentBlockNumber == latestBlockNumber {
		// Can re-use our currentBlock and avoid an extra RPC call.
		currentBlock = latestBlock
	}
	// Possibly handle a reorg. For example if we crash, we'll be in the middle of processing unfinalized blocks.
	// Returns (currentBlock || LCA+1 if reorg detected, error)
	currentBlock, err = lp.getCurrentBlockMaybeHandleReorg(ctx, currentBlockNumber, currentBlock)
	if err != nil {
		// If there's an error handling the reorg, we can't be sure what state the db was left in.
		// Resume from the latest block saved and retry.
		return fmt.Errorf("unable to get current block: %w", err)
	}
	currentBlockNumber = currentBlock.Number

	// backfill finalized blocks if we can for performance. If we crash during backfill, we
	// may reprocess logs.  Log insertion is idempotent so this is ok.
	// E.g. 1<-2<-3(currentBlockNumber)<-4<-5<-6<-7(latestBlockNumber), finality is 2. So 3,4 can be batched.
	// Although 5 is finalized, we still need to save it to the db for reorg detection if 6 is a reorg.
	// start = currentBlockNumber = 3, end = latestBlockNumber - finality - 1 = 7-2-1 = 4 (inclusive range).
	lastSafeBackfillBlock := latestFinalizedBlockNumber - 1
	if lastSafeBackfillBlock >= currentBlockNumber {
		lp.lggr.Infow("Backfilling logs", "start", currentBlockNumber, "end", lastSafeBackfillBlock)
		if err = lp.backfill(ctx, currentBlockNumber, lastSafeBackfillBlock); err != nil {
			// If there's an error backfilling, we can just return and retry from the last block saved
			// since we don't save any blocks on backfilling. We may re-insert the same logs but thats ok.
			return fmt.Errorf("failed to backfill finalized logs: %w", err)
		}
		currentBlockNumber = lastSafeBackfillBlock + 1
	}

	for {
		if currentBlockNumber > currentBlock.Number {
			currentBlock, err = lp.getCurrentBlockMaybeHandleReorg(ctx, currentBlockNumber, nil)
			if err != nil {
				// If there's an error handling the reorg, we can't be sure what state the db was left in.
				// Resume from the latest block saved.
				return fmt.Errorf("failed to get current block: %w", err)
			}
			currentBlockNumber = currentBlock.Number
		}

		h := currentBlock.Hash
		var logs []types.Log
		logs, err = lp.latencyMonitor.FilterLogs(ctx, lp.Filter(nil, nil, &h))
		if err != nil {
			lp.lggr.Warnw("Unable to query for logs, retrying", "err", err, "block", currentBlockNumber)
			return nil
		}
		lp.lggr.Debugw("Unfinalized log query", "logs", len(logs), "currentBlockNumber", currentBlockNumber, "blockHash", currentBlock.Hash, "timestamp", currentBlock.Timestamp)
		block := Block{
			BlockHash:            h,
			BlockNumber:          currentBlockNumber,
			BlockTimestamp:       currentBlock.Timestamp,
			FinalizedBlockNumber: latestFinalizedBlockNumber,
		}
		err = lp.orm.InsertLogsWithBlock(
			ctx,
			convertLogs(logs, []Block{block}, lp.lggr, lp.ec.ConfiguredChainID()),
			block,
		)
		if err != nil {
			lp.lggr.Warnw("Unable to save logs resuming from last saved block + 1", "err", err, "block", currentBlockNumber)
			return nil
		}
		// Update current block.
		// Same reorg detection on unfinalized blocks.
		currentBlockNumber++
		if currentBlockNumber > latestBlockNumber {
			break
		}
	}

	return nil
}

// Returns information about latestBlock, latestFinalizedBlockNumber provided by HeadTracker
func (lp *logPoller) latestBlocks(ctx context.Context) (*evmtypes.Head, int64, error) {
	latest, finalized, err := lp.headTracker.LatestAndFinalizedBlock(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get latest and latest finalized block from HeadTracker: %w", err)
	}

	finalizedBN := finalized.BlockNumber()
	// This is a dirty trick that allows LogPoller to function properly in tests where chain needs significant time to
	// reach finality depth. An alternative to this one-liner is a database migration that drops restriction
	// Block.FinalizedBlockNumber > 0 (which we actually want to keep to spot cases when FinalizedBlockNumber was simply not populated)
	// and refactoring of queries that assume that restriction still holds.
	if finalizedBN == 0 {
		finalizedBN = 1
	}
	lp.lggr.Debugw("Latest blocks read from chain", "latest", latest.Number, "finalized", finalizedBN)
	return latest, finalizedBN, nil
}

// Find the first place where our chain and their chain have the same block,
// that block number is the LCA. Return the block after that, where we want to resume polling.
func (lp *logPoller) findBlockAfterLCA(ctx context.Context, current *evmtypes.Head, latestFinalizedBlockNumber int64) (*evmtypes.Head, error) {
	// Current is where the mismatch starts.
	// Check its parent to see if its the same as ours saved.
	parent, err := lp.latencyMonitor.HeadByHash(ctx, current.ParentHash)
	if err != nil {
		return nil, err
	}
	blockAfterLCA := current
	// We expect reorgs up to the block after latestFinalizedBlock
	// We loop via parent instead of current so current always holds the LCA+1.
	// If the parent block number becomes < the first finalized block our reorg is too deep.
	// This can happen only if finalityTag is not enabled and fixed finalityDepth is provided via config.
	var ourParentBlockHash common.Hash
	for parent.Number >= latestFinalizedBlockNumber {
		outParentBlock, err := lp.orm.SelectBlockByNumber(ctx, parent.Number)
		if err != nil {
			return nil, err
		}
		ourParentBlockHash = outParentBlock.BlockHash
		if parent.Hash == ourParentBlockHash {
			// If we do have the blockhash, return blockAfterLCA
			return blockAfterLCA, nil
		}
		// Otherwise get a new parent and update blockAfterLCA.
		blockAfterLCA = parent
		parent, err = lp.latencyMonitor.HeadByHash(ctx, parent.ParentHash)
		if err != nil {
			return nil, err
		}
	}

	lp.lggr.Criticalw("Reorg greater than finality depth detected", "finalityTag", lp.useFinalityTag, "current", current.Number, "latestFinalized", latestFinalizedBlockNumber)
	return nil, fmt.Errorf("%w: finalized block hash %s does not match RPC's %s at height %d", commontypes.ErrFinalityViolated, ourParentBlockHash, blockAfterLCA.Hash, blockAfterLCA.Number)
}

// PruneOldBlocks removes blocks that are > lp.keepFinalizedBlocksDepth behind the latest finalized block.
// Returns whether all blocks eligible for pruning were removed. If logPrunePageSize is set to 0, then it
// will always return true unless there is an actual error.
func (lp *logPoller) PruneOldBlocks(ctx context.Context) (bool, error) {
	latestBlock, err := lp.orm.SelectLatestBlock(ctx)
	if err != nil {
		return false, err
	}
	if latestBlock == nil {
		// No blocks saved yet.
		return true, nil
	}

	// If the latest block we have in the db was saved during a backfill, then the latest finalized
	// block number stored with it will be larger than its block number. Instead of risking deleting
	// all blocks from the db, we should still keep the latest keepFinalizedBlocksDepth blocks
	referenceBlockNumber := mathutil.Min(latestBlock.FinalizedBlockNumber, latestBlock.BlockNumber)

	if referenceBlockNumber <= lp.keepFinalizedBlocksDepth {
		// No-op, keep all blocks
		return true, nil
	}
	// 1-2-3-4-5(finalized)-6-7(latest), keepFinalizedBlocksDepth=3
	// Remove <= 2
	rowsRemoved, err := lp.orm.DeleteBlocksBefore(
		ctx,
		referenceBlockNumber-lp.keepFinalizedBlocksDepth,
		lp.logPrunePageSize,
	)
	return lp.logPrunePageSize == 0 || rowsRemoved < lp.logPrunePageSize, err
}

// PruneExpiredLogs will attempt to remove any logs which have passed their retention period. Returns whether all expired
// logs were removed. If logPrunePageSize is set to 0, it will always return true unless an actual error is encountered
func (lp *logPoller) PruneExpiredLogs(ctx context.Context) (bool, error) {
	done := true

	rowsRemoved, err := lp.orm.DeleteExpiredLogs(ctx, lp.logPrunePageSize)
	if err != nil {
		lp.lggr.Errorw("Unable to find excess logs for pruning", "err", err)
		return false, err
	} else if lp.logPrunePageSize != 0 && rowsRemoved == lp.logPrunePageSize {
		done = false
	}

	if !lp.countBasedLogPruningActive.Load() {
		return done, err
	}

	rowIDs, err := lp.orm.SelectExcessLogIDs(ctx, lp.logPrunePageSize)
	if err != nil {
		lp.lggr.Errorw("Unable to find excess logs for pruning", "err", err)
		return false, err
	}
	rowsRemoved, err = lp.orm.DeleteLogsByRowID(ctx, rowIDs)
	if err != nil {
		lp.lggr.Errorw("Unable to prune excess logs", "err", err)
	} else if lp.logPrunePageSize != 0 && rowsRemoved == lp.logPrunePageSize {
		done = false
	}
	return done, err
}

// PruneUnmatchedLogs will attempt to remove any logs which no longer match a registered filter. Returns whether all unmatched
// logs were removed. If logPrunePageSize is set to 0, it will always return true unless an actual error is encountered
func (lp *logPoller) PruneUnmatchedLogs(ctx context.Context) (bool, error) {
	ids, err := lp.orm.SelectUnmatchedLogIDs(ctx, lp.logPrunePageSize)
	if err != nil {
		return false, err
	}
	rowsRemoved, err := lp.orm.DeleteLogsByRowID(ctx, ids)

	return lp.logPrunePageSize == 0 || rowsRemoved < lp.logPrunePageSize, err
}

// Logs returns logs matching topics and address (exactly) in the given block range,
// which are canonical at time of query.
func (lp *logPoller) Logs(ctx context.Context, start, end int64, eventSig common.Hash, address common.Address) ([]Log, error) {
	return lp.orm.SelectLogs(ctx, start, end, address, eventSig)
}

func (lp *logPoller) LogsWithSigs(ctx context.Context, start, end int64, eventSigs []common.Hash, address common.Address) ([]Log, error) {
	return lp.orm.SelectLogsWithSigs(ctx, start, end, address, eventSigs)
}

func (lp *logPoller) LogsCreatedAfter(ctx context.Context, eventSig common.Hash, address common.Address, after time.Time, confs evmtypes.Confirmations) ([]Log, error) {
	return lp.orm.SelectLogsCreatedAfter(ctx, address, eventSig, after, confs)
}

// IndexedLogs finds all the logs that have a topic value in topicValues at index topicIndex.
func (lp *logPoller) IndexedLogs(ctx context.Context, eventSig common.Hash, address common.Address, topicIndex int, topicValues []common.Hash, confs evmtypes.Confirmations) ([]Log, error) {
	return lp.orm.SelectIndexedLogs(ctx, address, eventSig, topicIndex, topicValues, confs)
}

// IndexedLogsByBlockRange finds all the logs that have a topic value in topicValues at index topicIndex within the block range
func (lp *logPoller) IndexedLogsByBlockRange(ctx context.Context, start, end int64, eventSig common.Hash, address common.Address, topicIndex int, topicValues []common.Hash) ([]Log, error) {
	return lp.orm.SelectIndexedLogsByBlockRange(ctx, start, end, address, eventSig, topicIndex, topicValues)
}

func (lp *logPoller) IndexedLogsCreatedAfter(ctx context.Context, eventSig common.Hash, address common.Address, topicIndex int, topicValues []common.Hash, after time.Time, confs evmtypes.Confirmations) ([]Log, error) {
	return lp.orm.SelectIndexedLogsCreatedAfter(ctx, address, eventSig, topicIndex, topicValues, after, confs)
}

func (lp *logPoller) IndexedLogsByTxHash(ctx context.Context, eventSig common.Hash, address common.Address, txHash common.Hash) ([]Log, error) {
	return lp.orm.SelectIndexedLogsByTxHash(ctx, address, eventSig, txHash)
}

// LogsDataWordGreaterThan note index is 0 based.
func (lp *logPoller) LogsDataWordGreaterThan(ctx context.Context, eventSig common.Hash, address common.Address, wordIndex int, wordValueMin common.Hash, confs evmtypes.Confirmations) ([]Log, error) {
	return lp.orm.SelectLogsDataWordGreaterThan(ctx, address, eventSig, wordIndex, wordValueMin, confs)
}

// LogsDataWordRange note index is 0 based.
func (lp *logPoller) LogsDataWordRange(ctx context.Context, eventSig common.Hash, address common.Address, wordIndex int, wordValueMin, wordValueMax common.Hash, confs evmtypes.Confirmations) ([]Log, error) {
	return lp.orm.SelectLogsDataWordRange(ctx, address, eventSig, wordIndex, wordValueMin, wordValueMax, confs)
}

// IndexedLogsTopicGreaterThan finds all the logs that have a topic value greater than topicValueMin at index topicIndex.
// Only works for integer topics.
func (lp *logPoller) IndexedLogsTopicGreaterThan(ctx context.Context, eventSig common.Hash, address common.Address, topicIndex int, topicValueMin common.Hash, confs evmtypes.Confirmations) ([]Log, error) {
	return lp.orm.SelectIndexedLogsTopicGreaterThan(ctx, address, eventSig, topicIndex, topicValueMin, confs)
}

func (lp *logPoller) IndexedLogsTopicRange(ctx context.Context, eventSig common.Hash, address common.Address, topicIndex int, topicValueMin common.Hash, topicValueMax common.Hash, confs evmtypes.Confirmations) ([]Log, error) {
	return lp.orm.SelectIndexedLogsTopicRange(ctx, address, eventSig, topicIndex, topicValueMin, topicValueMax, confs)
}

// LatestBlock returns the latest block the log poller is on. It tracks blocks to be able
// to detect reorgs.
func (lp *logPoller) LatestBlock(ctx context.Context) (Block, error) {
	b, err := lp.orm.SelectLatestBlock(ctx)
	if err != nil {
		return Block{}, err
	}

	return *b, nil
}

func (lp *logPoller) BlockByNumber(ctx context.Context, n int64) (*Block, error) {
	return lp.orm.SelectBlockByNumber(ctx, n)
}

// LatestLogByEventSigWithConfs finds the latest log that has confs number of blocks on top of the log.
func (lp *logPoller) LatestLogByEventSigWithConfs(ctx context.Context, eventSig common.Hash, address common.Address, confs evmtypes.Confirmations) (*Log, error) {
	return lp.orm.SelectLatestLogByEventSigWithConfs(ctx, eventSig, address, confs)
}

func (lp *logPoller) LatestLogEventSigsAddrsWithConfs(ctx context.Context, fromBlock int64, eventSigs []common.Hash, addresses []common.Address, confs evmtypes.Confirmations) ([]Log, error) {
	return lp.orm.SelectLatestLogEventSigsAddrsWithConfs(ctx, fromBlock, addresses, eventSigs, confs)
}

func (lp *logPoller) LatestBlockByEventSigsAddrsWithConfs(ctx context.Context, fromBlock int64, eventSigs []common.Hash, addresses []common.Address, confs evmtypes.Confirmations) (int64, error) {
	return lp.orm.SelectLatestBlockByEventSigsAddrsWithConfs(ctx, fromBlock, eventSigs, addresses, confs)
}

// LogsDataWordBetween retrieves a slice of Log records that match specific criteria.
// Besides generic filters like eventSig, address and confs, it also verifies data content against wordValue
// data[wordIndexMin] <= wordValue <= data[wordIndexMax].
//
// Passing the same value for wordIndexMin and wordIndexMax will check the equality of the wordValue at that index.
// Leading to returning logs matching: data[wordIndexMin] == wordValue.
//
// This function is particularly useful for filtering logs by data word values and their positions within the event data.
// It returns an empty slice if no logs match the provided criteria.
func (lp *logPoller) LogsDataWordBetween(ctx context.Context, eventSig common.Hash, address common.Address, wordIndexMin, wordIndexMax int, wordValue common.Hash, confs evmtypes.Confirmations) ([]Log, error) {
	return lp.orm.SelectLogsDataWordBetween(ctx, address, eventSig, wordIndexMin, wordIndexMax, wordValue, confs)
}

// GetBlocksRange tries to get the specified block numbers from the log pollers
// blocks table. It falls back to the RPC for any unfulfilled requested blocks.
func (lp *logPoller) GetBlocksRange(ctx context.Context, numbers []uint64) ([]Block, error) {
	// Do nothing if no blocks are requested.
	if len(numbers) == 0 {
		return []Block{}, nil
	}

	// Assign the requested blocks to a mapping.
	blocksRequested := make(map[uint64]struct{})
	for _, b := range numbers {
		blocksRequested[b] = struct{}{}
	}

	// Retrieve all blocks within this range from the log poller.
	blocksFound := make(map[uint64]Block)
	minRequestedBlock := int64(mathutil.Min(numbers[0], numbers[1:]...))
	maxRequestedBlock := int64(mathutil.Max(numbers[0], numbers[1:]...))
	lpBlocks, err := lp.orm.GetBlocksRange(ctx, minRequestedBlock, maxRequestedBlock)
	if err != nil {
		lp.lggr.Warnw("Error while retrieving blocks from log pollers blocks table. Falling back to RPC...", "requestedBlocks", numbers, "err", err)
	} else {
		for _, b := range lpBlocks {
			if _, ok := blocksRequested[uint64(b.BlockNumber)]; ok {
				// Only fill requested blocks.
				blocksFound[uint64(b.BlockNumber)] = b
			}
		}
		lp.lggr.Debugw("Got blocks from log poller", "blockNumbers", maps.Keys(blocksFound))
	}

	// Fill any remaining blocks from the client.
	blocksFoundFromRPC, err := lp.fillRemainingBlocksFromRPC(ctx, blocksRequested, blocksFound)
	if err != nil {
		return nil, err
	}
	for num, b := range blocksFoundFromRPC {
		blocksFound[num] = b
	}

	blocks := make([]Block, 0, len(numbers))
	var blocksNotFound []uint64
	for _, num := range numbers {
		b, ok := blocksFound[num]
		if !ok {
			blocksNotFound = append(blocksNotFound, num)
		}
		blocks = append(blocks, b)
	}

	if len(blocksNotFound) > 0 {
		return nil, pkgerrors.Errorf("blocks were not found in db or RPC call: %v", blocksNotFound)
	}

	return blocks, nil
}

// fillRemainingBlocksFromRPC sends a batch request for each block in blocksRequested, and converts them from
// geth blocks into Block structs. This is only intended to be used for requesting finalized blocks,
// if any of the blocks coming back are not finalized, an error will be returned
func (lp *logPoller) fillRemainingBlocksFromRPC(
	ctx context.Context,
	blocksRequested map[uint64]struct{},
	blocksFound map[uint64]Block,
) (map[uint64]Block, error) {
	remainingBlocks := make([]uint64, 0, len(blocksRequested))
	for num := range blocksRequested {
		if _, ok := blocksFound[num]; !ok {
			remainingBlocks = append(remainingBlocks, num)
		}
	}

	if len(remainingBlocks) > 0 {
		lp.lggr.Debugw("Falling back to RPC for blocks not found in log poller blocks table",
			"remainingBlocks", remainingBlocks)
	}

	batchSize := lp.rpcBatchSize - 2 // subtract 2 to leave room for 2 reference requests added in lp.fetchBlocks()
	if batchSize < 1 {
		batchSize = 1
	}

	return lp.batchFetchBlocks(ctx, remainingBlocks, batchSize)
}

// newBlockReq constructs an eth_getBlockByNumber request for particular block number
func newBlockReq(num string) rpc.BatchElem {
	return rpc.BatchElem{
		Method: "eth_getBlockByNumber",
		Args:   []interface{}{num, false},
		Result: &evmtypes.Head{},
	}
}

type blockValidationType string

var (
	latestBlock    blockValidationType = blockValidationType(rpc.LatestBlockNumber.String())
	finalizedBlock blockValidationType = blockValidationType(rpc.FinalizedBlockNumber.String())
)

// fetchBlocks fetches a list of blocks in a single batch. finalityValidationReq is the string to use for the
// additional validation request (either the "finalized" or "latest" string defined in rpc module), which
// will be used to validate the finality of the other blocks.
// chainReference - is used to verify that fetched blocks belong to the same chain as referenced head.
func (lp *logPoller) fetchBlocks(ctx context.Context, blocksRequested []uint64, finalityValidationReq blockValidationType, chainReference *Block) (blocks map[uint64]*evmtypes.Head, err error) {
	n := len(blocksRequested)
	blocks = make(map[uint64]*evmtypes.Head, n+2)
	reqs := make([]rpc.BatchElem, 0, n+2)

	for _, num := range blocksRequested {
		reqs = append(reqs, newBlockReq(hexutil.EncodeBig(big.NewInt(0).SetUint64(num))))
	}

	reqs = append(reqs, newBlockReq(string(finalityValidationReq)))

	if chainReference != nil {
		reqs = append(reqs, newBlockReq(hexutil.EncodeBig(big.NewInt(chainReference.BlockNumber))))
	}

	err = lp.ec.BatchCallContext(ctx, reqs)
	if err != nil {
		return nil, err
	}

	// ensure that requested blocks belong to the same chain as referenced head
	if chainReference != nil {
		var rpcChainReference *evmtypes.Head
		rpcChainReference, err = validateBlockResponse(reqs[len(reqs)-1])
		if err != nil {
			return nil, err
		}

		if rpcChainReference.Hash != chainReference.BlockHash {
			return nil, fmt.Errorf("expected RPC's finalized block hash at hegiht %d to be %s but got %s: %w",
				chainReference.BlockNumber, chainReference.BlockHash, rpcChainReference.Hash, commontypes.ErrFinalityViolated)
		}

		reqs = reqs[:len(reqs)-1] // no need to include chain reference into results
	}

	latestFinalized, err := validateBlockResponse(reqs[len(reqs)-1])
	if err != nil {
		return nil, err
	}
	latestFinalizedBlockNumber := latestFinalized.Number
	if finalityValidationReq == latestBlock {
		// subtract finalityDepth from "latest" to get finalized, when useFinalityTags = false
		latestFinalizedBlockNumber = mathutil.Max(latestFinalizedBlockNumber-lp.finalityDepth, 0)
	}

	reqs = reqs[:len(reqs)-1] // no need to include finality validation request into results

	for i, r := range reqs {
		block, err := validateBlockResponse(r)
		if err != nil {
			return nil, err
		}

		blockRequested := r.Args[0].(string)
		if blockRequested != string(latestBlock) && block.Number > latestFinalizedBlockNumber {
			return nil, fmt.Errorf(
				"received unfinalized block %d while expecting finalized block (latestFinalizedBlockNumber = %d)",
				block.Number, latestFinalizedBlockNumber)
		}

		blocks[blocksRequested[i]] = block
	}
	return blocks, nil
}

func (lp *logPoller) batchFetchBlocks(ctx context.Context, blocksRequested []uint64, batchSize int64) (map[uint64]Block, error) {
	validationReq := finalizedBlock
	if !lp.useFinalityTag {
		validationReq = latestBlock
	}

	chainValidationHead, err := lp.orm.SelectLatestFinalizedBlock(ctx)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("failed to fetch latest finalized block from db: %w", err)
	}

	var logPollerBlocks = make(map[uint64]Block, len(blocksRequested))
	for i := 0; i < len(blocksRequested); i += int(batchSize) {
		j := i + int(batchSize)
		if j > len(blocksRequested) {
			j = len(blocksRequested)
		}

		// As batch requests are not atomic, there is a chance that some of the blocks were replaced due to a reorg once we've observed them.
		// Example:
		// 1. RPC's chain is 1,2',3',4',5' (latest finalized is 1).
		// 2. Batch request reads blocks 1,2'.
		// 3. RPC updates its state to 1,2,3,4,5 (latest finalized is 5).
		// 4. Batch request reads 4,5.
		// As a result, we'll treat block 2' as finalized. To address that, we have to fetch all blocks twice and verify that the results are identical.
		fetched1, err := lp.fetchBlocks(ctx, blocksRequested[i:j], validationReq, chainValidationHead)
		if err != nil {
			return nil, err
		}

		fetched2, err := lp.fetchBlocks(ctx, blocksRequested[i:j], validationReq, chainValidationHead)
		if err != nil {
			return nil, err
		}

		err = ensureIdenticalBlocksBatches(fetched1, fetched2)
		if err != nil {
			return nil, err
		}

		for _, head := range fetched1 {
			lpBlock := Block{
				EVMChainID:           head.EVMChainID,
				BlockHash:            head.Hash,
				BlockNumber:          head.Number,
				BlockTimestamp:       head.Timestamp,
				FinalizedBlockNumber: head.Number, // always finalized; only matters if this block is returned by LatestBlock()
				CreatedAt:            head.CreatedAt,
			}
			logPollerBlocks[uint64(head.Number)] = lpBlock //nolint:gosec // G115
			if chainValidationHead == nil || chainValidationHead.BlockNumber < lpBlock.BlockNumber {
				chainValidationHead = &lpBlock
			}
		}
	}

	return logPollerBlocks, nil
}

func ensureIdenticalBlocksBatches(fetched1, fetched2 map[uint64]*evmtypes.Head) error {
	if len(fetched1) != len(fetched2) {
		return fmt.Errorf("invariant violation: expected size of batches to be identical. Fetched1: %d, Fetched2: %d", len(fetched1), len(fetched2))
	}

	for num, head1 := range fetched1 {
		head2, ok := fetched2[num]
		if !ok {
			return fmt.Errorf("invariant violation: expected fetched1 to contain same blocks as fetched2, but %d is missing from fetched2", num)
		}

		if head1.Hash != head2.Hash {
			return fmt.Errorf("expected block %d to be finalized but got different hashes %s and %s from RPC: %w", num, head1.Hash, head2.Hash, commontypes.ErrFinalityViolated)
		}
	}

	return nil
}

func validateBlockResponse(r rpc.BatchElem) (*evmtypes.Head, error) {
	block, is := r.Result.(*evmtypes.Head)

	if !is {
		return nil, pkgerrors.Errorf("expected result to be a %T, got %T", &evmtypes.Head{}, r.Result)
	}
	if block == nil {
		return nil, pkgerrors.New("invariant violation: got nil block")
	}
	if block.Hash == (common.Hash{}) {
		return nil, pkgerrors.Errorf("missing block hash for block number: %d", block.Number)
	}
	if block.Number < 0 {
		return nil, pkgerrors.Errorf("expected block number to be >= to 0, got %d", block.Number)
	}
	return block, nil
}

// IndexedLogsWithSigsExcluding returns the set difference(A-B) of logs with signature sigA and sigB, matching is done on the topics index
//
// For example, query to retrieve unfulfilled requests by querying request log events without matching fulfillment log events.
// The order of events is not significant. Both logs must be inside the block range and have the minimum number of confirmations
func (lp *logPoller) IndexedLogsWithSigsExcluding(ctx context.Context, address common.Address, eventSigA, eventSigB common.Hash, topicIndex int, fromBlock, toBlock int64, confs evmtypes.Confirmations) ([]Log, error) {
	return lp.orm.SelectIndexedLogsWithSigsExcluding(ctx, eventSigA, eventSigB, topicIndex, address, fromBlock, toBlock, confs)
}

// DeleteLogsAndBlocksAfter - removes blocks and logs starting from the specified block
func (lp *logPoller) DeleteLogsAndBlocksAfter(ctx context.Context, start int64) error {
	return lp.orm.DeleteLogsAndBlocksAfter(ctx, start)
}

func (lp *logPoller) FindLCA(ctx context.Context) (*Block, error) {
	latest, err := lp.orm.SelectLatestBlock(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to select the latest block: %w", err)
	}

	oldest, err := lp.orm.SelectOldestBlock(ctx, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to select the oldest block: %w", err)
	}

	if latest == nil || oldest == nil {
		return nil, errors.New("expected at least one block to be present in DB")
	}

	lp.lggr.Debugf("Received request to find LCA. Searching in range [%d, %d]", oldest.BlockNumber, latest.BlockNumber)

	// Find the largest block number for which block hash stored in the DB matches one that we get from the RPC.
	// `sort.Find` expects slice of following format s = [1, 0, -1] and returns smallest index i for which s[i] = 0.
	// To utilise `sort.Find` we represent range of blocks as slice [latestBlock, latestBlock-1, ..., olderBlock+1, oldestBlock]
	// and return 1 if DB block was reorged or 0 if it's still present on chain.
	lcaI, found := sort.Find(int(latest.BlockNumber-oldest.BlockNumber)+1, func(i int) int {
		const notFound = 1
		const found = 0
		// if there is an error - stop the search
		if err != nil {
			return notFound
		}

		// canceled search
		if ctx.Err() != nil {
			err = fmt.Errorf("aborted, FindLCA request cancelled: %w", ctx.Err())
			return notFound
		}
		iBlockNumber := latest.BlockNumber - int64(i)
		var dbBlock *Block
		// Block with specified block number might not exist in the database, to address that we check closest child
		// of the iBlockNumber. If the child is present on chain, it's safe to assume that iBlockNumber is present too
		dbBlock, err = lp.orm.SelectOldestBlock(ctx, iBlockNumber)
		if err != nil {
			err = fmt.Errorf("failed to select block %d by number: %w", iBlockNumber, err)
			return notFound
		}

		if dbBlock == nil {
			err = fmt.Errorf("expected block to exist with blockNumber >= %d as observed block with number %d", iBlockNumber, latest.BlockNumber)
			return notFound
		}

		lp.lggr.Debugf("Looking for matching block on chain blockNumber: %d blockHash: %s",
			dbBlock.BlockNumber, dbBlock.BlockHash)
		var chainBlock *evmtypes.Head
		chainBlock, err = lp.latencyMonitor.HeadByHash(ctx, dbBlock.BlockHash)
		// our block in DB does not exist on chain
		if (chainBlock == nil && err == nil) || errors.Is(err, ethereum.NotFound) {
			err = nil
			return notFound
		}
		if err != nil {
			err = fmt.Errorf("failed to get block %s from RPC: %w", dbBlock.BlockHash, err)
			return notFound
		}

		if chainBlock.BlockNumber() != dbBlock.BlockNumber {
			err = fmt.Errorf("expected block numbers to match (db: %d, chain: %d), if block hashes match "+
				"(db: %s, chain: %s)", dbBlock.BlockNumber, chainBlock.BlockNumber(), dbBlock.BlockHash, chainBlock.Hash)
			return notFound
		}

		return found
	})
	if err != nil {
		return nil, fmt.Errorf("failed to find: %w", err)
	}

	if !found {
		return nil, errors.New("failed to find LCA, this means that whole database LogPoller state was reorged out of chain or RPC/Core node is misconfigured")
	}

	lcaBlockNumber := latest.BlockNumber - int64(lcaI)
	lca, err := lp.orm.SelectBlockByNumber(ctx, lcaBlockNumber)
	if err != nil {
		return nil, fmt.Errorf("failed to select lca from db: %w", err)
	}

	if lca == nil {
		return nil, fmt.Errorf("expected lca (blockNum: %d) to exist in DB", lcaBlockNumber)
	}

	return lca, nil
}

func EvmWord(i uint64) common.Hash {
	var b = make([]byte, 8)
	binary.BigEndian.PutUint64(b, i)
	return common.BytesToHash(b)
}

func (lp *logPoller) FilteredLogs(ctx context.Context, queryFilter []query.Expression, limitAndSort query.LimitAndSort, queryName string) ([]Log, error) {
	return lp.orm.FilteredLogs(ctx, queryFilter, limitAndSort, queryName)
}

// Where is a query.Where wrapper that ignores the Key and returns a slice of query.Expression rather than query.KeyFilter.
// If no expressions are provided, or an error occurs, an empty slice is returned.
func Where(expressions ...query.Expression) ([]query.Expression, error) {
	filter, err := query.Where(
		"",
		expressions...,
	)

	if err != nil {
		return []query.Expression{}, err
	}

	if filter.Expressions == nil {
		return []query.Expression{}, nil
	}

	return filter.Expressions, nil
}
