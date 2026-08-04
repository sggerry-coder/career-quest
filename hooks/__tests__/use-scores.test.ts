import { describe, it, expect } from "vitest";
import {
  applyFootprintUndo,
  buildProcessResponseFootprint,
  buildSignalsFootprint,
  buildIpsativeFootprint,
} from "../use-scores";
import type { ScoreState } from "../use-scores";

function makeEmptyState(): ScoreState {
  return {
    riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
    riasec_raw: { R: [], I: [], A: [], S: [], E: [], C: [] },
    riasec_ipsative_raw: { R: [], I: [], A: [], S: [], E: [], C: [] },
    mi: {
      linguistic: 0, logical: 0, spatial: 0, musical: 0,
      bodily: 0, interpersonal: 0, intrapersonal: 0, naturalistic: 0,
    },
    mi_raw: {
      linguistic: [], logical: [], spatial: [], musical: [],
      bodily: [], interpersonal: [], intrapersonal: [], naturalistic: [],
    },
    mbti: { EI: 0, SN: 0, TF: 0, JP: 0 },
    mbti_raw: { EI: [], SN: [], TF: [], JP: [] },
    values: {
      security_adventure: 0, income_impact: 0, prestige_fulfilment: 0,
      structure_flexibility: 0, solo_team: 0,
    },
    values_raw: {
      security_adventure: [], income_impact: [], prestige_fulfilment: [],
      structure_flexibility: [], solo_team: [],
    },
    strengths: [],
    strength_signals: [],
    rating_responses: [],
    acquiescence_flag: false,
    riasec_snapshot: null,
    class_label: "SEEKER",
    signal_history: [],
  };
}

describe("multi-signal undo", () => {
  it("processResponseWithSignals followed by removeLastResponse returns to original riasec_raw, mi_raw, strength_signals", () => {
    const original = makeEmptyState();
    // Simulate processResponseWithSignals: add riasec_R=4, mi_bodily=1, strength="analytical"
    const signals: Record<string, number> = { riasec_R: 2, mi_bodily: 1 };
    const strengthSignal = "analytical";

    const footprint = buildSignalsFootprint("q1", signals, strengthSignal);
    const after = structuredClone(original);
    // Apply the mutations that processResponseWithSignals would do
    after.riasec_raw.R = [4]; // weight >= 2 maps to 4
    after.mi_raw.bodily = [1];
    after.strength_signals = ["analytical"];
    after.strengths = ["analytical"];
    after.signal_history = [footprint];

    // Now undo
    const undone = applyFootprintUndo(after);

    expect(undone.riasec_raw.R).toEqual([]);
    expect(undone.mi_raw.bodily).toEqual([]);
    expect(undone.strength_signals).toEqual([]);
    expect(undone.signal_history).toEqual([]);
  });

  it("two processResponseWithSignals followed by one removeLastResponse only reverses the last one", () => {
    const state = makeEmptyState();
    // First signal: riasec_R=4, mi_linguistic=2
    state.riasec_raw.R = [4];
    state.mi_raw.linguistic = [2];
    state.signal_history = [
      buildSignalsFootprint("q1", { riasec_R: 2, mi_linguistic: 2 }, undefined),
    ];

    // Second signal: riasec_A=3, mi_spatial=1, strength="creative"
    state.riasec_raw.A = [3];
    state.mi_raw.spatial = [1];
    state.strength_signals = ["creative"];
    state.strengths = ["creative"];
    state.signal_history.push(
      buildSignalsFootprint("q2", { riasec_A: 1, mi_spatial: 1 }, "creative"),
    );

    // Undo only the second
    const undone = applyFootprintUndo(state);

    expect(undone.riasec_raw.R).toEqual([4]); // First still present
    expect(undone.riasec_raw.A).toEqual([]);   // Second reversed
    expect(undone.mi_raw.linguistic).toEqual([2]); // First still present
    expect(undone.mi_raw.spatial).toEqual([]);     // Second reversed
    expect(undone.strength_signals).toEqual([]);
    expect(undone.signal_history).toHaveLength(1);
  });
});

describe("ipsative undo", () => {
  it("processIpsativeResponse followed by removeLastResponse returns riasec_ipsative_raw to original", () => {
    const state = makeEmptyState();
    // Simulate ipsative: R=5, I=3, A=1
    state.riasec_ipsative_raw.R = [5];
    state.riasec_ipsative_raw.I = [3];
    state.riasec_ipsative_raw.A = [1];
    state.signal_history = [
      buildIpsativeFootprint("q-ips-1", [
        { type: "R", rank: 1 },
        { type: "I", rank: 2 },
        { type: "A", rank: 3 },
      ]),
    ];

    const undone = applyFootprintUndo(state);

    expect(undone.riasec_ipsative_raw.R).toEqual([]);
    expect(undone.riasec_ipsative_raw.I).toEqual([]);
    expect(undone.riasec_ipsative_raw.A).toEqual([]);
    expect(undone.signal_history).toEqual([]);
  });
});

describe("single-framework undo", () => {
  it("processResponse (riasec) followed by removeLastResponse returns riasec_raw to original", () => {
    const state = makeEmptyState();
    const response = {
      question_id: "q-riasec-1",
      response_value: 4,
      response_label: "Agree",
      framework: "riasec",
      framework_target: "S",
      answered_at: Date.now(),
    };
    const footprint = buildProcessResponseFootprint(response);
    state.riasec_raw.S = [4];
    state.signal_history = [footprint];

    const undone = applyFootprintUndo(state);

    expect(undone.riasec_raw.S).toEqual([]);
    expect(undone.signal_history).toEqual([]);
  });

  it("processResponse (mbti) followed by removeLastResponse returns mbti_raw to original", () => {
    const state = makeEmptyState();
    const response = {
      question_id: "q-mbti-1",
      response_value: 2,
      response_label: "Intuition",
      framework: "mbti",
      framework_target: "SN",
      answered_at: Date.now(),
    };
    const footprint = buildProcessResponseFootprint(response);
    state.mbti_raw.SN = [2];
    state.signal_history = [footprint];

    const undone = applyFootprintUndo(state);

    expect(undone.mbti_raw.SN).toEqual([]);
    expect(undone.signal_history).toEqual([]);
  });
});

describe("empty signal_history undo", () => {
  it("removeLastResponse with empty signal_history is a no-op", () => {
    const state = makeEmptyState();
    // Add some data to make sure it does NOT get modified
    state.riasec_raw.R = [3, 4];
    state.mi_raw.bodily = [1];
    state.mbti_raw.EI = [2];

    const undone = applyFootprintUndo(state);

    // State should be unchanged
    expect(undone.riasec_raw.R).toEqual([3, 4]);
    expect(undone.mi_raw.bodily).toEqual([1]);
    expect(undone.mbti_raw.EI).toEqual([2]);
    expect(undone.signal_history).toEqual([]);
  });
});
