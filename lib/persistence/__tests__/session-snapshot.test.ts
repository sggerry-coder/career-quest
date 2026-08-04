/**
 * @vitest-environment jsdom
 *
 * Locks in the mid-session checkpoint storage layer (P1.1):
 * save/load roundtrip, corruption rejection, version gating, per-student keys.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveSessionSnapshot,
  loadSessionSnapshot,
  clearSessionSnapshot,
  snapshotKey,
} from "@/lib/persistence/session-snapshot";
import { calculateAllMi, calculateMiDimension } from "@/lib/scoring/mi";
import type { QuestState } from "@/hooks/use-quest-state";
import type { ScoreState } from "@/hooks/use-scores";

function makeQuestState(overrides?: Partial<QuestState>): QuestState {
  return {
    flowPhase: "questions",
    currentIndex: 10,
    direction: "right",
    transitionNarration: "",
    adaptiveQuestions: [],
    confirmIndex: 0,
    current_block: "riasec",
    questions_answered: 10,
    responses: Array.from({ length: 10 }, (_, i) => ({
      question_id: `q-${i}`,
      response_value: 3,
      response_label: `answer-${i}`,
      framework: "riasec",
      framework_target: "R",
      answered_at: Date.now(),
    })),
    selected_adaptive_ids: [],
    persistence_failed: false,
    last_response_undoable: true,
    engagementShown: true,
    avatarClass: "mage",
    classNamedPending: false,
    ...overrides,
  };
}

function makeScoreState(): ScoreState {
  return {
    riasec: { R: 50, I: 30, A: 0, S: 0, E: 0, C: 0 },
    riasec_raw: { R: [4, 4], I: [3], A: [], S: [], E: [], C: [] },
    riasec_ipsative_raw: { R: [], I: [], A: [], S: [], E: [], C: [] },
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
    mi_raw: {},
    mbti: { EI: 0, SN: 0, TF: 0, JP: 0 },
    mbti_raw: { EI: [], SN: [], TF: [], JP: [] },
    values: {
      security_adventure: 0,
      income_impact: 0,
      prestige_fulfilment: 0,
      structure_flexibility: 0,
      solo_team: 0,
    },
    values_raw: {},
    strengths: [],
    strength_signals: [],
    rating_responses: [],
    acquiescence_flag: false,
    riasec_snapshot: null,
    class_label: "SEEKER",
    signal_history: [],
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("session snapshot storage", () => {
  it("round-trips quest state, score state, and self-map data", () => {
    const questState = makeQuestState();
    const scoreState = makeScoreState();
    const selfMap = { clarity: 2, sources: ["hobbies"], perceived_strengths: ["building"] };

    saveSessionSnapshot("student-1", questState, scoreState, selfMap);
    const loaded = loadSessionSnapshot("student-1");

    expect(loaded).not.toBeNull();
    expect(loaded?.questState).toEqual(questState);
    expect(loaded?.scoreState).toEqual(scoreState);
    expect(loaded?.selfMap).toEqual(selfMap);
    expect(typeof loaded?.savedAt).toBe("number");
  });

  it("keys snapshots per student", () => {
    saveSessionSnapshot("student-1", makeQuestState(), makeScoreState(), null);

    expect(loadSessionSnapshot("student-2")).toBeNull();
    expect(loadSessionSnapshot("student-1")).not.toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    window.localStorage.setItem(snapshotKey("student-1"), "{not json!");
    expect(loadSessionSnapshot("student-1")).toBeNull();
  });

  it("returns null for a snapshot with a different version", () => {
    saveSessionSnapshot("student-1", makeQuestState(), makeScoreState(), null);
    const raw = window.localStorage.getItem(snapshotKey("student-1"))!;
    const tampered = { ...JSON.parse(raw), version: 999 };
    window.localStorage.setItem(snapshotKey("student-1"), JSON.stringify(tampered));

    expect(loadSessionSnapshot("student-1")).toBeNull();
  });

  /**
   * A version 2 checkpoint is not merely "old": its mi_raw holds bare signal
   * weights, and mi_raw now holds endorsements in [0, 1]. The two look alike
   * enough to restore without complaint and mean different things.
   * abe65c6 (SNAPSHOT_VERSION = 2) is an ancestor of origin/main, so these
   * exist on real devices right now.
   */
  describe("a version 2 checkpoint, written before MI endorsements", () => {
    /** What a v2 snapshot actually looks like on disk. */
    function writeLegacyV2(): Record<string, number[]> {
      const legacyMiRaw = {
        linguistic: [1, 1],
        logical: [1, 1, 1, 1, 1],
        spatial: [2, 2],
        musical: [1, 2],
        bodily: [1, 1],
        interpersonal: [],
        intrapersonal: [],
        naturalistic: [],
      };
      saveSessionSnapshot("student-1", makeQuestState(), makeScoreState(), null);
      const raw = JSON.parse(window.localStorage.getItem(snapshotKey("student-1"))!);
      raw.version = 2;
      raw.scoreState.mi_raw = legacyMiRaw;
      // v2 predates rating_responses entirely.
      delete raw.scoreState.rating_responses;
      window.localStorage.setItem(snapshotKey("student-1"), JSON.stringify(raw));
      return legacyMiRaw;
    }

    it("is refused rather than restored", () => {
      writeLegacyV2();
      expect(loadSessionSnapshot("student-1")).toBeNull();
    });

    it("would otherwise flatten the whole learning-styles chart to a tie at 100", () => {
      // The reason for the bump, asserted rather than described.
      // calculateMiDimension clamps into [0, 1], so every legacy weight --
      // 1 or 2 -- reads as a whole endorsement.
      const legacyMiRaw = writeLegacyV2();
      const rescored = calculateAllMi(legacyMiRaw);

      expect(rescored).toEqual({
        linguistic: 100,
        logical: 100,
        spatial: 100,
        musical: 100,
        bodily: 100,
        interpersonal: 0,
        intrapersonal: 0,
        naturalistic: 0,
      });

      // Five dimensions tied at the top: "Your strongest learning styles"
      // would rank them by whichever order they happen to be declared in.
      const scored = Object.values(rescored).filter((v) => v > 0);
      expect(scored).toHaveLength(5);
      expect(new Set(scored).size).toBe(1);
    });

    it("would otherwise mix two scales inside one dimension", () => {
      // Answer one more MI question after resuming and the array holds a
      // legacy weight beside a new endorsement; the mean is neither reading.
      expect(calculateMiDimension([1, 0.5])).toBe(75);
    });

    it("would otherwise silently disable straight-lining detection", () => {
      // No rating_responses in a v2 snapshot, so a resumed student's tapping
      // pattern would go unrecorded for the rest of the session.
      writeLegacyV2();
      const raw = JSON.parse(window.localStorage.getItem(snapshotKey("student-1"))!);
      expect(raw.scoreState.rating_responses).toBeUndefined();
    });
  });

  it("returns null when quest state is malformed", () => {
    saveSessionSnapshot(
      "student-1",
      { flowPhase: "not-a-phase" } as unknown as QuestState,
      makeScoreState(),
      null
    );
    expect(loadSessionSnapshot("student-1")).toBeNull();
  });

  it("returns null when score state is malformed", () => {
    saveSessionSnapshot(
      "student-1",
      makeQuestState(),
      { riasec: null } as unknown as ScoreState,
      null
    );
    expect(loadSessionSnapshot("student-1")).toBeNull();
  });

  it("clearSessionSnapshot removes the entry", () => {
    saveSessionSnapshot("student-1", makeQuestState(), makeScoreState(), null);
    clearSessionSnapshot("student-1");
    expect(loadSessionSnapshot("student-1")).toBeNull();
  });
});
