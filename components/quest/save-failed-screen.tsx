"use client";

import { motion } from "framer-motion";
import type { ErrorCategory } from "@/lib/validation/error-classification";
import { useScreenChange } from "@/hooks/use-screen-change";

interface SaveFailedScreenProps {
  errorType: ErrorCategory;
  /** Raw error text, shown as fine print so a real cause isn't hidden. */
  detail?: string | null;
  onRetry: () => void;
  onSignIn: () => void;
  onLeave: () => void;
}

/**
 * Replaces the celebration when the final save fails.
 *
 * Deliberately offers no "View Dashboard": the dashboard reads
 * assessment_scores, which is the write that just failed, so it would land the
 * student on an empty page — the exact experience this screen exists to
 * prevent.
 *
 * The promise that answers are kept is true, not reassurance. The
 * checkpoint-save effect in the session page skips only on success, so a
 * failed save leaves the localStorage snapshot in place and the student is
 * offered a resume next visit.
 */
export default function SaveFailedScreen({
  errorType,
  detail = null,
  onRetry,
  onSignIn,
  onLeave,
}: SaveFailedScreenProps): React.JSX.Element {
  const isAuth = errorType === "auth";
  // This screen replaces the celebration. role="alert" already interrupts, but
  // it leaves a keyboard student with focus on nothing.
  const headingRef = useScreenChange<HTMLHeadingElement>(`save-failed:${errorType}`);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex w-full max-w-sm flex-col items-center gap-5 text-center"
        role="alert"
        aria-live="assertive"
      >
        <span className="text-4xl" aria-hidden="true">
          {"\u{26A0}\u{FE0F}"}
        </span>

        <h1
          ref={headingRef}
          className="text-xl font-semibold text-white focus:outline-none"
        >
          We couldn&apos;t save your results
        </h1>

        <p className="text-sm text-white/60">
          Your answers are safe on this device.{" "}
          {isAuth
            ? "You've been signed out, so we can't save them to your account yet."
            : "This is usually the internet connection."}
        </p>

        <div className="flex w-full flex-col gap-3">
          {isAuth ? (
            <button
              onClick={onSignIn}
              className="rounded-xl bg-[var(--cq-primary,#8b5cf6)] px-8 py-3 font-semibold text-white shadow-[0_0_20px_var(--cq-glow,rgba(139,92,246,0.3))] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
            >
              Sign in again
            </button>
          ) : (
            <button
              onClick={onRetry}
              className="rounded-xl bg-[var(--cq-primary,#8b5cf6)] px-8 py-3 font-semibold text-white shadow-[0_0_20px_var(--cq-glow,rgba(139,92,246,0.3))] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
            >
              Try saving again
            </button>
          )}

          <button
            onClick={onLeave}
            className="rounded-xl border border-white/20 bg-transparent px-8 py-3 font-semibold text-white/70 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
          >
            Leave for now
          </button>
        </div>

        <p className="text-xs text-white/65">
          We&apos;ll offer to pick up where you left off next time you open
          this.
        </p>

        {detail && (
          <p className="text-[10px] font-mono text-white/55 break-words max-w-xs">
            {detail}
          </p>
        )}
      </motion.div>
    </div>
  );
}
