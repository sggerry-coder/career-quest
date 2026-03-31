"use client";

import { useCallback, useState } from "react";
import type { ClientResponse, QuestionBlock } from "@/lib/types/quest";

export interface QuestState {
  current_block: QuestionBlock;
  current_question_index: number;
  questions_answered: number;
  responses: ClientResponse[];
  selected_adaptive_ids: string[];
  persistence_failed: boolean;
  discovery_mode_active: boolean;
  last_response_undoable: boolean;
}

const INITIAL_STATE: QuestState = {
  current_block: "warmup",
  current_question_index: 0,
  questions_answered: 0,
  responses: [],
  selected_adaptive_ids: [],
  persistence_failed: false,
  discovery_mode_active: false,
  last_response_undoable: false,
};

/**
 * Detect if discovery mode should trigger:
 * 3+ consecutive Likert responses in the RIASEC block are exactly 3 (neutral).
 */
function shouldTriggerDiscoveryMode(responses: ClientResponse[]): boolean {
  const riasecResponses = responses.filter(
    (r) => r.framework === "riasec"
  );
  if (riasecResponses.length < 3) return false;

  const lastThree = riasecResponses.slice(-3);
  return lastThree.every((r) => r.response_value === 3);
}

export function useQuestState(initialState?: Partial<QuestState>) {
  const [state, setState] = useState<QuestState>({
    ...INITIAL_STATE,
    ...initialState,
  });

  const answerQuestion = useCallback(
    (response: ClientResponse) => {
      setState((prev) => {
        const newResponses = [...prev.responses, response];
        const newQuestionsAnswered = prev.questions_answered + 1;

        // Check discovery mode trigger (only in riasec block, not already active)
        let discoveryMode = prev.discovery_mode_active;
        if (
          !discoveryMode &&
          prev.current_block === "riasec" &&
          response.framework === "riasec"
        ) {
          discoveryMode = shouldTriggerDiscoveryMode(newResponses);
        }

        return {
          ...prev,
          responses: newResponses,
          questions_answered: newQuestionsAnswered,
          current_question_index: prev.current_question_index + 1,
          discovery_mode_active: discoveryMode,
          last_response_undoable: true,
        };
      });
    },
    []
  );

  const undoLastAnswer = useCallback(() => {
    setState((prev) => {
      if (!prev.last_response_undoable || prev.responses.length === 0) {
        return prev;
      }

      return {
        ...prev,
        responses: prev.responses.slice(0, -1),
        questions_answered: prev.questions_answered - 1,
        current_question_index: Math.max(0, prev.current_question_index - 1),
        last_response_undoable: false,
      };
    });
  }, []);

  const advanceBlock = useCallback((nextBlock: QuestionBlock) => {
    setState((prev) => ({
      ...prev,
      current_block: nextBlock,
      current_question_index: 0,
      last_response_undoable: false,
    }));
  }, []);

  const triggerDiscoveryMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      discovery_mode_active: true,
    }));
  }, []);

  const setSelectedAdaptiveIds = useCallback((ids: string[]) => {
    setState((prev) => ({
      ...prev,
      selected_adaptive_ids: ids,
    }));
  }, []);

  const setPersistenceFailed = useCallback((failed: boolean) => {
    setState((prev) => ({
      ...prev,
      persistence_failed: failed,
    }));
  }, []);

  return {
    state,
    answerQuestion,
    undoLastAnswer,
    advanceBlock,
    triggerDiscoveryMode,
    setSelectedAdaptiveIds,
    setPersistenceFailed,
  };
}
