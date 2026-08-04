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
  | "class_named"
  | "engagement"
  | "selfmap"
  | "reveal"
  | "confirmatory"
  | "complete";

export type QuestAction =
  | { type: "ANSWER_QUESTION"; response: ClientResponse; question: Question; sessionQuestions: Question[] }
  | { type: "ANSWER_IPSATIVE"; response: ClientResponse; sessionQuestions: Question[] }
  | { type: "DISMISS_ENGAGEMENT" }
  | { type: "DISMISS_BLOCK_TRANSITION" }
  | { type: "SHOW_CLASS_NAMED" }
  | { type: "DISMISS_CLASS_NAMED" }
  | { type: "ENTER_SELFMAP" }
  | { type: "ENTER_REVEAL" }
  | { type: "ENTER_CONFIRMATORY"; adaptiveQuestions: Question[] }
  | { type: "ANSWER_CONFIRMATORY"; response: ClientResponse }
  | { type: "COMPLETE_SESSION" }
  | { type: "UNDO" }
  | { type: "SKIP"; sessionQuestions: Question[] }
  | { type: "SET_AVATAR_CLASS"; avatarClass: string }
  | { type: "RESTORE_STATE"; state: QuestState };

export interface QuestState {
  flowPhase: FlowPhase;
  currentIndex: number;
  direction: "left" | "right";
  transitionNarration: string;
  adaptiveQuestions: Question[];
  confirmIndex: number;
  current_block: QuestionBlock;
  questions_answered: number;
  responses: ClientResponse[];
  selected_adaptive_ids: string[];
  persistence_failed: boolean;
  last_response_undoable: boolean;
  engagementShown: boolean;
  avatarClass: string;
  /**
   * True when useEmergentClass raised a naming event while an interstitial
   * (block transition, engagement checkpoint) other than "questions" was
   * on screen. Showing the naming screen right then would
   * cut the interstitial off mid-flight -- its narration, its 1500ms visible
   * timer, its exit animation -- so the flag defers it instead: every
   * DISMISS_* action that would otherwise return flowPhase to "questions"
   * consults it first (see resolveDismissal) and routes to "class_named"
   * instead, clearing the flag in the same dispatch. A student who
   * checkpoints while this is true still gets their moment after resuming
   * and dismissing whatever they were looking at -- the flag round-trips
   * through the snapshot along with the rest of QuestState.
   */
  classNamedPending: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENGAGEMENT_OFFSET = 7;

const INITIAL_STATE: QuestState = {
  flowPhase: "questions",
  currentIndex: 0,
  direction: "right",
  transitionNarration: "",
  adaptiveQuestions: [],
  confirmIndex: 0,
  current_block: "warmup",
  questions_answered: 0,
  responses: [],
  selected_adaptive_ids: [],
  persistence_failed: false,
  last_response_undoable: false,
  engagementShown: false,
  avatarClass: "wanderer",
  classNamedPending: false,
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
 * Derive a transition narration key from the block pair.
 */
function getTransitionNarration(fromBlock: string, toBlock: string): string {
  return `${fromBlock}_to_${toBlock}`;
}

/**
 * Where a DISMISS_* action should send flow control: the naming screen if a
 * naming event queued up behind the interstitial that is dismissing, plain
 * "questions" otherwise. Consulted by every DISMISS_* action that would
 * otherwise unconditionally return to "questions", so a naming event raised
 * while an interstitial had the screen is never lost, and -- because the
 * flag is cleared here, in the same dispatch that consumes it -- never
 * doubles up once shown either.
 */
function resolveDismissal(
  state: QuestState
): Pick<QuestState, "flowPhase" | "classNamedPending"> {
  return state.classNamedPending
    ? { flowPhase: "class_named", classNamedPending: false }
    : { flowPhase: "questions", classNamedPending: false };
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
        ...resolveDismissal(state),
      };

    case "DISMISS_BLOCK_TRANSITION":
      return {
        ...state,
        ...resolveDismissal(state),
      };

    case "SHOW_CLASS_NAMED":
      if (state.flowPhase !== "questions") {
        // Another interstitial already has the screen -- preempting it here
        // would cut its narration/timer off mid-flight (the defect this
        // guards against: the block-transition beat right before a first
        // naming was routinely skipped this way). Remember the naming
        // instead; resolveDismissal picks it up once that interstitial
        // dismisses on its own.
        return {
          ...state,
          classNamedPending: true,
        };
      }
      return {
        ...state,
        flowPhase: "class_named",
      };

    case "DISMISS_CLASS_NAMED":
      return {
        ...state,
        flowPhase: "questions",
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

    case "RESTORE_STATE": {
      // Rehydrate a mid-session checkpoint (P1.1). Merge over INITIAL_STATE
      // so any field missing from an older snapshot falls back to a safe
      // default, and clamp numeric fields to preserve reducer invariants.
      const restored = action.state;
      return {
        ...INITIAL_STATE,
        ...restored,
        currentIndex: Math.max(0, restored.currentIndex ?? 0),
        confirmIndex: Math.max(0, restored.confirmIndex ?? 0),
        questions_answered: Math.max(0, restored.questions_answered ?? 0),
        responses: restored.responses ?? [],
        adaptiveQuestions: restored.adaptiveQuestions ?? [],
        // A restored answer is never undoable: score-state footprints for it
        // were rebuilt from the snapshot, but the pre-answer UI position wasn't.
        last_response_undoable: false,
        direction: "right",
        persistence_failed: false,
      };
    }

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
