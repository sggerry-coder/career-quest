import { createClient } from "@/lib/supabase/client";
import { validateScoresBeforePersist } from "@/lib/validation/score-validation";
import { buildMbtiRawCounts } from "@/lib/scoring/mbti";
import { buildRiasecEvidence } from "@/lib/scoring/riasec";
import { buildValuesRawCounts } from "@/lib/scoring/values";
import {
  classifySupabaseError,
  type PersistResult,
} from "@/lib/validation/error-classification";
import type { ClientResponse } from "@/lib/types/quest";

/**
 * Single source of truth for Session 1 final persistence.
 *
 * Wraps each of the four writes (session_responses, assessment_scores,
 * students, achievements) in retry-with-backoff so a transient network blip
 * on school Wi-Fi does not force the student to notice the failure banner.
 * The manual Retry banner remains the last resort after all retries fail.
 */

/** Backoff delays between attempts: 1s, 2s, 4s (4 attempts total). */
export const DEFAULT_RETRY_DELAYS_MS = [1000, 2000, 4000];

export interface FinalPersistScores {
  riasec: Record<string, number>;
  /** Rating items per type, the first of the two interest instruments. */
  riasec_raw: Record<string, number[]>;
  /** Forced rankings per type, the second. Both count as being asked. */
  riasec_ipsative_raw: Record<string, number[]>;
  mi: Record<string, number>;
  mbti: Record<string, number>;
  mbti_raw: Record<string, number[]>;
  values: Record<string, number>;
  values_raw: Record<string, number[]>;
  strengths: string[];
}

export interface FinalPersistInput {
  studentId: string;
  responses: ClientResponse[];
  scores: FinalPersistScores;
  /** Fully merged self_map to write, or null to leave self_map untouched. */
  selfMap: Record<string, unknown> | null;
  /** The class the student became (CharacterClassId), written to avatar_class. */
  characterClass: string;
}

export interface FinalPersistOptions {
  /** Delays (ms) between retry attempts. Empty array = single attempt. */
  retryDelays?: number[];
}

interface SupabaseResult {
  error: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a Supabase operation with exponential backoff.
 * Runs the operation once, then once more after each delay until it
 * succeeds or the delays are exhausted.
 */
export async function retryWithBackoff<T extends SupabaseResult>(
  operation: () => PromiseLike<T>,
  delays: number[] = DEFAULT_RETRY_DELAYS_MS
): Promise<T> {
  let lastResult = await operation();
  for (const delay of delays) {
    if (!lastResult.error) return lastResult;
    await sleep(delay);
    lastResult = await operation();
  }
  return lastResult;
}

function failureFrom(error: unknown): PersistResult {
  const errorType = classifySupabaseError(error);
  return {
    success: false,
    errorType,
    message: String((error as { message?: string })?.message ?? "Unknown error"),
  };
}

/**
 * Run final persistence: session responses, computed scores, student
 * completion flag (+ merged self_map), and the Self-Discoverer achievement.
 * Each write retries with backoff before reporting failure.
 */
export async function runFinalPersist(
  input: FinalPersistInput,
  options?: FinalPersistOptions
): Promise<PersistResult> {
  const { studentId, responses, scores, selfMap, characterClass } = input;
  const retryDelays = options?.retryDelays ?? DEFAULT_RETRY_DELAYS_MS;

  if (!studentId) {
    return { success: false, errorType: "auth", message: "No authenticated user" };
  }

  try {
    const supabase = createClient();

    // Pre-save validation
    const validation = validateScoresBeforePersist(
      { riasec: scores.riasec, mi: scores.mi, mbti: scores.mbti, values: scores.values },
      responses.length
    );
    if (!validation.valid) {
      return {
        success: false,
        errorType: "unknown",
        message: `Validation failed: ${validation.errors.join("; ")}`,
      };
    }

    // Write session responses using upsert for idempotency
    const sessionResponses = responses.map((r) => ({
      student_id: studentId,
      session_number: 1,
      question_id: r.question_id,
      question_text: r.response_label,
      response_text: String(r.response_value),
      framework_signals: {
        framework: r.framework,
        target: r.framework_target,
        value: r.response_value,
      },
    }));

    if (sessionResponses.length > 0) {
      const responsesResult = await retryWithBackoff(
        () =>
          supabase.from("session_responses").upsert(sessionResponses, {
            onConflict: "student_id,question_id,session_number",
          }),
        retryDelays
      );
      if (responsesResult.error) return failureFrom(responsesResult.error);
    }

    // Write computed scores
    // onConflict is required, not optional. assessment_scores has its primary
    // key on `id` (default gen_random_uuid()) and a separate unique constraint
    // on student_id. Without naming student_id, Supabase resolves on the
    // primary key, generates a fresh id, and INSERTs -- so the save succeeded
    // once per student and then failed forever with
    // "duplicate key value violates unique constraint
    //  assessment_scores_student_id_key".
    const scoresResult = await retryWithBackoff(
      () =>
        supabase.from("assessment_scores").upsert(
          {
            student_id: studentId,
            riasec_scores: scores.riasec,
            // The same absence problem as the two below, and the one with the
            // most riding on it: an interest type nobody was asked about
            // merges to 0, exactly like a type rated at the bottom twice, and
            // the class badge on the dashboard is derived from these six rows.
            // Both instruments count -- a rating item and a place in a forced
            // ranking each say something about one type -- so this is
            // buildRiasecEvidence rather than a length count over one side.
            // NULL in legacy rows, which hasRiasecReading reads as "assume
            // asked".
            riasec_raw_counts: buildRiasecEvidence(
              scores.riasec_raw,
              scores.riasec_ipsative_raw
            ),
            mi_scores: scores.mi,
            mbti_indicators: scores.mbti,
            mbti_raw_counts: buildMbtiRawCounts(scores.mbti_raw),
            values_compass: scores.values,
            // Alongside the scores for the same reason as mbti_raw_counts: a
            // values score of 0 is the exact centre of the spectrum, so the
            // column alone cannot say whether the dimension was answered dead
            // centre or never answered at all. The dashboard reads these back
            // and has nothing else to go on. NULL in legacy rows, which
            // hasValuesReading reads as "assume answered".
            values_raw_counts: buildValuesRawCounts(scores.values_raw),
            strengths: scores.strengths,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id" }
        ),
      retryDelays
    );
    if (scoresResult.error) return failureFrom(scoresResult.error);

    // Mark student as completed; merge self-map reflections without
    // dropping character-creation data such as curiosities
    const studentUpdate: Record<string, unknown> = {
      current_session: 1,
      has_completed_session1: true,
      // What the student became. avatar_class used to hold what they picked
      // before the app knew anything about them.
      avatar_class: characterClass,
    };
    if (selfMap) {
      studentUpdate.self_map = selfMap;
    }
    const studentResult = await retryWithBackoff(
      () => supabase.from("students").update(studentUpdate).eq("id", studentId),
      retryDelays
    );
    if (studentResult.error) return failureFrom(studentResult.error);

    // Insert Self-Discoverer achievement (best-effort, still retried)
    await retryWithBackoff(
      () =>
        supabase.from("achievements").upsert(
          {
            student_id: studentId,
            badge_id: "self_discoverer",
            unlocked_at: new Date().toISOString(),
          },
          { onConflict: "student_id,badge_id" }
        ),
      retryDelays
    );

    return { success: true };
  } catch (err) {
    const errorType = classifySupabaseError(err);
    return {
      success: false,
      errorType,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
