"use client";

import { useCallback, useState } from "react";
import type { ClientResponse } from "@/lib/types/quest";
import {
  calculateRiasecType,
  calculateAllRiasec,
  mergeIpsativeScores,
  detectAcquiescenceBias,
  deriveClassLabel,
} from "@/lib/scoring/riasec";
import { calculateAllMi, getTopMi } from "@/lib/scoring/mi";
import {
  calculateAllMbti,
  deriveEmergingType,
} from "@/lib/scoring/mbti";
import { calculateAllValues } from "@/lib/scoring/values";
import { getTopStrengths } from "@/lib/scoring/strengths";

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
  acquiescence_flag: boolean;
  riasec_snapshot: Record<string, number> | null;
  class_label: string;
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
  acquiescence_flag: false,
  riasec_snapshot: null,
  class_label: "SEEKER",
};

export function useScores() {
  const [scoreState, setScoreState] = useState<ScoreState>(
    structuredClone(INITIAL_SCORE_STATE)
  );

  const processResponse = useCallback((response: ClientResponse) => {
    setScoreState((prev) => {
      const next = structuredClone(prev);

      if (response.framework === "riasec") {
        if (response.framework_target !== "none") {
          // Likert response — append to riasec_raw
          next.riasec_raw[response.framework_target] = [
            ...(next.riasec_raw[response.framework_target] || []),
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
        next.acquiescence_flag = detectAcquiescenceBias(next.riasec);
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
        next.acquiescence_flag = detectAcquiescenceBias(next.riasec);
        next.class_label = deriveClassLabel(next.riasec);
        next.mi = calculateAllMi(next.mi_raw);

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
    (rankings: Array<{ type: string; rank: number }>) => {
      setScoreState((prev) => {
        const next = structuredClone(prev);

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
        next.acquiescence_flag = detectAcquiescenceBias(next.riasec);
        next.class_label = deriveClassLabel(next.riasec);

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
   * Remove the last processed response from raw scores.
   * Used by undo. Recalculates all derived scores.
   */
  const removeLastResponse = useCallback(
    (response: ClientResponse) => {
      setScoreState((prev) => {
        const next = structuredClone(prev);

        if (response.framework === "riasec" && response.framework_target !== "none") {
          const arr = next.riasec_raw[response.framework_target];
          if (arr && arr.length > 0) {
            arr.pop();
          }
          const likertNorm = calculateAllRiasec(next.riasec_raw);
          const hasIpsative = Object.values(next.riasec_ipsative_raw).some(
            (a) => a.length > 0
          );
          if (hasIpsative) {
            const ipsativeNorm = calculateAllRiasec(next.riasec_ipsative_raw);
            next.riasec = mergeIpsativeScores(likertNorm, ipsativeNorm);
          } else {
            next.riasec = likertNorm;
          }
          next.acquiescence_flag = detectAcquiescenceBias(next.riasec);
          next.class_label = deriveClassLabel(next.riasec);
        } else if (response.framework === "mbti" && response.framework_target !== "none") {
          const arr = next.mbti_raw[response.framework_target];
          if (arr && arr.length > 0) {
            arr.pop();
          }
          next.mbti = calculateAllMbti(next.mbti_raw);
        } else if (response.framework === "values" && response.framework_target !== "none") {
          const arr = next.values_raw[response.framework_target];
          if (arr && arr.length > 0) {
            arr.pop();
          }
          next.values = calculateAllValues(next.values_raw);
        }

        return next;
      });
    },
    []
  );

  return {
    scoreState,
    processResponse,
    processResponseWithSignals,
    processIpsativeResponse,
    takeSnapshot,
    removeLastResponse,
  };
}
