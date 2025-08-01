package heads_test

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	pkgerrors "github.com/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	commonconfig "github.com/smartcontractkit/chainlink-common/pkg/config"
	"github.com/smartcontractkit/chainlink-common/pkg/logger"
	"github.com/smartcontractkit/chainlink-common/pkg/utils/tests"
	"github.com/smartcontractkit/chainlink-evm/pkg/config/configtest"
	"github.com/smartcontractkit/chainlink-framework/chains/heads"

	"github.com/smartcontractkit/chainlink-evm/pkg/client/clienttest"
	"github.com/smartcontractkit/chainlink-evm/pkg/config/toml"
	"github.com/smartcontractkit/chainlink-evm/pkg/testutils"
	evmtypes "github.com/smartcontractkit/chainlink-evm/pkg/types"
)

func Test_HeadListener_HappyPath(t *testing.T) {
	t.Parallel()
	// Logic:
	// - spawn a listener instance
	// - mock SubscribeToHeads/Err/Unsubscribe to track these calls
	// - send 3 heads
	// - ask listener to stop
	// Asserts:
	// - check Connected()/ReceivingHeads() are updated
	// - 3 heads is passed to callback
	// - ethClient methods are invoked

	lggr := logger.Test(t)
	ethClient := clienttest.NewClientWithDefaultChainID(t)
	evmcfg := configtest.NewChainScopedConfig(t, func(c *toml.EVMConfig) {
		c.NoNewHeadsThreshold = &commonconfig.Duration{}
	})

	var headCount atomic.Int32
	unsubscribeAwaiter := testutils.NewAwaiter()
	chHeads := make(chan *evmtypes.Head)
	subscribeAwaiter := testutils.NewAwaiter()
	var chErr = make(chan error)
	var chSubErr <-chan error = chErr
	sub := clienttest.NewSubscription(t)
	ethClient.On("SubscribeToHeads", mock.Anything).Return((<-chan *evmtypes.Head)(chHeads), sub, nil).Once().Run(func(args mock.Arguments) {
		subscribeAwaiter.ItHappened()
	})
	sub.On("Err").Return(chSubErr)
	sub.On("Unsubscribe").Return().Once().Run(func(mock.Arguments) {
		unsubscribeAwaiter.ItHappened()
		close(chHeads)
		close(chErr)
	})

	func() {
		hl := heads.NewListener(lggr, ethClient, evmcfg.EVM(), nil, func(context.Context, *evmtypes.Head) error {
			headCount.Add(1)
			return nil
		})
		require.NoError(t, hl.Start(tests.Context(t)))
		defer func() { assert.NoError(t, hl.Close()) }()

		subscribeAwaiter.AwaitOrFail(t, tests.WaitTimeout(t))
		require.Eventually(t, hl.Connected, tests.WaitTimeout(t), tests.TestInterval)

		chHeads <- testutils.Head(0)
		chHeads <- testutils.Head(1)
		chHeads <- testutils.Head(2)

		require.True(t, hl.ReceivingHeads())
	}()

	unsubscribeAwaiter.AwaitOrFail(t)
	require.Equal(t, int32(3), headCount.Load())
}

func Test_HeadListener_NotReceivingHeads(t *testing.T) {
	t.Parallel()
	// Logic:
	// - same as Test_HeadListener_HappyPath, but
	// - send one head, make sure ReceivingHeads() is true
	// - do not send any heads within BlockEmissionIdleWarningThreshold and check ReceivingHeads() is false

	lggr := logger.Test(t)
	ethClient := clienttest.NewClientWithDefaultChainID(t)

	evmcfg := configtest.NewChainScopedConfig(t, func(c *toml.EVMConfig) {
		c.NoNewHeadsThreshold = commonconfig.MustNewDuration(time.Second)
	})

	firstHeadAwaiter := testutils.NewAwaiter()

	chHeads := make(chan *evmtypes.Head)
	subscribeAwaiter := testutils.NewAwaiter()
	var chErr = make(chan error)
	var chSubErr <-chan error = chErr
	sub := clienttest.NewSubscription(t)
	ethClient.On("SubscribeToHeads", mock.Anything).Return((<-chan *evmtypes.Head)(chHeads), sub, nil).Once().Run(func(args mock.Arguments) {
		subscribeAwaiter.ItHappened()
	})
	sub.On("Err").Return(chSubErr)
	sub.On("Unsubscribe").Return().Once().Run(func(_ mock.Arguments) {
		close(chHeads)
		close(chErr)
	})

	func() {
		hl := heads.NewListener(lggr, ethClient, evmcfg.EVM(), nil, func(context.Context, *evmtypes.Head) error {
			firstHeadAwaiter.ItHappened()
			return nil
		})
		require.NoError(t, hl.Start(tests.Context(t)))
		defer func() { assert.NoError(t, hl.Close()) }()

		subscribeAwaiter.AwaitOrFail(t, tests.WaitTimeout(t))

		chHeads <- testutils.Head(0)
		firstHeadAwaiter.AwaitOrFail(t)

		require.True(t, hl.ReceivingHeads())

		time.Sleep(time.Second * 2)

		require.False(t, hl.ReceivingHeads())
	}()
}

func Test_HeadListener_SubscriptionErr(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name     string
		err      error
		closeErr bool
	}{
		{"nil error", nil, false},
		{"socket error", pkgerrors.New("close 1006 (abnormal closure): unexpected EOF"), false},
		{"close Err channel", nil, true},
	}

	for _, test := range cases {
		test := test
		t.Run(test.name, func(t *testing.T) {
			lggr := logger.Test(t)
			ethClient := clienttest.NewClientWithDefaultChainID(t)
			evmcfg := configtest.NewChainScopedConfig(t, nil)

			hnhCalled := make(chan *evmtypes.Head)

			chSubErrTest := make(chan error)
			var chSubErr <-chan error = chSubErrTest
			sub := clienttest.NewSubscription(t)
			// sub.Err is called twice because we enter the select loop two times: once
			// initially and once again after exactly one head has been received
			sub.On("Err").Return(chSubErr).Twice()

			headsCh := make(chan *evmtypes.Head)
			subscribeAwaiter := testutils.NewAwaiter()
			// Initial subscribe
			ethClient.On("SubscribeToHeads", mock.Anything).Return((<-chan *evmtypes.Head)(headsCh), sub, nil).Once().Run(func(args mock.Arguments) {
				subscribeAwaiter.ItHappened()
			})
			func() {
				hl := heads.NewListener(lggr, ethClient, evmcfg.EVM(), nil, func(_ context.Context, header *evmtypes.Head) error {
					hnhCalled <- header
					return nil
				})
				require.NoError(t, hl.Start(tests.Context(t)))
				defer func() { assert.NoError(t, hl.Close()) }()

				// Put a head on the channel to ensure we test all code paths
				subscribeAwaiter.AwaitOrFail(t, tests.WaitTimeout(t))
				head := testutils.Head(0)
				headsCh <- head

				h := <-hnhCalled
				assert.Equal(t, head, h)

				// Expect a call to unsubscribe on error
				sub.On("Unsubscribe").Once().Run(func(_ mock.Arguments) {
					close(headsCh)
					// geth guarantees that Unsubscribe closes the errors channel
					if !test.closeErr {
						close(chSubErrTest)
					}
				})
				// Expect a resubscribe
				chSubErrTest2 := make(chan error)
				var chSubErr2 <-chan error = chSubErrTest2
				sub2 := clienttest.NewSubscription(t)
				sub2.On("Err").Return(chSubErr2)
				subscribeAwaiter2 := testutils.NewAwaiter()

				headsCh2 := make(chan *evmtypes.Head)
				ethClient.On("SubscribeToHeads", mock.Anything).Return((<-chan *evmtypes.Head)(headsCh2), sub2, nil).Once().Run(func(args mock.Arguments) {
					subscribeAwaiter2.ItHappened()
				})

				// Sending test error
				if test.closeErr {
					close(chSubErrTest)
				} else {
					chSubErrTest <- test.err
				}

				// Wait for it to resubscribe
				subscribeAwaiter2.AwaitOrFail(t, tests.WaitTimeout(t))

				head2 := testutils.Head(1)
				headsCh2 <- head2

				h2 := <-hnhCalled
				assert.Equal(t, head2, h2)

				// Second call to unsubscribe on close
				sub2.On("Unsubscribe").Once().Run(func(_ mock.Arguments) {
					close(headsCh2)
					// geth guarantees that Unsubscribe closes the errors channel
					close(chSubErrTest2)
				})
			}()
		})
	}
}
