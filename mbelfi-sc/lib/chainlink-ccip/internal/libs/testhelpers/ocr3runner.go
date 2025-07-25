package testhelpers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"

	"github.com/smartcontractkit/libocr/commontypes"
	"github.com/smartcontractkit/libocr/offchainreporting2plus/ocr3types"
	"github.com/smartcontractkit/libocr/offchainreporting2plus/types"

	"github.com/smartcontractkit/chainlink-ccip/internal/libs/slicelib"
)

var (
	ErrQuery                        = errors.New("error in query phase")
	ErrObservation                  = errors.New("error in observation phase")
	ErrValidateObservation          = errors.New("error in validate observation phase")
	ErrOutcome                      = errors.New("error in outcome phase")
	ErrEmptyOutcome                 = errors.New("outcome is empty")
	ErrReports                      = errors.New("error in reports phase")
	ErrShouldAcceptAttestedReport   = errors.New("error in should accept attested report phase")
	ErrShouldTransmitAcceptedReport = errors.New("error in should transmit accepted report phase")
)

// OCR3Runner is a simple runner for OCR3.
//
// TODO: move to a shared repository.
type OCR3Runner[RI any] struct {
	nodes           []ocr3types.ReportingPlugin[RI]
	nodeIDs         []commontypes.OracleID
	round           int
	previousOutcome ocr3types.Outcome
}

func NewOCR3Runner[RI any](
	nodes []ocr3types.ReportingPlugin[RI], nodeIDs []commontypes.OracleID, initialOutcome ocr3types.Outcome,
) *OCR3Runner[RI] {
	return &OCR3Runner[RI]{
		nodes:           nodes,
		nodeIDs:         nodeIDs,
		round:           0,
		previousOutcome: initialOutcome,
	}
}

// RunRound will run some basic steps of an OCR3 flow.
// This is not a full OCR3 round but only the bare minimum.
//
//nolint:gocyclo // This is a test helper.
func (r *OCR3Runner[RI]) RunRound(ctx context.Context) (result RoundResult[RI], err error) {
	r.round++
	seqNr := uint64(r.round)

	leaderNode := r.selectLeader()

	outcomeCtx := ocr3types.OutcomeContext{SeqNr: seqNr, PreviousOutcome: r.previousOutcome}

	q, err := leaderNode.Query(ctx, outcomeCtx)
	if err != nil {
		return RoundResult[RI]{}, fmt.Errorf("%w: %w", err, ErrQuery)
	}

	attributedObservations := make([]types.AttributedObservation, len(r.nodes))
	for i, n := range r.nodes {
		obs, err2 := n.Observation(ctx, outcomeCtx, q)
		if err2 != nil {
			return RoundResult[RI]{}, fmt.Errorf("%w: %w", err2, ErrObservation)
		}

		attrObs := types.AttributedObservation{Observation: obs, Observer: r.nodeIDs[i]}
		err = leaderNode.ValidateObservation(ctx, outcomeCtx, q, attrObs)
		if err != nil {
			return RoundResult[RI]{}, fmt.Errorf("%w: %w", err, ErrValidateObservation)
		}

		attributedObservations[i] = attrObs
	}

	outcomes := make([]ocr3types.Outcome, len(r.nodes))
	for i, n := range r.nodes {
		outcome, err2 := n.Outcome(ctx, outcomeCtx, q, attributedObservations)
		if err2 != nil {
			return RoundResult[RI]{}, fmt.Errorf("%w: %w", err2, ErrOutcome)
		}
		if len(outcome) == 0 {
			return RoundResult[RI]{}, ErrEmptyOutcome
		}

		outcomes[i] = outcome
	}

	// check that all the outcomes are the same.
	if countUniqueOutcomes(outcomes) > 1 {
		return RoundResult[RI]{}, fmt.Errorf("outcomes are not equal, check for outcome determinism")
	}

	r.previousOutcome = outcomes[0]

	allReports := make([][]ocr3types.ReportPlus[RI], len(r.nodes))
	for i, n := range r.nodes {
		reportsPlus, err2 := n.Reports(ctx, seqNr, outcomes[0])
		if err2 != nil {
			return RoundResult[RI]{}, fmt.Errorf("%w: %w", err2, ErrReports)
		}

		allReports[i] = reportsPlus
	}

	// check that all the reports are the same.
	if countUniqueReports(allReports) > 1 {
		return RoundResult[RI]{}, fmt.Errorf("reports are not equal")
	}

	transmitted := make([]ocr3types.ReportWithInfo[RI], 0)
	notAccepted := make([]ocr3types.ReportWithInfo[RI], 0)
	notTransmitted := make([]ocr3types.ReportWithInfo[RI], 0)

	for _, report := range allReports[0] {
		allShouldAccept := make([]bool, len(r.nodes))
		for i, n := range r.nodes {
			shouldAccept, err2 := n.ShouldAcceptAttestedReport(ctx, seqNr, report.ReportWithInfo)
			if err2 != nil {
				return RoundResult[RI]{}, fmt.Errorf("%w: %w", err2, ErrShouldAcceptAttestedReport)
			}

			allShouldAccept[i] = shouldAccept
		}
		if slicelib.CountUnique(allShouldAccept) > 1 {
			return RoundResult[RI]{}, fmt.Errorf("should accept attested report from all oracles is not equal")
		}

		if !allShouldAccept[0] {
			notAccepted = append(notAccepted, report.ReportWithInfo)
			continue
		}

		allShouldTransmit := make([]bool, len(r.nodes))
		for i, n := range r.nodes {
			shouldTransmit, err2 := n.ShouldTransmitAcceptedReport(ctx, seqNr, report.ReportWithInfo)
			if err2 != nil {
				return RoundResult[RI]{}, fmt.Errorf("%w: %w", err2, ErrShouldTransmitAcceptedReport)
			}

			allShouldTransmit[i] = shouldTransmit
		}
		if slicelib.CountUnique(allShouldTransmit) > 1 {
			return RoundResult[RI]{}, fmt.Errorf("should transmit accepted report from all oracles is not equal")
		}

		if !allShouldTransmit[0] {
			notTransmitted = append(notTransmitted, report.ReportWithInfo)
			continue
		}

		transmitted = append(transmitted, report.ReportWithInfo)
	}

	return RoundResult[RI]{
		Transmitted:    transmitted,
		NotAccepted:    notAccepted,
		NotTransmitted: notTransmitted,
		Outcome:        outcomes[0],
	}, nil
}

func (r *OCR3Runner[RI]) selectLeader() ocr3types.ReportingPlugin[RI] {
	numNodes := len(r.nodes)
	if numNodes == 0 {
		return nil
	}

	idx, err := rand.Int(rand.Reader, big.NewInt(int64(numNodes)))
	if err != nil {
		panic(err)
	}
	if !idx.IsInt64() {
		panic("index is not int64")
	}
	return r.nodes[idx.Int64()]
}

type RoundResult[RI any] struct {
	Transmitted    []ocr3types.ReportWithInfo[RI]
	NotAccepted    []ocr3types.ReportWithInfo[RI]
	NotTransmitted []ocr3types.ReportWithInfo[RI]
	Outcome        []byte
}

func countUniqueOutcomes(outcomes []ocr3types.Outcome) int {
	flattenedHashes := make([]string, 0, len(outcomes))
	for _, o := range outcomes {
		h := sha256.New()
		h.Write(o)
		flattenedHashes = append(flattenedHashes, hex.EncodeToString(h.Sum(nil)))
	}
	return slicelib.CountUnique(flattenedHashes)
}

func countUniqueReports[RI any](allReports [][]ocr3types.ReportPlus[RI]) int {
	// Create hashes for each node's set of reports
	nodeHashes := make([]string, len(allReports))
	for i, reports := range allReports {
		h := sha256.New()
		for _, report := range reports {
			h.Write(report.ReportWithInfo.Report)
		}
		nodeHashes[i] = hex.EncodeToString(h.Sum(nil))
	}

	return slicelib.CountUnique(nodeHashes)
}
