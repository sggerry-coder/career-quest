"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useQuestState, type QuestState, type QuestAction } from "@/hooks/use-quest-state";
import { useScores, type ScoreState } from "@/hooks/use-scores";
import type { ClientResponse } from "@/lib/types/quest";
import { createClient } from "@/lib/supabase/client";
import { validateScoresBeforePersist } from "@/lib/validation/score-validation";
import { classifySupabaseError, type PersistResult } from "@/lib/validation/error-classification";

interface QuestContextValue {
  questState: QuestState;
  scoreState: ScoreState;
  dispatch: React.Dispatch<QuestAction>;
  actions: {
    answerQuestion: (
      response: ClientResponse,
      frameworkSignals?: Record<string, number>,
      strengthSignal?: string
    ) => void;
    answerIpsative: (
      response: ClientResponse,
      rankings: Array<{ type: string; rank: number }>
    ) => void;
    undoLastAnswer: () => void;
    takeSnapshot: () => void;
    persistCheckpoint: (type: "riasec" | "full" | "final") => Promise<PersistResult>;
  };
}

const QuestContext = createContext<QuestContextValue | null>(null);

export function useQuest(): QuestContextValue {
  const context = useContext(QuestContext);
  if (!context) {
    throw new Error("useQuest must be used within a QuestProvider");
  }
  return context;
}

interface QuestProviderProps {
  children: ReactNode;
  studentId: string;
}

/**
 * Retry a Supabase operation with exponential backoff.
 * 3 attempts: 1s, 2s, 4s delays.
 */
async function retryWithBackoff<T>(
  operation: () => PromiseLike<{ data: T | null; error: unknown }>,
  maxAttempts: number = 3
): Promise<{ data: T | null; error: unknown }> {
  let lastResult: { data: T | null; error: unknown } = {
    data: null,
    error: null,
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    lastResult = await operation();
    if (!lastResult.error) return lastResult;

    if (attempt < maxAttempts - 1) {
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return lastResult;
}

export function QuestProvider({ children, studentId }: QuestProviderProps): React.JSX.Element {
  const { state: questState, dispatch } = useQuestState();

  const {
    scoreState,
    processResponse,
    processResponseWithSignals,
    processIpsativeResponse,
    takeSnapshot,
    removeLastResponse,
  } = useScores();

  const answerQuestion = useCallback(
    (
      response: ClientResponse,
      frameworkSignals?: Record<string, number>,
      strengthSignal?: string
    ): void => {
      // Scoring side effect (kept outside reducer)
      if (frameworkSignals) {
        processResponseWithSignals(response, frameworkSignals, strengthSignal);
      } else {
        processResponse(response);
      }
    },
    [processResponse, processResponseWithSignals]
  );

  const answerIpsative = useCallback(
    (
      response: ClientResponse,
      rankings: Array<{ type: string; rank: number }>
    ): void => {
      processIpsativeResponse(rankings);
    },
    [processIpsativeResponse]
  );

  const undoLastAnswer = useCallback((): void => {
    removeLastResponse();
    dispatch({ type: "UNDO" });
  }, [dispatch, removeLastResponse]);

  const persistCheckpoint = useCallback(
    async (type: "riasec" | "full" | "final"): Promise<PersistResult> => {
      const supabase = createClient();

      try {
        if (type === "riasec") {
          // Lightweight -- just RIASEC + MI scores
          const result = await retryWithBackoff(() =>
            supabase
              .from("assessment_scores")
              .upsert({
                student_id: studentId,
                riasec_scores: scoreState.riasec,
                mi_scores: scoreState.mi,
                updated_at: new Date().toISOString(),
              })
          );
          if (result.error) {
            const errorType = classifySupabaseError(result.error);
            return { success: false, errorType, message: String((result.error as { message?: string }).message ?? "Unknown error") };
          }
        } else if (type === "full" || type === "final") {
          // Pre-save validation
          const validation = validateScoresBeforePersist(
            { riasec: scoreState.riasec, mi: scoreState.mi, mbti: scoreState.mbti, values: scoreState.values },
            questState.responses.length
          );
          if (!validation.valid) {
            return { success: false, errorType: "unknown", message: `Validation failed: ${validation.errors.join("; ")}` };
          }

          // Write session responses using upsert for idempotency
          const sessionResponses = questState.responses.map((r) => ({
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
            const responsesResult = await retryWithBackoff(() =>
              supabase.from("session_responses").upsert(sessionResponses, {
                onConflict: "student_id,question_id,session_number",
              })
            );
            if (responsesResult.error) {
              const errorType = classifySupabaseError(responsesResult.error);
              return { success: false, errorType, message: String((responsesResult.error as { message?: string }).message ?? "Unknown error") };
            }
          }

          // Write computed scores
          const scoresResult = await retryWithBackoff(() =>
            supabase.from("assessment_scores").upsert({
              student_id: studentId,
              riasec_scores: scoreState.riasec,
              mi_scores: scoreState.mi,
              mbti_indicators: scoreState.mbti,
              values_compass: scoreState.values,
              strengths: scoreState.strengths,
              updated_at: new Date().toISOString(),
            })
          );
          if (scoresResult.error) {
            const errorType = classifySupabaseError(scoresResult.error);
            return { success: false, errorType, message: String((scoresResult.error as { message?: string }).message ?? "Unknown error") };
          }

          if (type === "final") {
            // Update student session and mark completion atomically
            const studentResult = await retryWithBackoff(() =>
              supabase
                .from("students")
                .update({ current_session: 1, has_completed_session1: true })
                .eq("id", studentId)
            );
            if (studentResult.error) {
              const errorType = classifySupabaseError(studentResult.error);
              return { success: false, errorType, message: String((studentResult.error as { message?: string }).message ?? "Unknown error") };
            }

            // Insert Self-Discoverer achievement
            await supabase.from("achievements").upsert(
              {
                student_id: studentId,
                badge_id: "self_discoverer",
                unlocked_at: new Date().toISOString(),
              },
              { onConflict: "student_id,badge_id" }
            );
          }
        }

        return { success: true };
      } catch (err) {
        const errorType = classifySupabaseError(err);
        return { success: false, errorType, message: err instanceof Error ? err.message : "Unknown error" };
      }
    },
    [studentId, scoreState, questState.responses]
  );

  const value: QuestContextValue = {
    questState,
    scoreState,
    dispatch,
    actions: {
      answerQuestion,
      answerIpsative,
      undoLastAnswer,
      takeSnapshot,
      persistCheckpoint,
    },
  };

  return <QuestContext value={value}>{children}</QuestContext>;
}
