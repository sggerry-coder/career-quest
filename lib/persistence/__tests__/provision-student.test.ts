/**
 * @vitest-environment jsdom
 *
 * Locks in the student provisioning guard (P2.3):
 * - a brand-new visitor gets an anonymous auth user + inserted rows
 * - a returning student REUSES the same auth user: profile overwritten in
 *   place, scores reset, previous responses/achievements cleared, local
 *   checkpoint removed -- no orphaned rows, no second anonymous user
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  provisionStudent,
  type StudentProfile,
} from "@/lib/persistence/provision-student";
import { snapshotKey } from "@/lib/persistence/session-snapshot";

// ---------------------------------------------------------------------------
// Hoisted mock Supabase client
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => {
  const state = {
    existingUserId: null as string | null,
    existingStudentRow: false,
    signInFails: false,
    studentUpsertFails: false,
  };
  const calls: Array<{ table: string; method: string; payload?: unknown }> = [];
  const signInAnonymously = vi.fn(async () => {
    if (state.signInFails) {
      return { data: { user: null }, error: { message: "sealed" } };
    }
    return { data: { user: { id: "anon-new" } }, error: null };
  });

  function makeTableApi(table: string) {
    return {
      select: () => ({
        eq: () => ({
          single: async () => ({
            data:
              table === "students" && state.existingStudentRow
                ? { id: state.existingUserId }
                : null,
            error: null,
          }),
        }),
      }),
      upsert: async (payload: unknown) => {
        calls.push({ table, method: "upsert", payload });
        if (table === "students" && state.studentUpsertFails) {
          return { error: { message: "boom" } };
        }
        return { error: null };
      },
      delete: () => ({
        eq: async () => {
          calls.push({ table, method: "delete" });
          return { error: null };
        },
      }),
    };
  }

  return { state, calls, signInAnonymously, makeTableApi };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: h.state.existingUserId ? { id: h.state.existingUserId } : null,
        },
      }),
      signInAnonymously: h.signInAnonymously,
    },
    from: (table: string) => h.makeTableApi(table),
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROFILE: StudentProfile = {
  name: "Riley",
  age: 15,
  educationSystem: "igcse",
  avatarClass: "wanderer",
  tone: "quest",
  destinations: ["uk"],
  curiosities: ["space"],
  figure: "figure_a",
};

beforeEach(() => {
  h.calls.length = 0;
  h.state.existingUserId = null;
  h.state.existingStudentRow = false;
  h.state.signInFails = false;
  h.state.studentUpsertFails = false;
  h.signInAnonymously.mockClear();
  window.localStorage.clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("provisionStudent", () => {
  it("signs in anonymously for a brand-new visitor and inserts rows", async () => {
    const result = await provisionStudent(PROFILE);

    expect(result).toEqual({
      success: true,
      studentId: "anon-new",
      replacedExisting: false,
    });
    expect(h.signInAnonymously).toHaveBeenCalledTimes(1);

    const studentUpsert = h.calls.find((c) => c.table === "students");
    expect(studentUpsert?.payload).toMatchObject({
      id: "anon-new",
      name: "Riley",
      avatar_class: "wanderer",
      current_session: 0,
      has_completed_session1: false,
      self_map: { curiosities: ["space"], figure: "figure_a" },
    });
    // No destructive clears for a fresh student
    expect(h.calls.filter((c) => c.method === "delete")).toHaveLength(0);
  });

  it("reuses the existing auth user instead of minting a new one", async () => {
    h.state.existingUserId = "student-1";
    h.state.existingStudentRow = true;

    const result = await provisionStudent(PROFILE);

    expect(result).toEqual({
      success: true,
      studentId: "student-1",
      replacedExisting: true,
    });
    expect(h.signInAnonymously).not.toHaveBeenCalled();

    const studentUpsert = h.calls.find((c) => c.table === "students");
    expect(studentUpsert?.payload).toMatchObject({
      id: "student-1",
      has_completed_session1: false,
      current_session: 0,
    });
  });

  it("clears the previous run's data when replacing", async () => {
    h.state.existingUserId = "student-1";
    h.state.existingStudentRow = true;
    window.localStorage.setItem(snapshotKey("student-1"), "{}");

    await provisionStudent(PROFILE);

    expect(
      h.calls.filter((c) => c.table === "session_responses" && c.method === "delete")
    ).toHaveLength(1);
    expect(
      h.calls.filter((c) => c.table === "achievements" && c.method === "delete")
    ).toHaveLength(1);
    // Local mid-session checkpoint is discarded too
    expect(window.localStorage.getItem(snapshotKey("student-1"))).toBeNull();

    // Scores reset to zero
    const scoresUpsert = h.calls.find((c) => c.table === "assessment_scores");
    expect(scoresUpsert?.payload).toMatchObject({
      student_id: "student-1",
      riasec_scores: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
      strengths: [],
    });
  });

  it("re-awards the Quest Started badge after provisioning", async () => {
    h.state.existingUserId = "student-1";
    h.state.existingStudentRow = true;

    await provisionStudent(PROFILE);

    const badgeUpsert = h.calls.filter(
      (c) => c.table === "achievements" && c.method === "upsert"
    );
    expect(badgeUpsert).toHaveLength(1);
    expect(badgeUpsert[0].payload).toMatchObject({ badge_id: "quest_started" });
  });

  it("fails cleanly when anonymous sign-in fails", async () => {
    h.state.signInFails = true;
    const result = await provisionStudent(PROFILE);
    expect(result).toEqual({ success: false });
    expect(h.calls).toHaveLength(0);
  });

  it("fails cleanly when the student write fails", async () => {
    h.state.studentUpsertFails = true;
    const result = await provisionStudent(PROFILE);
    expect(result).toEqual({ success: false });
    // No destructive operations after a failed profile write
    expect(h.calls.filter((c) => c.method === "delete")).toHaveLength(0);
  });
});
