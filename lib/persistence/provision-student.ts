import { createClient } from "@/lib/supabase/client";
import { clearSessionSnapshot } from "@/lib/persistence/session-snapshot";

/**
 * Student provisioning for character creation (P2.3).
 *
 * When an auth session already exists (returning student choosing "Start a
 * new quest instead"), the existing auth user and student row are REUSED:
 * the profile is overwritten in place, scores reset, and prior responses
 * cleared -- instead of minting a new anonymous user and permanently
 * orphaning the previous student row, scores, and responses.
 */

export interface StudentProfile {
  name: string;
  age: number;
  educationSystem: string;
  avatarClass: string;
  tone: "quest" | "explorer";
  destinations: string[];
  curiosities: string[];
}

export type ProvisionResult =
  | { success: true; studentId: string; replacedExisting: boolean }
  | { success: false };

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
      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("id", userId)
        .single();
      replacedExisting = Boolean(existing);
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
      avatar_class: profile.avatarClass,
      tone: profile.tone,
      preferred_destinations: profile.destinations,
      self_map: { curiosities: profile.curiosities },
      current_session: 0,
      has_completed_session1: false,
    });
    if (studentError) {
      return { success: false };
    }

    // 3. When replacing, clear the previous run's data (best-effort).
    if (replacedExisting) {
      await supabase.from("session_responses").delete().eq("student_id", userId);
      await supabase.from("achievements").delete().eq("student_id", userId);
      clearSessionSnapshot(userId);
    }

    // 4. Reset assessment scores to zero (non-blocking; created at first
    //    checkpoint if this fails).
    await supabase.from("assessment_scores").upsert({
      student_id: userId,
      ...ZERO_SCORES,
      updated_at: new Date().toISOString(),
    });

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
