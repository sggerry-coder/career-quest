import { createClient } from "@/lib/supabase/client";
import { clearSessionSnapshot } from "@/lib/persistence/session-snapshot";
import { applyClassTheme } from "@/lib/theme";

/**
 * Student provisioning for character creation (P2.3).
 *
 * When an auth session already exists (returning student choosing "Start a
 * new quest instead"), the existing auth user and student row are REUSED:
 * the profile is overwritten in place, scores reset, and prior responses
 * cleared -- instead of minting a new anonymous user and permanently
 * orphaning the previous student row, scores, and responses.
 *
 * On a shared classroom device that auth session usually belongs to
 * whichever student last used the browser, not the one sitting at it now.
 * Reusing the account is still correct (it avoids orphaning a minor's
 * data), but overwriting it must never happen silently: when an existing
 * student row is found, this function refuses to touch it -- no delete, no
 * upsert -- unless `profile.confirmedReplace` is true. The caller is
 * responsible for surfacing that choice to the student first (see
 * `<ReplaceProfileConfirm>` in `components/quest/replace-profile-confirm.tsx`,
 * wired in `app/quest/character/page.tsx`).
 *
 * The refusal is reported as `{ success: false, reason: "needs_confirmation",
 * existingName }`, not a bare `{ success: false }`, so a caller whose own
 * pre-check missed this (a stale read, a failed select, a direct call) can
 * recover into the consent screen instead of showing the student a generic,
 * unrecoverable "try again" error.
 */

export interface StudentProfile {
  name: string;
  age: number;
  educationSystem: string;
  avatarClass: string;
  tone: "quest" | "explorer";
  destinations: string[];
  curiosities: string[];
  figure: string;
  // Explicit informed consent to overwrite an existing student row on this
  // device. Required whenever a prior row is found -- see the guard below.
  confirmedReplace?: boolean;
}

export type ProvisionResult =
  | { success: true; studentId: string; replacedExisting: boolean }
  | { success: false; reason?: "needs_confirmation"; existingName?: string };

const ZERO_SCORES = {
  riasec_scores: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
  mi_scores: {
    linguistic: 0,
    logical: 0,
    spatial: 0,
    musical: 0,
    bodily: 0,
    interpersonal: 0,
    intrapersonal: 0,
    naturalistic: 0,
  },
  mbti_indicators: { EI: 0, SN: 0, TF: 0, JP: 0 },
  values_compass: {
    security_adventure: 0,
    income_impact: 0,
    prestige_fulfilment: 0,
    structure_flexibility: 0,
    solo_team: 0,
  },
  strengths: [] as string[],
};

export async function provisionStudent(
  profile: StudentProfile
): Promise<ProvisionResult> {
  try {
    const supabase = createClient();

    // 1. Reuse the existing auth user when present; otherwise sign in
    //    anonymously for a brand-new student.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userId: string;
    let replacedExisting = false;

    if (user) {
      userId = user.id;
      // Same existence predicate the caller's own pre-check uses (row
      // exists for this id) -- not "does it have a name" or anything else
      // that could drift out of sync with the caller and reopen the gap
      // this function exists to close.
      const { data: existing } = await supabase
        .from("students")
        .select("id, name")
        .eq("id", userId)
        .single();
      replacedExisting = Boolean(existing);

      // A shared classroom device keeps the previous student's auth session.
      // Overwriting that row deletes their session_responses and
      // achievements -- silently and unrecoverably. Refuse to touch
      // anything until the caller has shown the student whose data this is
      // and gotten an explicit "yes, replace it". No delete, no upsert.
      //
      // This is the authoritative backstop, not just a UX nicety: the
      // caller's own pre-check can be stale or can fail to read (network
      // hiccup) and let a student reach this call without ever seeing the
      // consent screen. Reporting `reason: "needs_confirmation"` instead of
      // a bare failure lets the caller recover into that screen right here,
      // instead of the student hitting an indistinguishable "try again"
      // error with no route forward.
      if (replacedExisting && !profile.confirmedReplace) {
        return {
          success: false,
          reason: "needs_confirmation",
          existingName: existing?.name ?? undefined,
        };
      }
    } else {
      const { data: authData, error: authError } =
        await supabase.auth.signInAnonymously();
      if (authError || !authData?.user) {
        return { success: false };
      }
      userId = authData.user.id;
    }

    // 2. Write the student row (upsert overwrites a replaced profile and
    //    resets session progress).
    const { error: studentError } = await supabase.from("students").upsert({
      id: userId,
      name: profile.name,
      age: profile.age,
      education_system: profile.educationSystem,
      // avatar_class starts as "wanderer" and is overwritten as the class
      // crystallises during the quest. It records what the student became,
      // not what they picked.
      avatar_class: profile.avatarClass,
      tone: profile.tone,
      preferred_destinations: profile.destinations,
      self_map: { curiosities: profile.curiosities, figure: profile.figure },
      current_session: 0,
      has_completed_session1: false,
    });
    if (studentError) {
      return { success: false };
    }

    // Reset the cached theme to the Wanderer's.
    //
    // Character creation no longer applies a theme, and the pre-paint script
    // restores whatever is in the cache. On a shared classroom device that
    // meant a brand-new student wore the previous student's class colour for
    // the whole warm-up and interest block. A student who has not been named
    // has not earned a colour.
    applyClassTheme(profile.avatarClass);

    // 3. When replacing, clear the previous run's data (best-effort).
    if (replacedExisting) {
      await supabase.from("session_responses").delete().eq("student_id", userId);
      await supabase.from("achievements").delete().eq("student_id", userId);
      clearSessionSnapshot(userId);
    }

    // 4. Reset assessment scores to zero (non-blocking; created at first
    //    checkpoint if this fails).
    // onConflict: student_id for the same reason as final-persist -- the
    // primary key is `id`, so without it a returning student hits the
    // student_id unique constraint and their old scores are never reset.
    await supabase.from("assessment_scores").upsert(
      {
        student_id: userId,
        ...ZERO_SCORES,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" }
    );

    // 5. Quest Started badge (non-blocking; shown from client state).
    await supabase.from("achievements").upsert(
      { student_id: userId, badge_id: "quest_started" },
      { onConflict: "student_id,badge_id" }
    );

    return { success: true, studentId: userId, replacedExisting };
  } catch {
    return { success: false };
  }
}
