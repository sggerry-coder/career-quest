/**
 * Locks in the unified final-persistence machinery (P1.2):
 * - retryWithBackoff retries transient failures and gives up after the delays
 * - runFinalPersist writes all four tables in order with retry per write
 * - failures are classified and reported; success clears the way for cleanup
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  retryWithBackoff,
  runFinalPersist,
  DEFAULT_RETRY_DELAYS_MS,
  type FinalPersistInput,
} from "@/lib/persistence/final-persist";
import { parseCharacterClass } from "@/lib/character/classes";
import type { ClientResponse } from "@/lib/types/quest";

// ---------------------------------------------------------------------------
// Hoisted mock Supabase client
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => {
  const calls: Array<{
    table: string;
    method: string;
    payload: unknown;
    options?: unknown;
  }> = [];
  // table -> number of times the write should fail before succeeding
  const failCounts: Record<string, number> = {};
  // table -> error object to fail with
  const failErrors: Record<string, { message: string }> = {};

  function result(table: string): { error: { message: string } | null } {
    if ((failCounts[table] ?? 0) > 0) {
      failCounts[table] = (failCounts[table] ?? 0) - 1;
      return { error: failErrors[table] ?? { message: "boom" } };
    }
    return { error: null };
  }

  function makeTableApi(table: string) {
    return {
      upsert: (payload: unknown, options?: unknown) => {
        calls.push({ table, method: "upsert", payload, options });
        return Promise.resolve(result(table));
      },
      update: (payload: unknown) => ({
        eq: () => {
          calls.push({ table, method: "update", payload });
          return Promise.resolve(result(table));
        },
      }),
    };
  }

  return { calls, failCounts, failErrors, makeTableApi };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => h.makeTableApi(table),
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeResponses(count: number): ClientResponse[] {
  return Array.from({ length: count }, (_, i) => ({
    question_id: `q-${i}`,
    response_value: 3,
    response_label: `answer-${i}`,
    framework: "riasec",
    framework_target: "R",
    answered_at: Date.now(),
  }));
}

function makeInput(overrides?: Partial<FinalPersistInput>): FinalPersistInput {
  return {
    studentId: "student-1",
    responses: makeResponses(12),
    scores: {
      riasec: { R: 80, I: 60, A: 40, S: 20, E: 10, C: 5 },
      // C was never asked on either instrument; E was asked on both. The
      // scores cannot tell them apart, which is what the counts are for.
      riasec_raw: { R: [4, 4], I: [3, 3], A: [3], S: [2], E: [1], C: [] },
      riasec_ipsative_raw: { R: [4], I: [], A: [], S: [], E: [2], C: [] },
      mi: {
        linguistic: 10,
        logical: 20,
        spatial: 30,
        musical: 0,
        bodily: 0,
        interpersonal: 0,
        intrapersonal: 0,
        naturalistic: 0,
      },
      mbti: { EI: 40, SN: -40, TF: 40, JP: -40 },
      mbti_raw: { EI: [1, 2, 3], SN: [-2, -1, -1], TF: [2], JP: [-1, -2] },
      values: {
        security_adventure: 10,
        income_impact: 0,
        prestige_fulfilment: 0,
        structure_flexibility: 0,
        solo_team: 0,
      },
      // security_adventure and solo_team were answered; income_impact was not.
      // Both of the last two score 0, which is the whole reason the counts are
      // written at all.
      values_raw: { security_adventure: [1], income_impact: [], solo_team: [0] },
      strengths: ["Creative Thinking"],
    },
    selfMap: null,
    characterClass: "wanderer",
    ...overrides,
  };
}

beforeEach(() => {
  h.calls.length = 0;
  for (const key of Object.keys(h.failCounts)) delete h.failCounts[key];
  for (const key of Object.keys(h.failErrors)) delete h.failErrors[key];
});

// ---------------------------------------------------------------------------
// retryWithBackoff
// ---------------------------------------------------------------------------

describe("retryWithBackoff", () => {
  it("returns immediately on first success", async () => {
    const op = vi.fn().mockResolvedValue({ error: null });
    const result = await retryWithBackoff(op, [0, 0, 0]);
    expect(result.error).toBeNull();
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures and succeeds", async () => {
    const op = vi
      .fn()
      .mockResolvedValueOnce({ error: { message: "network fetch failed" } })
      .mockResolvedValueOnce({ error: { message: "network fetch failed" } })
      .mockResolvedValue({ error: null });
    const result = await retryWithBackoff(op, [0, 0, 0]);
    expect(result.error).toBeNull();
    expect(op).toHaveBeenCalledTimes(3);
  });

  it("gives up after exhausting delays and returns the last failure", async () => {
    const op = vi.fn().mockResolvedValue({ error: { message: "still down" } });
    const result = await retryWithBackoff(op, [0, 0]);
    expect(result.error).toEqual({ message: "still down" });
    expect(op).toHaveBeenCalledTimes(3); // initial + one per delay
  });

  it("waits the default 1s/2s/4s backoff schedule between attempts", async () => {
    vi.useFakeTimers();
    try {
      const op = vi.fn().mockResolvedValue({ error: { message: "down" } });
      const promise = retryWithBackoff(op, DEFAULT_RETRY_DELAYS_MS);

      await vi.advanceTimersByTimeAsync(0);
      expect(op).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(op).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(2000);
      expect(op).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(4000);
      expect(op).toHaveBeenCalledTimes(4);

      const result = await promise;
      expect(result.error).toEqual({ message: "down" });
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// runFinalPersist
// ---------------------------------------------------------------------------

describe("runFinalPersist", () => {
  it("writes all four tables in order on success", async () => {
    const result = await runFinalPersist(makeInput(), { retryDelays: [] });

    expect(result.success).toBe(true);
    expect(h.calls.map((c) => c.table)).toEqual([
      "session_responses",
      "assessment_scores",
      "students",
      "achievements",
    ]);

    const scoresCall = h.calls.find((c) => c.table === "assessment_scores");
    expect(scoresCall?.payload).toMatchObject({
      student_id: "student-1",
      // Both instruments summed per type: R has two ratings and a ranking,
      // E one of each, C nothing at all. Only the 0 says C was never asked --
      // riasec_scores gives it a 5 like any other low type.
      riasec_raw_counts: { R: 3, I: 2, A: 1, S: 1, E: 2, C: 0 },
      mbti_raw_counts: { EI: 3, SN: 3, TF: 1, JP: 2 },
      // A count for every dimension, including the ones with no answers --
      // income_impact scores 0 either way, and only this says which 0 it is.
      values_raw_counts: {
        security_adventure: 1,
        income_impact: 0,
        prestige_fulfilment: 0,
        structure_flexibility: 0,
        solo_team: 1,
      },
    });

    const studentCall = h.calls.find((c) => c.table === "students");
    expect(studentCall?.payload).toMatchObject({
      current_session: 1,
      has_completed_session1: true,
    });
    expect(studentCall?.payload).not.toHaveProperty("self_map");
  });

  it("survives a transient failure via retry", async () => {
    h.failCounts.assessment_scores = 2;
    h.failErrors.assessment_scores = { message: "network fetch failed" };

    const result = await runFinalPersist(makeInput(), {
      retryDelays: [0, 0, 0],
    });

    expect(result.success).toBe(true);
    expect(
      h.calls.filter((c) => c.table === "assessment_scores")
    ).toHaveLength(3);
    // Later writes still ran after the recovered one
    expect(h.calls.filter((c) => c.table === "students")).toHaveLength(1);
  });

  it("reports a classified failure after retries are exhausted", async () => {
    h.failCounts.session_responses = 99;
    h.failErrors.session_responses = { message: "network fetch failed" };

    const result = await runFinalPersist(makeInput(), {
      retryDelays: [0, 0, 0],
    });

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("network");
    expect(
      h.calls.filter((c) => c.table === "session_responses")
    ).toHaveLength(4); // initial + 3 retries
    // Aborted before later writes
    expect(h.calls.filter((c) => c.table === "assessment_scores")).toHaveLength(0);
  });

  it("includes the merged self_map when provided", async () => {
    const selfMap = {
      curiosities: ["space"],
      clarity: 2,
      sources: ["hobbies"],
      perceived_strengths: ["building"],
    };
    const result = await runFinalPersist(makeInput({ selfMap }), {
      retryDelays: [],
    });

    expect(result.success).toBe(true);
    const studentCall = h.calls.find((c) => c.table === "students");
    expect(studentCall?.payload).toMatchObject({ self_map: selfMap });
  });

  it("saves the class the student became, so the dashboard is not stuck on Wanderer", async () => {
    await runFinalPersist(makeInput({ characterClass: "guardian" }), { retryDelays: [] });

    const studentUpdate = h.calls.find(
      (c) => c.table === "students" && c.method === "update"
    );
    expect(studentUpdate?.payload).toMatchObject({ avatar_class: "guardian" });
  });

  it("saves both halves of a dual class, and the dashboard reads them back", async () => {
    // avatar_class is a text column, so "guardian-mage" needs no migration.
    // Persisting only the primary told a Guardian-Mage they were a Guardian
    // from the moment they left the reveal screen.
    await runFinalPersist(makeInput({ characterClass: "guardian-mage" }), {
      retryDelays: [],
    });

    const studentUpdate = h.calls.find(
      (c) => c.table === "students" && c.method === "update"
    );
    const stored = (studentUpdate?.payload as { avatar_class: string })
      .avatar_class;
    expect(stored).toBe("guardian-mage");
    expect(parseCharacterClass(stored)).toEqual({
      primary: "guardian",
      secondary: "mage",
      isNamed: true,
    });
  });

  it("skips the session_responses write when there are no responses", async () => {
    const result = await runFinalPersist(makeInput({ responses: [] }), {
      retryDelays: [],
    });

    // Validation requires responses, so this fails before any write
    expect(result.success).toBe(false);
    expect(h.calls.filter((c) => c.table === "session_responses")).toHaveLength(0);
  });

  it("fails fast with an auth error when studentId is missing", async () => {
    const result = await runFinalPersist(makeInput({ studentId: "" }), {
      retryDelays: [],
    });
    expect(result).toEqual({
      success: false,
      errorType: "auth",
      message: "No authenticated user",
    });
    expect(h.calls).toHaveLength(0);
  });

  // Regression: assessment_scores has its primary key on `id` and a separate
  // unique constraint on student_id. Supabase resolves an upsert on the primary
  // key unless told otherwise, so omitting onConflict generated a fresh id and
  // INSERTed -- the save worked once per student and then failed forever with
  // "duplicate key value violates unique constraint
  // assessment_scores_student_id_key". Reported from production 2026-08-03.
  it("upserts assessment_scores on student_id, not the primary key", async () => {
    await runFinalPersist(makeInput(), { retryDelays: [] });

    const scoresCall = h.calls.find(
      (c) => c.table === "assessment_scores" && c.method === "upsert"
    );
    expect(scoresCall?.options).toEqual({ onConflict: "student_id" });
  });

  it("names a conflict target on every upsert it makes", async () => {
    await runFinalPersist(makeInput(), { retryDelays: [] });

    const upserts = h.calls.filter((c) => c.method === "upsert");
    expect(upserts.length).toBeGreaterThan(0);
    for (const call of upserts) {
      expect(
        (call.options as { onConflict?: string } | undefined)?.onConflict,
        `${call.table} upsert must name its conflict target`
      ).toBeTruthy();
    }
  });
});
