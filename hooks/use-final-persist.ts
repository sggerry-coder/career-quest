"use client";

import { useCallback, useRef, useState } from "react";
import type {
  ErrorCategory,
  PersistResult,
} from "@/lib/validation/error-classification";

/**
 * State machine for the one-shot final save at the end of Session 1.
 *
 *   idle → saving → saved
 *                ↘ failed → (retry) → saving → …
 *
 * Exists because the session page previously tracked this as
 * `PersistResult | null`, where `null` meant both "not started yet" and "in
 * flight". With no state meaning *saving*, the completion screen had nothing
 * to wait for and rendered its confetti and "View Dashboard" button whatever
 * the save was doing — so a failed save looked exactly like a finished quest.
 *
 * The retry-with-backoff inside lib/persistence/final-persist runs first;
 * `retry()` here is the manual last resort after those attempts are spent.
 */

export type FinalPersistStatus = "idle" | "saving" | "saved" | "failed";

export interface UseFinalPersist {
  status: FinalPersistStatus;
  /** Set when status is "failed"; decides retry vs sign-in. */
  errorType: ErrorCategory | null;
  /**
   * The underlying error text, surfaced as fine print on the failure screen.
   * A missing database column once presented to a student as "check your
   * connection", which sent them hunting a wifi problem that did not exist.
   */
  errorMessage: string | null;
  /** Fire the save. Safe to call repeatedly — only the first call runs. */
  start: () => void;
  /** Manual retry after a failure. Not one-shot. */
  retry: () => void;
}

export function useFinalPersist(
  run: () => Promise<PersistResult>
): UseFinalPersist {
  const [status, setStatus] = useState<FinalPersistStatus>("idle");
  const [errorType, setErrorType] = useState<ErrorCategory | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStarted = useRef(false);

  const apply = useCallback((result: PersistResult): void => {
    if (result.success) {
      setStatus("saved");
      setErrorType(null);
      setErrorMessage(null);
    } else {
      setStatus("failed");
      setErrorType(result.errorType ?? "unknown");
      setErrorMessage(result.message ?? null);
    }
  }, []);

  const attempt = useCallback((): void => {
    setStatus("saving");
    setErrorType(null);
    setErrorMessage(null);
    // Pure async call kept out of setState for React 19 Compiler compliance.
    run().then(apply, () => {
      setStatus("failed");
      setErrorType("unknown");
      setErrorMessage(null);
    });
  }, [run, apply]);

  const start = useCallback((): void => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    attempt();
  }, [attempt]);

  return { status, errorType, errorMessage, start, retry: attempt };
}
