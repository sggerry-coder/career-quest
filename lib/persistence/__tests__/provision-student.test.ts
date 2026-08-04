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
import { THEME_CACHE_KEY } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Hoisted mock Supabase client
// ---------------------------------------------------------------------------

const h = vi.hoisted(() => {
  const state = {
    existingUserId: null as string | null,
    existingStudentRow: false,
    existingStudentName: "Priya",
    // When set, the students existence check returns this error instead of
    // data -- lets tests simulate both Supabase's "no rows" shape
    // (code: "PGRST116", which must still proceed normally) and a genuine
    // read failure (any other code, which must refuse everything).
    existingCheckErrorCode: null as string | null,
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
          single: async () => {
            if (table !== "students") {
              return { data: null, error: null };
            }
            if (state.existingCheckErrorCode) {
              return {
                data: null,
                error: { code: state.existingCheckErrorCode, message: "boom" },
              };
            }
            return {
              data: state.existingStudentRow
                ? { id: state.existingUserId, name: state.existingStudentName }
                : null,
              error: null,
            };
          },
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
  h.state.existingStudentName = "Priya";
  h.state.existingCheckErrorCode = null;
  h.state.signInFails = false;
  h.state.studentUpsertFails = false;
  h.signInAnonymously.mockClear();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
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

    const result = await provisionStudent({ ...PROFILE, confirmedReplace: true });

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

    await provisionStudent({ ...PROFILE, confirmedReplace: true });

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

    await provisionStudent({ ...PROFILE, confirmedReplace: true });

    const badgeUpsert = h.calls.filter(
      (c) => c.table === "achievements" && c.method === "upsert"
    );
    expect(badgeUpsert).toHaveLength(1);
    expect(badgeUpsert[0].payload).toMatchObject({ badge_id: "quest_started" });
  });

  it("does not leave a new student wearing the previous student's colours", async () => {
    // A shared classroom device: the last student finished as a Guardian and
    // the pre-paint script restores whatever is cached. Character creation no
    // longer applies a theme, so without this reset the new Wanderer wore
    // jade for the whole warm-up and interest block.
    window.localStorage.setItem(THEME_CACHE_KEY, "guardian-jade");
    document.documentElement.setAttribute("data-theme", "guardian-jade");

    await provisionStudent(PROFILE);

    expect(window.localStorage.getItem(THEME_CACHE_KEY)).toBe("wanderer-slate");
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "wanderer-slate"
    );
  });

  it("leaves the theme alone when the profile write failed", async () => {
    // Nothing was provisioned, so nothing should have been reset.
    window.localStorage.setItem(THEME_CACHE_KEY, "guardian-jade");
    h.state.studentUpsertFails = true;

    await provisionStudent(PROFILE);

    expect(window.localStorage.getItem(THEME_CACHE_KEY)).toBe("guardian-jade");
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

  it("refuses to touch an existing student row without confirmedReplace, and says why", async () => {
    // Shared classroom device: the browser is still signed in as a previous
    // student. Without explicit consent this must be a strict no-op -- no
    // delete, no upsert, nothing written or cleared. The failure must also
    // be distinguishable from a real write failure so the caller can route
    // the student to the consent screen instead of a generic error (Task 7
    // review, Finding 1).
    h.state.existingUserId = "student-1";
    h.state.existingStudentRow = true;
    h.state.existingStudentName = "Priya";

    const result = await provisionStudent(PROFILE);

    expect(result).toEqual({
      success: false,
      reason: "needs_confirmation",
      existingName: "Priya",
    });
    expect(h.calls).toHaveLength(0);
    expect(h.signInAnonymously).not.toHaveBeenCalled();
  });

  it("falls back cleanly when the existing row's name is empty, not blank interpolation", async () => {
    // Task 7 re-review, Finding 1: `?? undefined` preserves an empty
    // string (it's not nullish), so a row with name: "" used to report
    // existingName: "" and the recovery path on the character page would
    // render "This device is signed in as " with nothing after it. Fixed
    // at the source with `|| undefined` so every caller gets a clean
    // undefined to fall back from, not just the page's own pre-check.
    h.state.existingUserId = "student-1";
    h.state.existingStudentRow = true;
    h.state.existingStudentName = "";

    const result = await provisionStudent(PROFILE);

    expect(result).toEqual({
      success: false,
      reason: "needs_confirmation",
      existingName: undefined,
    });
    expect(h.calls).toHaveLength(0);
  });

  it("proceeds as a genuinely new student when the existence check reports Supabase's 'no rows' error", async () => {
    // Task 7 re-review, Finding 2, branch 1: `.single()` reports "no row"
    // as an error (PGRST116), not as `data: null, error: null`. That is
    // the ordinary shape for a genuinely new student and must not be
    // treated as a read failure.
    h.state.existingUserId = "student-1";
    h.state.existingCheckErrorCode = "PGRST116";

    const result = await provisionStudent(PROFILE);

    expect(result).toEqual({
      success: true,
      studentId: "student-1",
      replacedExisting: false,
    });
    expect(h.signInAnonymously).not.toHaveBeenCalled();
  });

  it("refuses everything and reports existence_check_failed on a genuine read failure", async () => {
    // Task 7 re-review, Finding 2, branch 2: any error other than "no
    // rows" means the existence of a previous student is unknown, not
    // that there isn't one. Proceeding would risk silently overwriting a
    // row this call simply failed to see -- the exact class of harm this
    // task exists to prevent. Must be a strict no-op, and must report
    // something the UI can act on (not indistinguishable from a normal
    // write failure).
    h.state.existingUserId = "student-1";
    h.state.existingCheckErrorCode = "PGRST500";

    const result = await provisionStudent(PROFILE);

    expect(result).toEqual({ success: false, reason: "existence_check_failed" });
    expect(h.calls).toHaveLength(0);
    expect(h.signInAnonymously).not.toHaveBeenCalled();
  });

  it("proceeds with the replacement once confirmedReplace is explicit", async () => {
    h.state.existingUserId = "student-1";
    h.state.existingStudentRow = true;

    const result = await provisionStudent({ ...PROFILE, confirmedReplace: true });

    expect(result).toEqual({
      success: true,
      studentId: "student-1",
      replacedExisting: true,
    });
    expect(
      h.calls.filter((c) => c.table === "session_responses" && c.method === "delete")
    ).toHaveLength(1);
    expect(
      h.calls.filter((c) => c.table === "achievements" && c.method === "delete")
    ).toHaveLength(1);
  });

  it("does not require confirmedReplace for a brand-new visitor", async () => {
    // No existing row -- confirmedReplace is irrelevant and must not be
    // required to provision a genuinely new student.
    const result = await provisionStudent(PROFILE);
    expect(result).toEqual({
      success: true,
      studentId: "anon-new",
      replacedExisting: false,
    });
  });
});
