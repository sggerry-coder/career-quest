import { describe, it, expect } from "vitest";
import {
  questReducer,
  type QuestState,
  type QuestAction,
} from "@/hooks/use-quest-state";
import { session1CoreQuestions } from "@/data/questions/session-1-core";
import type { ClientResponse, Question } from "@/lib/types/quest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(
  questionId: string,
  value: number,
  framework: string,
  target: string
): ClientResponse {
  return {
    question_id: questionId,
    response_value: value,
    response_label: `value-${value}`,
    framework,
    framework_target: target,
    answered_at: Date.now(),
  };
}

function makeInitialState(overrides?: Partial<QuestState>): QuestState {
  return {
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
    ...overrides,
  };
}

/**
 * Build a state that has already answered up to (but not including) the given index.
 * Fills responses with dummy data matching the question at each prior index.
 */
function stateAtIndex(index: number, extra?: Partial<QuestState>): QuestState {
  const responses: ClientResponse[] = [];
  for (let i = 0; i < index; i++) {
    const q = session1CoreQuestions[i];
    responses.push(
      makeResponse(q.id, 3, q.framework, q.framework_target)
    );
  }
  return makeInitialState({
    currentIndex: index,
    questions_answered: index,
    responses,
    current_block: session1CoreQuestions[index]?.block ?? "warmup",
    last_response_undoable: index > 0,
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("engagement checkpoint (FLOW-01)", () => {
  const RIASEC_START = 5; // first riasec question index
  const ENGAGEMENT_INDEX = RIASEC_START + 7; // = 12

  it("triggers engagement at index 12 (7th riasec answer) atomically", () => {
    // State: about to answer index 11 (7th riasec, 0-based from riasec start)
    const state = stateAtIndex(11);
    const q = session1CoreQuestions[11];
    const action: QuestAction = {
      type: "ANSWER_QUESTION",
      response: makeResponse(q.id, 4, q.framework, q.framework_target),
      question: q,
      sessionQuestions: session1CoreQuestions,
    };

    const next = questReducer(state, action);

    // Atomic: both flowPhase AND currentIndex updated in same dispatch
    expect(next.flowPhase).toBe("engagement");
    expect(next.currentIndex).toBe(ENGAGEMENT_INDEX);
    expect(next.engagementShown).toBe(true);
  });

  it("does NOT repeat engagement when engagementShown is already true", () => {
    const state = stateAtIndex(11, { engagementShown: true });
    const q = session1CoreQuestions[11];
    const action: QuestAction = {
      type: "ANSWER_QUESTION",
      response: makeResponse(q.id, 4, q.framework, q.framework_target),
      question: q,
      sessionQuestions: session1CoreQuestions,
    };

    const next = questReducer(state, action);

    expect(next.flowPhase).not.toBe("engagement");
    expect(next.currentIndex).toBe(12);
  });

  it("DISMISS_ENGAGEMENT resumes to questions phase", () => {
    const state = makeInitialState({
      flowPhase: "engagement",
      engagementShown: true,
      currentIndex: 12,
    });

    const next = questReducer(state, { type: "DISMISS_ENGAGEMENT" });

    expect(next.flowPhase).toBe("questions");
    expect(next.currentIndex).toBe(12); // index unchanged
  });
});

describe("block transitions", () => {
  it("transitions from warmup to riasec at index 5", () => {
    const state = stateAtIndex(4); // about to answer last warmup
    const q = session1CoreQuestions[4];
    const action: QuestAction = {
      type: "ANSWER_QUESTION",
      response: makeResponse(q.id, 2, q.framework, q.framework_target),
      question: q,
      sessionQuestions: session1CoreQuestions,
    };

    const next = questReducer(state, action);

    expect(next.flowPhase).toBe("block_transition");
    expect(next.currentIndex).toBe(5);
  });

  it("transitions from riasec to riasec_mi at index 19", () => {
    const state = stateAtIndex(18, { engagementShown: true });
    const q = session1CoreQuestions[18];
    const action: QuestAction = {
      type: "ANSWER_QUESTION",
      response: makeResponse(q.id, 2, q.framework, q.framework_target),
      question: q,
      sessionQuestions: session1CoreQuestions,
    };

    const next = questReducer(state, action);

    expect(next.flowPhase).toBe("block_transition");
    expect(next.currentIndex).toBe(19);
  });

  it("transitions to selfmap after last core question (index 34)", () => {
    const state = stateAtIndex(34, { engagementShown: true });
    const q = session1CoreQuestions[34];
    const action: QuestAction = {
      type: "ANSWER_QUESTION",
      response: makeResponse(q.id, 1, q.framework, q.framework_target),
      question: q,
      sessionQuestions: session1CoreQuestions,
    };

    const next = questReducer(state, action);

    expect(next.flowPhase).toBe("selfmap");
  });
});

describe("ANSWER_QUESTION basics", () => {
  it("increments currentIndex by 1", () => {
    const state = stateAtIndex(6, { engagementShown: true }); // mid-riasec, no block transition
    const q = session1CoreQuestions[6];
    const action: QuestAction = {
      type: "ANSWER_QUESTION",
      response: makeResponse(q.id, 4, q.framework, q.framework_target),
      question: q,
      sessionQuestions: session1CoreQuestions,
    };

    const next = questReducer(state, action);

    expect(next.currentIndex).toBe(7);
  });

  it("appends response to responses array", () => {
    const state = stateAtIndex(0);
    const q = session1CoreQuestions[0];
    const resp = makeResponse(q.id, 2, q.framework, q.framework_target);
    const action: QuestAction = {
      type: "ANSWER_QUESTION",
      response: resp,
      question: q,
      sessionQuestions: session1CoreQuestions,
    };

    const next = questReducer(state, action);

    expect(next.responses).toHaveLength(1);
    expect(next.responses[0].question_id).toBe(q.id);
  });

  it("increments questions_answered by 1", () => {
    const state = stateAtIndex(0);
    const q = session1CoreQuestions[0];
    const action: QuestAction = {
      type: "ANSWER_QUESTION",
      response: makeResponse(q.id, 2, q.framework, q.framework_target),
      question: q,
      sessionQuestions: session1CoreQuestions,
    };

    const next = questReducer(state, action);

    expect(next.questions_answered).toBe(1);
  });
});

describe("UNDO", () => {
  it("reverses last answer and decrements index", () => {
    const state = stateAtIndex(3, { last_response_undoable: true });

    const next = questReducer(state, { type: "UNDO" });

    expect(next.currentIndex).toBe(2);
    expect(next.responses).toHaveLength(2);
    expect(next.questions_answered).toBe(2);
    expect(next.last_response_undoable).toBe(false);
  });

  it("returns state unchanged when responses is empty", () => {
    const state = makeInitialState();

    const next = questReducer(state, { type: "UNDO" });

    expect(next).toBe(state); // referential equality -- no change
  });
});

describe("discovery mode", () => {
  it("triggers after 3 consecutive neutral riasec Likert responses", () => {
    // Build state where last 2 riasec responses were neutral (value 3)
    // We are about to answer the 3rd consecutive neutral
    const baseState = stateAtIndex(7, { engagementShown: true }); // index 7 is riasec
    // Override responses so last 2 riasec are neutral
    const responses = [...baseState.responses];
    responses[5] = makeResponse("s1-riasec-R-01", 3, "riasec", "R");
    responses[6] = makeResponse("s1-riasec-R-02", 3, "riasec", "R");

    const state: QuestState = {
      ...baseState,
      responses,
      consecutiveNeutrals: 2,
    };

    const q = session1CoreQuestions[7]; // riasec likert
    const action: QuestAction = {
      type: "ANSWER_QUESTION",
      response: makeResponse(q.id, 3, "riasec", q.framework_target),
      question: q,
      sessionQuestions: session1CoreQuestions,
    };

    const next = questReducer(state, action);

    expect(next.discovery_mode_active).toBe(true);
  });

  it("does not trigger if already active", () => {
    const state = stateAtIndex(7, {
      engagementShown: true,
      discovery_mode_active: true,
      consecutiveNeutrals: 2,
    });
    const q = session1CoreQuestions[7];
    const action: QuestAction = {
      type: "ANSWER_QUESTION",
      response: makeResponse(q.id, 3, "riasec", q.framework_target),
      question: q,
      sessionQuestions: session1CoreQuestions,
    };

    const next = questReducer(state, action);

    // Still true but no extra side effects
    expect(next.discovery_mode_active).toBe(true);
  });
});

describe("confirmatory round", () => {
  const fakeAdaptive: Question[] = [
    {
      id: "adaptive-1",
      session_number: 1,
      block: "confirmatory",
      question_text: "Adaptive Q1",
      question_type: "likert",
      options: [],
      reverse_scored: false,
      framework: "riasec",
      framework_target: "R",
      is_adaptive: true,
    },
    {
      id: "adaptive-2",
      session_number: 1,
      block: "confirmatory",
      question_text: "Adaptive Q2",
      question_type: "likert",
      options: [],
      reverse_scored: false,
      framework: "riasec",
      framework_target: "I",
      is_adaptive: true,
    },
  ];

  it("ANSWER_CONFIRMATORY advances confirmIndex", () => {
    const state = makeInitialState({
      flowPhase: "confirmatory",
      adaptiveQuestions: fakeAdaptive,
      confirmIndex: 0,
    });

    const next = questReducer(state, {
      type: "ANSWER_CONFIRMATORY",
      response: makeResponse("adaptive-1", 4, "riasec", "R"),
    });

    expect(next.confirmIndex).toBe(1);
    expect(next.flowPhase).toBe("confirmatory"); // not complete yet
  });

  it("ANSWER_CONFIRMATORY at last adaptive question sets flowPhase to complete", () => {
    const state = makeInitialState({
      flowPhase: "confirmatory",
      adaptiveQuestions: fakeAdaptive,
      confirmIndex: 1, // last question
    });

    const next = questReducer(state, {
      type: "ANSWER_CONFIRMATORY",
      response: makeResponse("adaptive-2", 5, "riasec", "I"),
    });

    expect(next.flowPhase).toBe("complete");
  });
});

describe("other actions", () => {
  it("SET_AVATAR_CLASS updates avatarClass", () => {
    const state = makeInitialState();

    const next = questReducer(state, {
      type: "SET_AVATAR_CLASS",
      avatarClass: "investigator",
    });

    expect(next.avatarClass).toBe("investigator");
  });

  it("SKIP advances index without adding a response", () => {
    const state = stateAtIndex(6, { engagementShown: true });
    const responsesCount = state.responses.length;

    const next = questReducer(state, {
      type: "SKIP",
      sessionQuestions: session1CoreQuestions,
    });

    expect(next.currentIndex).toBe(7);
    expect(next.responses).toHaveLength(responsesCount); // unchanged
  });

  it("COMPLETE_SESSION sets flowPhase to complete", () => {
    const state = makeInitialState({ flowPhase: "reveal" });

    const next = questReducer(state, { type: "COMPLETE_SESSION" });

    expect(next.flowPhase).toBe("complete");
  });

  it("ENTER_REVEAL sets flowPhase to reveal", () => {
    const state = makeInitialState({ flowPhase: "selfmap" });

    const next = questReducer(state, { type: "ENTER_REVEAL" });

    expect(next.flowPhase).toBe("reveal");
  });

  it("ENTER_SELFMAP sets flowPhase to selfmap", () => {
    const state = makeInitialState({ flowPhase: "questions" });

    const next = questReducer(state, { type: "ENTER_SELFMAP" });

    expect(next.flowPhase).toBe("selfmap");
  });

  it("SHOW_DISCOVERY sets flowPhase to discovery_prompt", () => {
    const state = makeInitialState({ discovery_mode_active: true });

    const next = questReducer(state, { type: "SHOW_DISCOVERY" });

    expect(next.flowPhase).toBe("discovery_prompt");
  });

  it("DISMISS_DISCOVERY sets flowPhase back to questions", () => {
    const state = makeInitialState({ flowPhase: "discovery_prompt" });

    const next = questReducer(state, { type: "DISMISS_DISCOVERY" });

    expect(next.flowPhase).toBe("questions");
    expect(next.discovery_mode_active).toBe(true);
  });

  it("DISMISS_BLOCK_TRANSITION sets flowPhase back to questions", () => {
    const state = makeInitialState({
      flowPhase: "block_transition",
      currentIndex: 5,
    });

    const next = questReducer(state, { type: "DISMISS_BLOCK_TRANSITION" });

    expect(next.flowPhase).toBe("questions");
  });

  it("ENTER_CONFIRMATORY stores adaptive questions and resets confirmIndex", () => {
    const adaptive: Question[] = [
      {
        id: "a1",
        session_number: 1,
        block: "confirmatory",
        question_text: "Q",
        question_type: "likert",
        options: [],
        reverse_scored: false,
        framework: "riasec",
        framework_target: "R",
        is_adaptive: true,
      },
    ];
    const state = makeInitialState({ flowPhase: "reveal" });

    const next = questReducer(state, {
      type: "ENTER_CONFIRMATORY",
      adaptiveQuestions: adaptive,
    });

    expect(next.flowPhase).toBe("confirmatory");
    expect(next.adaptiveQuestions).toHaveLength(1);
    expect(next.confirmIndex).toBe(0);
  });
});

describe("RESTORE_STATE (P1.1 checkpoint resume)", () => {
  const RIASEC_START = 5;
  const ENGAGEMENT_INDEX = RIASEC_START + 7; // = 12

  function makeAdaptiveQuestion(id: string): Question {
    return {
      id,
      session_number: 1,
      block: "confirmatory",
      question_text: `adaptive ${id}`,
      question_type: "likert",
      options: [],
      reverse_scored: false,
      framework: "riasec",
      framework_target: "R",
      is_adaptive: true,
    };
  }

  it("preserves reducer invariants from a mid-riasec snapshot", () => {
    const snapshot = stateAtIndex(10, {
      engagementShown: false,
      consecutiveNeutrals: 2,
      discovery_mode_active: false,
      avatarClass: "mage",
    });

    const next = questReducer(makeInitialState(), {
      type: "RESTORE_STATE",
      state: snapshot,
    });

    expect(next.flowPhase).toBe("questions");
    expect(next.currentIndex).toBe(10);
    expect(next.questions_answered).toBe(10);
    expect(next.responses).toHaveLength(10);
    expect(next.current_block).toBe("riasec");
    expect(next.consecutiveNeutrals).toBe(2);
    expect(next.engagementShown).toBe(false);
    expect(next.avatarClass).toBe("mage");
    // Restored answers are never undoable; direction resets forward
    expect(next.last_response_undoable).toBe(false);
    expect(next.direction).toBe("right");
    expect(next.persistence_failed).toBe(false);
  });

  it("continues the flow correctly after restoring: engagement still fires once", () => {
    // Restore just before the engagement checkpoint with it not yet shown
    const restored = questReducer(makeInitialState(), {
      type: "RESTORE_STATE",
      state: stateAtIndex(11, { engagementShown: false }),
    });

    const q = session1CoreQuestions[11];
    const next = questReducer(restored, {
      type: "ANSWER_QUESTION",
      response: makeResponse(q.id, 4, q.framework, q.framework_target),
      question: q,
      sessionQuestions: session1CoreQuestions,
    });

    expect(next.flowPhase).toBe("engagement");
    expect(next.currentIndex).toBe(ENGAGEMENT_INDEX);
  });

  it("does NOT re-fire engagement when the snapshot already showed it", () => {
    const restored = questReducer(makeInitialState(), {
      type: "RESTORE_STATE",
      state: stateAtIndex(11, { engagementShown: true }),
    });

    const q = session1CoreQuestions[11];
    const next = questReducer(restored, {
      type: "ANSWER_QUESTION",
      response: makeResponse(q.id, 4, q.framework, q.framework_target),
      question: q,
      sessionQuestions: session1CoreQuestions,
    });

    expect(next.flowPhase).not.toBe("engagement");
    expect(next.currentIndex).toBe(12);
  });

  it("restores into confirmatory with adaptive questions and finishes cleanly", () => {
    const adaptive = [makeAdaptiveQuestion("a1"), makeAdaptiveQuestion("a2")];
    const snapshot = makeInitialState({
      flowPhase: "confirmatory",
      currentIndex: 35,
      confirmIndex: 1,
      adaptiveQuestions: adaptive,
      questions_answered: 36,
    });

    const restored = questReducer(makeInitialState(), {
      type: "RESTORE_STATE",
      state: snapshot,
    });

    expect(restored.flowPhase).toBe("confirmatory");
    expect(restored.confirmIndex).toBe(1);
    expect(restored.adaptiveQuestions).toHaveLength(2);

    // Answering the last confirmatory question completes the session
    const next = questReducer(restored, {
      type: "ANSWER_CONFIRMATORY",
      response: makeResponse("a2", 4, "riasec", "R"),
    });
    expect(next.flowPhase).toBe("complete");
  });

  it("clamps corrupt numeric fields and fills missing ones with defaults", () => {
    const partial = {
      flowPhase: "questions",
      currentIndex: -3,
      confirmIndex: -1,
      questions_answered: -2,
      responses: [],
    } as unknown as QuestState;

    const next = questReducer(makeInitialState(), {
      type: "RESTORE_STATE",
      state: partial,
    });

    expect(next.currentIndex).toBe(0);
    expect(next.confirmIndex).toBe(0);
    expect(next.questions_answered).toBe(0);
    expect(next.adaptiveQuestions).toEqual([]);
    expect(next.current_block).toBe("warmup");
    expect(next.avatarClass).toBe("wanderer");
  });
});
