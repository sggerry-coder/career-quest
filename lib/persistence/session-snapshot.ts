import type { QuestState, FlowPhase } from "@/hooks/use-quest-state";
import type { ScoreState } from "@/hooks/use-scores";

/**
 * Mid-session checkpoint persistence (P1.1).
 *
 * Serializes { questState, scoreState, selfMap } to localStorage keyed by
 * student id so a refresh, tab close, or crash mid-session does not lose
 * 20 minutes of answers. Zero-schema: no server writes involved.
 */

/**
 * Bumped to 2 on 2026-08-03 with the move to a four-point rating scale.
 *
 * A version 1 checkpoint holds answers on the old 1-5 scale, where 3 meant
 * "Neutral". On the new scale 3 means "Like", so resuming one would silently
 * reinterpret every unsure answer as a positive one. Refusing to restore is
 * the honest outcome: the student starts clean rather than getting a profile
 * built from two different scales.
 */
const SNAPSHOT_VERSION = 2;
const KEY_PREFIX = "cq-session1-snapshot-";

export interface SessionSelfMap {
  clarity: number;
  sources: string[];
  perceived_strengths: string[];
}

export interface SessionSnapshot {
  version: number;
  savedAt: number;
  questState: QuestState;
  scoreState: ScoreState;
  selfMap: SessionSelfMap | null;
}

const VALID_FLOW_PHASES: FlowPhase[] = [
  "questions",
  "block_transition",
  "class_named",
  "engagement",
  "selfmap",
  "reveal",
  "confirmatory",
  "complete",
];

export function snapshotKey(studentId: string): string {
  return `${KEY_PREFIX}${studentId}`;
}

/**
 * Persist the current session state. Silent no-op on quota/serialization
 * errors or outside the browser, per project conventions.
 */
export function saveSessionSnapshot(
  studentId: string,
  questState: QuestState,
  scoreState: ScoreState,
  selfMap: SessionSelfMap | null
): void {
  if (typeof window === "undefined" || !studentId) return;
  try {
    const snapshot: SessionSnapshot = {
      version: SNAPSHOT_VERSION,
      savedAt: Date.now(),
      questState,
      scoreState,
      selfMap,
    };
    window.localStorage.setItem(snapshotKey(studentId), JSON.stringify(snapshot));
  } catch {
    // Silent catch -- checkpointing is best-effort
  }
}

/**
 * Shape-check a parsed snapshot so a corrupt or outdated entry can never
 * rehydrate the reducer with invalid state.
 */
function isValidSnapshot(value: unknown): value is SessionSnapshot {
  if (!value || typeof value !== "object") return false;
  const snap = value as Partial<SessionSnapshot>;
  if (snap.version !== SNAPSHOT_VERSION) return false;

  const quest = snap.questState as Partial<QuestState> | undefined;
  if (!quest || typeof quest !== "object") return false;
  if (typeof quest.currentIndex !== "number" || quest.currentIndex < 0) return false;
  if (typeof quest.confirmIndex !== "number" || quest.confirmIndex < 0) return false;
  if (!VALID_FLOW_PHASES.includes(quest.flowPhase as FlowPhase)) return false;
  if (!Array.isArray(quest.responses)) return false;
  if (!Array.isArray(quest.adaptiveQuestions)) return false;
  if (typeof quest.engagementShown !== "boolean") return false;
  if (typeof quest.questions_answered !== "number") return false;

  const scores = snap.scoreState as Partial<ScoreState> | undefined;
  if (!scores || typeof scores !== "object") return false;
  if (!scores.riasec || typeof scores.riasec !== "object") return false;
  if (!scores.riasec_raw || typeof scores.riasec_raw !== "object") return false;
  if (!Array.isArray(scores.signal_history)) return false;

  return true;
}

/**
 * Load a previously saved snapshot for this student.
 * Returns null when absent, corrupt, or from an incompatible version.
 */
export function loadSessionSnapshot(studentId: string): SessionSnapshot | null {
  if (typeof window === "undefined" || !studentId) return null;
  try {
    const raw = window.localStorage.getItem(snapshotKey(studentId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Remove the snapshot (after final persist succeeds or on "Start over"). */
export function clearSessionSnapshot(studentId: string): void {
  if (typeof window === "undefined" || !studentId) return;
  try {
    window.localStorage.removeItem(snapshotKey(studentId));
  } catch {
    // Silent catch
  }
}
