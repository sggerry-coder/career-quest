"use client";

import { useCallback, useState } from "react";
import type { ClientResponse } from "@/lib/types/quest";
import {
  calculateAllRiasec,
  mergeIpsativeScores,
  detectAcquiescenceBias,
  detectStraightLining,
  deriveClassLabel,
} from "@/lib/scoring/riasec";
import { calculateAllMi } from "@/lib/scoring/mi";
import {
  calculateAllMbti,
} from "@/lib/scoring/mbti";
import { calculateAllValues } from "@/lib/scoring/values";
import { reverseLikert } from "@/lib/scoring/likert";
import { getTopStrengths } from "@/lib/scoring/strengths";

export interface ResponseSignalFootprint {
  question_id: string;
  riasec_additions: Record<string, number[]>;
  mi_additions: Record<string, number[]>;
  mbti_additions: Record<string, number[]>;
  values_additions: Record<string, number[]>;
  ipsative_additions: Record<string, number[]>;
  strength_signal?: string;
  /** The raw answer appended to rating_responses, for undo. */
  rating_response?: number;
}

export interface ScoreState {
  riasec: Record<string, number>;
  riasec_raw: Record<string, number[]>;
  riasec_ipsative_raw: Record<string, number[]>;
  mi: Record<string, number>;
  mi_raw: Record<string, number[]>;
  mbti: Record<string, number>;
  mbti_raw: Record<string, number[]>;
  values: Record<string, number>;
  values_raw: Record<string, number[]>;
  strengths: string[];
  strength_signals: string[];
  /**
   * Every rating (Likert) answer in the order it was given, exactly as the
   * student gave it -- never reverse-flipped. Straight-lining is a pattern in
   * the taps, and reverse scoring erases it from the scores, so the scores
   * cannot be asked about it. See detectStraightLining.
   */
  rating_responses: number[];
  acquiescence_flag: boolean;
  riasec_snapshot: Record<string, number> | null;
  class_label: string;
  signal_history: ResponseSignalFootprint[];
}

const INITIAL_RIASEC_RAW: Record<string, number[]> = {
  R: [],
  I: [],
  A: [],
  S: [],
  E: [],
  C: [],
};

const INITIAL_MI_RAW: Record<string, number[]> = {
  linguistic: [],
  logical: [],
  spatial: [],
  musical: [],
  bodily: [],
  interpersonal: [],
  intrapersonal: [],
  naturalistic: [],
};

const INITIAL_MBTI_RAW: Record<string, number[]> = {
  EI: [],
  SN: [],
  TF: [],
  JP: [],
};

const INITIAL_VALUES_RAW: Record<string, number[]> = {
  security_adventure: [],
  income_impact: [],
  prestige_fulfilment: [],
  structure_flexibility: [],
  solo_team: [],
};

function cloneRaw(raw: Record<string, number[]>): Record<string, number[]> {
  const clone: Record<string, number[]> = {};
  for (const [key, arr] of Object.entries(raw)) {
    clone[key] = [...arr];
  }
  return clone;
}

/**
 * The value that should enter the raw score arrays.
 *
 * Reverse-worded rating items measure their type negatively — "I would rather
 * sit in a library than work outdoors with tools" is evidence *against*
 * Realistic. They were previously added as-is, so four of the six RIASEC types
 * had half their rating evidence counted upside-down.
 *
 * Only rating (Likert) items are flipped. Ipsative, forced-choice and spectrum
 * items use their own ranges and are never marked reverse_scored.
 */
export function scoredValue(response: ClientResponse): number {
  return response.reverse_scored
    ? reverseLikert(response.response_value)
    : response.response_value;
}

/**
 * Build a signal footprint for a single-framework processResponse call.
 */
export function buildProcessResponseFootprint(
  response: ClientResponse
): ResponseSignalFootprint {
  const footprint: ResponseSignalFootprint = {
    question_id: response.question_id,
    riasec_additions: {},
    mi_additions: {},
    mbti_additions: {},
    values_additions: {},
    ipsative_additions: {},
  };

  if (response.framework === "riasec" && response.framework_target !== "none") {
    footprint.riasec_additions[response.framework_target] = [scoredValue(response)];
    footprint.rating_response = response.response_value;
  } else if (response.framework === "mbti" && response.framework_target !== "none") {
    footprint.mbti_additions[response.framework_target] = [response.response_value];
  } else if (response.framework === "values" && response.framework_target !== "none") {
    footprint.values_additions[response.framework_target] = [response.response_value];
  }

  return footprint;
}

/**
 * Build a signal footprint for a multi-framework processResponseWithSignals call.
 */
export function buildSignalsFootprint(
  questionId: string,
  frameworkSignals: Record<string, number>,
  strengthSignal?: string
): ResponseSignalFootprint {
  const footprint: ResponseSignalFootprint = {
    question_id: questionId,
    riasec_additions: {},
    mi_additions: {},
    mbti_additions: {},
    values_additions: {},
    ipsative_additions: {},
    strength_signal: strengthSignal,
  };

  for (const [key, weight] of Object.entries(frameworkSignals)) {
    if (key.startsWith("riasec_")) {
      const type = key.replace("riasec_", "");
      footprint.riasec_additions[type] = [weight >= 2 ? 4 : 3];
    } else if (key.startsWith("mi_")) {
      const dim = key.replace("mi_", "");
      footprint.mi_additions[dim] = [weight];
    } else {
      // Direct MI dimension key
      footprint.mi_additions[key] = [weight];
    }
  }

  return footprint;
}

/**
 * Build a signal footprint for an ipsative response.
 */
export function buildIpsativeFootprint(
  questionId: string,
  rankings: Array<{ type: string; rank: number }>
): ResponseSignalFootprint {
  const rankToScore: Record<number, number> = { 1: 5, 2: 3, 3: 1 };
  const footprint: ResponseSignalFootprint = {
    question_id: questionId,
    riasec_additions: {},
    mi_additions: {},
    mbti_additions: {},
    values_additions: {},
    ipsative_additions: {},
  };

  for (const { type, rank } of rankings) {
    const score = rankToScore[rank] ?? 1;
    footprint.ipsative_additions[type] = [score];
  }

  return footprint;
}

/**
 * Whether these answers can be trusted to tell one interest from another.
 *
 * Two independent ways of failing that, both of which leave the profile
 * unusable for guidance: the student tapped the same button over and over
 * (visible only in the responses, since reverse scoring rearranges it out of
 * the scores), or the scores came out top-heavy on all six types at once
 * (visible only in the scores). Either one sets the flag.
 */
function detectUndiscriminatingAnswers(state: ScoreState): boolean {
  return (
    detectStraightLining(state.rating_responses) ||
    detectAcquiescenceBias(state.riasec)
  );
}

/**
 * Recalculate all derived scores from raw arrays.
 * Used after undo to ensure consistency.
 */
function recalculateAllDerived(state: ScoreState): void {
  const likertNorm = calculateAllRiasec(state.riasec_raw);
  const hasIpsative = Object.values(state.riasec_ipsative_raw).some(
    (arr) => arr.length > 0
  );
  if (hasIpsative) {
    const ipsativeNorm = calculateAllRiasec(state.riasec_ipsative_raw);
    state.riasec = mergeIpsativeScores(likertNorm, ipsativeNorm);
  } else {
    state.riasec = likertNorm;
  }
  state.acquiescence_flag = detectUndiscriminatingAnswers(state);
  state.class_label = deriveClassLabel(state.riasec);
  state.mi = calculateAllMi(state.mi_raw);
  state.mbti = calculateAllMbti(state.mbti_raw);
  state.values = calculateAllValues(state.values_raw);
  state.strengths = getTopStrengths(state.strength_signals, 5);
}

/**
 * Pure function: apply undo by popping the last signal footprint and reversing its mutations.
 * Returns a new ScoreState with the last response's effects removed.
 */
export function applyFootprintUndo(prev: ScoreState): ScoreState {
  if (prev.signal_history.length === 0) {
    return prev;
  }

  const next = structuredClone(prev);
  const footprint = next.signal_history.pop()!;

  // Reverse riasec_raw additions
  for (const [key, values] of Object.entries(footprint.riasec_additions)) {
    const arr = next.riasec_raw[key];
    if (arr) {
      arr.splice(arr.length - values.length, values.length);
    }
  }

  // Reverse mi_raw additions
  for (const [key, values] of Object.entries(footprint.mi_additions)) {
    const arr = next.mi_raw[key];
    if (arr) {
      arr.splice(arr.length - values.length, values.length);
    }
  }

  // Reverse mbti_raw additions
  for (const [key, values] of Object.entries(footprint.mbti_additions)) {
    const arr = next.mbti_raw[key];
    if (arr) {
      arr.splice(arr.length - values.length, values.length);
    }
  }

  // Reverse values_raw additions
  for (const [key, values] of Object.entries(footprint.values_additions)) {
    const arr = next.values_raw[key];
    if (arr) {
      arr.splice(arr.length - values.length, values.length);
    }
  }

  // Reverse ipsative_raw additions
  for (const [key, values] of Object.entries(footprint.ipsative_additions)) {
    const arr = next.riasec_ipsative_raw[key];
    if (arr) {
      arr.splice(arr.length - values.length, values.length);
    }
  }

  // Reverse the rating answer -- always the last one, since rating_responses
  // is append-only and footprints are popped newest first.
  if (footprint.rating_response !== undefined) {
    next.rating_responses.pop();
  }

  // Reverse strength signal
  if (footprint.strength_signal) {
    const idx = next.strength_signals.lastIndexOf(footprint.strength_signal);
    if (idx !== -1) {
      next.strength_signals.splice(idx, 1);
    }
  }

  // Recalculate all derived scores
  recalculateAllDerived(next);

  return next;
}

const INITIAL_SCORE_STATE: ScoreState = {
  riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
  riasec_raw: cloneRaw(INITIAL_RIASEC_RAW),
  riasec_ipsative_raw: cloneRaw(INITIAL_RIASEC_RAW),
  mi: {
    linguistic: 0,
    logical: 0,
    spatial: 0,
    musical: 0,
    bodily: 0,
    interpersonal: 0,
    intrapersonal: 0,
    naturalistic: 0,
  },
  mi_raw: cloneRaw(INITIAL_MI_RAW),
  mbti: { EI: 0, SN: 0, TF: 0, JP: 0 },
  mbti_raw: cloneRaw(INITIAL_MBTI_RAW),
  values: {
    security_adventure: 0,
    income_impact: 0,
    prestige_fulfilment: 0,
    structure_flexibility: 0,
    solo_team: 0,
  },
  values_raw: cloneRaw(INITIAL_VALUES_RAW),
  strengths: [],
  strength_signals: [],
  rating_responses: [],
  acquiescence_flag: false,
  riasec_snapshot: null,
  class_label: "SEEKER",
  signal_history: [],
};

export function useScores() {
  const [scoreState, setScoreState] = useState<ScoreState>(
    structuredClone(INITIAL_SCORE_STATE)
  );

  const processResponse = useCallback((response: ClientResponse) => {
    setScoreState((prev) => {
      const next = structuredClone(prev);

      // Build signal footprint for undo tracking
      const footprint = buildProcessResponseFootprint(response);

      if (response.framework === "riasec") {
        if (response.framework_target !== "none") {
          // Likert response -- append to riasec_raw
          next.riasec_raw[response.framework_target] = [
            ...(next.riasec_raw[response.framework_target] || []),
            scoredValue(response),
          ];
          // The tap, not the score: what straight-lining is visible in.
          next.rating_responses = [
            ...next.rating_responses,
            response.response_value,
          ];
        }
        // Recalculate RIASEC
        const likertNorm = calculateAllRiasec(next.riasec_raw);
        const hasIpsative = Object.values(next.riasec_ipsative_raw).some(
          (arr) => arr.length > 0
        );
        if (hasIpsative) {
          const ipsativeNorm = calculateAllRiasec(next.riasec_ipsative_raw);
          next.riasec = mergeIpsativeScores(likertNorm, ipsativeNorm);
        } else {
          next.riasec = likertNorm;
        }
        next.acquiescence_flag = detectUndiscriminatingAnswers(next);
        next.class_label = deriveClassLabel(next.riasec);
      } else if (response.framework === "mi") {
        // MI signals come via framework_signals on the option, not framework_target
        // The response_value is the option value; actual MI signals are processed
        // from the question option's framework_signals.
        // Since we don't have the full question here, MI raw updates are handled
        // by processResponseWithSignals below.
      } else if (response.framework === "mbti") {
        if (response.framework_target !== "none") {
          next.mbti_raw[response.framework_target] = [
            ...(next.mbti_raw[response.framework_target] || []),
            response.response_value,
          ];
        }
        next.mbti = calculateAllMbti(next.mbti_raw);
      } else if (response.framework === "values") {
        if (response.framework_target !== "none") {
          next.values_raw[response.framework_target] = [
            ...(next.values_raw[response.framework_target] || []),
            response.response_value,
          ];
        }
        next.values = calculateAllValues(next.values_raw);
      }

      next.signal_history = [...next.signal_history, footprint];
      return next;
    });
  }, []);

  /**
   * Process a response along with its associated framework signals and strength signal.
   * Used for warm-up and MI questions where signals come from the selected option.
   */
  const processResponseWithSignals = useCallback(
    (
      response: ClientResponse,
      frameworkSignals: Record<string, number>,
      strengthSignal?: string
    ) => {
      setScoreState((prev) => {
        const next = structuredClone(prev);

        // Build signal footprint for undo tracking
        const footprint = buildSignalsFootprint(
          response.question_id,
          frameworkSignals,
          strengthSignal
        );

        // Process framework signals (e.g., riasec_R: 2, mi_bodily: 1)
        for (const [key, weight] of Object.entries(frameworkSignals)) {
          if (key.startsWith("riasec_")) {
            const type = key.replace("riasec_", "");
            next.riasec_raw[type] = [
              ...(next.riasec_raw[type] || []),
              // Convert signal weight to Likert-scale equivalent for normalization
              // Signal weights of 1-2 map to moderate-high interest
              weight >= 2 ? 4 : 3,
            ];
          } else if (key.startsWith("mi_")) {
            const dim = key.replace("mi_", "");
            next.mi_raw[dim] = [...(next.mi_raw[dim] || []), weight];
          } else {
            // Direct MI dimension key (e.g., "linguistic", "spatial")
            next.mi_raw[key] = [...(next.mi_raw[key] || []), weight];
          }
        }

        // Process strength signal
        if (strengthSignal) {
          next.strength_signals = [...next.strength_signals, strengthSignal];
          next.strengths = getTopStrengths(next.strength_signals, 5);
        }

        // Recalculate all affected scores
        const likertNorm = calculateAllRiasec(next.riasec_raw);
        const hasIpsative = Object.values(next.riasec_ipsative_raw).some(
          (arr) => arr.length > 0
        );
        if (hasIpsative) {
          const ipsativeNorm = calculateAllRiasec(next.riasec_ipsative_raw);
          next.riasec = mergeIpsativeScores(likertNorm, ipsativeNorm);
        } else {
          next.riasec = likertNorm;
        }
        next.acquiescence_flag = detectUndiscriminatingAnswers(next);
        next.class_label = deriveClassLabel(next.riasec);
        next.mi = calculateAllMi(next.mi_raw);

        next.signal_history = [...next.signal_history, footprint];
        return next;
      });
    },
    []
  );

  /**
   * Process an ipsative response (rank-order). Called once per ipsative question
   * with the rankings for each option's RIASEC type.
   */
  const processIpsativeResponse = useCallback(
    (rankings: Array<{ type: string; rank: number }>, questionId: string = "ipsative") => {
      setScoreState((prev) => {
        const next = structuredClone(prev);

        // Build signal footprint for undo tracking
        const footprint = buildIpsativeFootprint(questionId, rankings);

        // Convert ranks to scores: 1st=5, 2nd=3, 3rd=1
        const rankToScore: Record<number, number> = { 1: 5, 2: 3, 3: 1 };

        for (const { type, rank } of rankings) {
          const score = rankToScore[rank] ?? 1;
          next.riasec_ipsative_raw[type] = [
            ...(next.riasec_ipsative_raw[type] || []),
            score,
          ];
        }

        // Recalculate RIASEC with ipsative merge
        const likertNorm = calculateAllRiasec(next.riasec_raw);
        const ipsativeNorm = calculateAllRiasec(next.riasec_ipsative_raw);
        next.riasec = mergeIpsativeScores(likertNorm, ipsativeNorm);
        next.acquiescence_flag = detectUndiscriminatingAnswers(next);
        next.class_label = deriveClassLabel(next.riasec);

        next.signal_history = [...next.signal_history, footprint];
        return next;
      });
    },
    []
  );

  /**
   * Take a snapshot of current RIASEC scores (before confirmatory round).
   */
  const takeSnapshot = useCallback(() => {
    setScoreState((prev) => ({
      ...prev,
      riasec_snapshot: { ...prev.riasec },
    }));
  }, []);

  /**
   * Remove the last processed response from raw scores using signal footprint history.
   * Used by undo. Pops the last footprint and reverses all its mutations atomically.
   */
  const removeLastResponse = useCallback(() => {
    setScoreState((prev) => applyFootprintUndo(prev));
  }, []);

  /**
   * Rehydrate score state from a mid-session checkpoint (P1.1).
   * Derived scores are recalculated from the restored raw arrays so a stale
   * or hand-edited snapshot can never leave derived values inconsistent.
   */
  const restoreScores = useCallback((restored: ScoreState) => {
    setScoreState(() => {
      const next = structuredClone({
        ...structuredClone(INITIAL_SCORE_STATE),
        ...restored,
      });
      recalculateAllDerived(next);
      return next;
    });
  }, []);

  return {
    scoreState,
    processResponse,
    processResponseWithSignals,
    processIpsativeResponse,
    takeSnapshot,
    removeLastResponse,
    restoreScores,
  };
}
