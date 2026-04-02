"use client";

import { useReducer } from "react";
import type {
  ClientResponse,
  Question,
  QuestionBlock,
} from "@/lib/types/quest";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FlowPhase =
  | "questions"
  | "block_transition"
  | "engagement"
  | "discovery_prompt"
  | "selfmap"
  | "reveal"
  | "confirmatory"
  | "complete";

export type QuestAction =
  | { type: "ANSWER_QUESTION"; response: ClientResponse; question: Question; sessionQuestions: Question[] }
  | { type: "ANSWER_IPSATIVE"; response: ClientResponse; sessionQuestions: Question[] }
  | { type: "DISMISS_ENGAGEMENT" }
  | { type: "DISMISS_BLOCK_TRANSITION" }
  | { type: "SHOW_DISCOVERY" }
  | { type: "DISMISS_DISCOVERY" }
  | { type: "ENTER_SELFMAP" }
  | { type: "ENTER_REVEAL" }
  | { type: "ENTER_CONFIRMATORY"; adaptiveQuestions: Question[] }
  | { type: "ANSWER_CONFIRMATORY"; response: ClientResponse }
  | { type: "COMPLETE_SESSION" }
  | { type: "UNDO" }
  | { type: "SKIP"; sessionQuestions: Question[] }
  | { type: "SET_AVATAR_CLASS"; avatarClass: string };

export interface QuestState {
  flowPhase: FlowPhase;
  currentIndex: number;
  direction: "left" | "right";
  transitionNarration: string;
  adaptiveQuestions: Question[];
  confirmIndex: number;
  consecutiveNeutrals: number;
  current_block: QuestionBlock;
  questions_answered: number;
  responses: ClientResponse[];
  selected_adaptive_ids: string[];
  persistence_failed: boolean;
  discovery_mode_active: boolean;
  last_response_undoable: boolean;
  engagementShown: boolean;
  avatarClass: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENGAGEMENT_OFFSET = 7;
const NEUTRAL_VALUE = 3;
const CONSECUTIVE_NEUTRAL_THRESHOLD = 3;

const INITIAL_STATE: QuestState = {
  flowPhase: "questions",
  currentIndex: 0,
  direction: "right",
  transitionNarration: "",
  adaptiveQuestions: [],
  confirmIndex: 0,
  consecutiveNeutrals: 0,
  current_block: "warmup",
  questions_answered: 0,
  responses: [],
  selected_adaptive_ids: [],
  persistence_failed: false,
  discovery_mode_active: false,
  last_response_undoable: false,
  engagementShown: false,
  avatarClass: "wanderer",
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Find the starting index of a given block in the question array.
 */
function findBlockStartIndex(block: string, questions: Question[]): number {
  return questions.findIndex((q) => q.block === block);
}

/**
 * Detect if discovery mode should trigger:
 * 3+ consecutive riasec responses with value === 3 (neutral).
 */
function shouldTriggerDiscoveryMode(responses: ClientResponse[]): boolean {
  const riasecResponses = responses.filter(
    (r) => r.framework === "riasec"
  );
  if (riasecResponses.length < CONSECUTIVE_NEUTRAL_THRESHOLD) return false;

  const lastThree = riasecResponses.slice(-CONSECUTIVE_NEUTRAL_THRESHOLD);
  return lastThree.every((r) => r.response_value === NEUTRAL_VALUE);
}

/**
 * Derive a transition narration key from the block pair.
 */
function getTransitionNarration(fromBlock: string, toBlock: string): string {
  return `${fromBlock}_to_${toBlock}`;
}

// ---------------------------------------------------------------------------
// Core flow logic (shared by ANSWER_QUESTION, ANSWER_IPSATIVE, SKIP)
// ---------------------------------------------------------------------------

interface FlowResult {
  flowPhase: FlowPhase;
  currentIndex: number;
  engagementShown: boolean;
  transitionNarration: string;
  current_block: QuestionBlock;
}

/**
 * Determine the next flow state after advancing to nextIndex.
 * This is the atomic transition logic that fixes FLOW-01.
 */
function computeFlowTransition(
  nextIndex: number,
  currentQuestion: Question,
  sessionQuestions: Question[],
  engagementShown: boolean,
  currentBlock: QuestionBlock
): FlowResult {
  // Check engagement checkpoint: riasec block, 7 answered
  if (!engagementShown && currentQuestion.block === "riasec") {
    const riasecStart = findBlockStartIndex("riasec", sessionQuestions);
    if (riasecStart >= 0 && nextIndex === riasecStart + ENGAGEMENT_OFFSET) {
      return {
        flowPhase: "engagement",
        currentIndex: nextIndex,
        engagementShown: true,
        transitionNarration: "",
        current_block: currentBlock,
      };
    }
  }

  // Check end of questions
  if (nextIndex >= sessionQuestions.length) {
    return {
      flowPhase: "selfmap",
      currentIndex: nextIndex,
      engagementShown,
      transitionNarration: "",
      current_block: currentBlock,
    };
  }

  // Check block transition
  const nextQuestion = sessionQuestions[nextIndex];
  if (nextQuestion && nextQuestion.block !== currentQuestion.block) {
    return {
      flowPhase: "block_transition",
      currentIndex: nextIndex,
      engagementShown,
      transitionNarration: getTransitionNarration(
        currentQuestion.block,
        nextQuestion.block
      ),
      current_block: nextQuestion.block,
    };
  }

  // Default: continue in questions phase
  return {
    flowPhase: "questions",
    currentIndex: nextIndex,
    engagementShown,
    transitionNarration: "",
    current_block: currentBlock,
  };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * Pure quest state reducer. All flow phase transitions happen atomically
 * within a single dispatch, eliminating the engagement checkpoint desync.
 */
export function questReducer(state: QuestState, action: QuestAction): QuestState {
  switch (action.type) {
    case "ANSWER_QUESTION": {
      const nextIndex = state.currentIndex + 1;
      const newResponses = [...state.responses, action.response];
      const questionsAnswered = state.questions_answered + 1;

      // Discovery mode detection
      let discoveryMode = state.discovery_mode_active;
      let consecutiveNeutrals = state.consecutiveNeutrals;
      if (
        !discoveryMode &&
        action.question.block === "riasec" &&
        action.question.question_type === "likert"
      ) {
        if (action.response.response_value === NEUTRAL_VALUE) {
          consecutiveNeutrals = state.consecutiveNeutrals + 1;
        } else {
          consecutiveNeutrals = 0;
        }
        if (consecutiveNeutrals >= CONSECUTIVE_NEUTRAL_THRESHOLD) {
          discoveryMode = true;
        }
        // Also check via full response history as fallback
        if (!discoveryMode && shouldTriggerDiscoveryMode(newResponses)) {
          discoveryMode = true;
        }
      }

      const flow = computeFlowTransition(
        nextIndex,
        action.question,
        action.sessionQuestions,
        state.engagementShown,
        state.current_block
      );

      return {
        ...state,
        currentIndex: flow.currentIndex,
        flowPhase: flow.flowPhase,
        engagementShown: flow.engagementShown,
        transitionNarration: flow.transitionNarration,
        current_block: flow.current_block,
        responses: newResponses,
        questions_answered: questionsAnswered,
        discovery_mode_active: discoveryMode,
        consecutiveNeutrals,
        last_response_undoable: true,
        direction: "right",
      };
    }

    case "ANSWER_IPSATIVE": {
      const nextIndex = state.currentIndex + 1;
      const newResponses = [...state.responses, action.response];
      const questionsAnswered = state.questions_answered + 1;

      // For ipsative we need the current question from sessionQuestions
      const currentQuestion = action.sessionQuestions[state.currentIndex];
      if (!currentQuestion) {
        return {
          ...state,
          responses: newResponses,
          questions_answered: questionsAnswered,
        };
      }

      const flow = computeFlowTransition(
        nextIndex,
        currentQuestion,
        action.sessionQuestions,
        state.engagementShown,
        state.current_block
      );

      return {
        ...state,
        currentIndex: flow.currentIndex,
        flowPhase: flow.flowPhase,
        engagementShown: flow.engagementShown,
        transitionNarration: flow.transitionNarration,
        current_block: flow.current_block,
        responses: newResponses,
        questions_answered: questionsAnswered,
        last_response_undoable: true,
        direction: "right",
      };
    }

    case "DISMISS_ENGAGEMENT":
      return {
        ...state,
        flowPhase: "questions",
      };

    case "DISMISS_BLOCK_TRANSITION":
      return {
        ...state,
        flowPhase: "questions",
      };

    case "SHOW_DISCOVERY":
      return {
        ...state,
        flowPhase: "discovery_prompt",
      };

    case "DISMISS_DISCOVERY":
      return {
        ...state,
        flowPhase: "questions",
        discovery_mode_active: true,
      };

    case "ENTER_SELFMAP":
      return {
        ...state,
        flowPhase: "selfmap",
      };

    case "ENTER_REVEAL":
      return {
        ...state,
        flowPhase: "reveal",
      };

    case "ENTER_CONFIRMATORY":
      return {
        ...state,
        flowPhase: "confirmatory",
        adaptiveQuestions: action.adaptiveQuestions,
        confirmIndex: 0,
      };

    case "ANSWER_CONFIRMATORY": {
      const nextConfirmIndex = state.confirmIndex + 1;
      const newResponses = [...state.responses, action.response];
      const isLast = nextConfirmIndex >= state.adaptiveQuestions.length;

      return {
        ...state,
        confirmIndex: nextConfirmIndex,
        responses: newResponses,
        questions_answered: state.questions_answered + 1,
        flowPhase: isLast ? "complete" : "confirmatory",
        last_response_undoable: true,
        direction: "right",
      };
    }

    case "COMPLETE_SESSION":
      return {
        ...state,
        flowPhase: "complete",
      };

    case "UNDO": {
      if (!state.last_response_undoable || state.responses.length === 0) {
        return state;
      }

      return {
        ...state,
        responses: state.responses.slice(0, -1),
        questions_answered: Math.max(0, state.questions_answered - 1),
        currentIndex: Math.max(0, state.currentIndex - 1),
        last_response_undoable: false,
        direction: "left",
      };
    }

    case "SKIP": {
      const nextIndex = state.currentIndex + 1;
      const currentQuestion = action.sessionQuestions[state.currentIndex];

      if (!currentQuestion) {
        return {
          ...state,
          flowPhase: "selfmap",
          currentIndex: nextIndex,
        };
      }

      const flow = computeFlowTransition(
        nextIndex,
        currentQuestion,
        action.sessionQuestions,
        state.engagementShown,
        state.current_block
      );

      return {
        ...state,
        currentIndex: flow.currentIndex,
        flowPhase: flow.flowPhase,
        engagementShown: flow.engagementShown,
        transitionNarration: flow.transitionNarration,
        current_block: flow.current_block,
        direction: "right",
      };
    }

    case "SET_AVATAR_CLASS":
      return {
        ...state,
        avatarClass: action.avatarClass,
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Quest state hook using useReducer for atomic state transitions.
 * Returns { state, dispatch } instead of individual callbacks.
 */
export function useQuestState(initialState?: Partial<QuestState>): {
  state: QuestState;
  dispatch: React.Dispatch<QuestAction>;
} {
  const [state, dispatch] = useReducer(questReducer, {
    ...INITIAL_STATE,
    ...initialState,
  });
  return { state, dispatch };
}
