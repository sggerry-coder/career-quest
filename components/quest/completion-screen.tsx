"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import PersistenceBanner from "@/components/ui/persistence-banner";

interface CompletionScreenProps {
  tone: "quest" | "explorer";
  classLabel: string;
  scoreState: {
    riasec: Record<string, number>;
    strengths: string[];
  };
  onViewDashboard: () => void;
  onSaveExit: () => void;
  persistResult: { success: boolean; errorType?: string } | null;
  onRetryPersist: () => void;
  onSignIn: () => void;
}

export default function CompletionScreen({
  tone,
  classLabel,
  scoreState,
  onViewDashboard,
  onSaveExit,
  persistResult,
  onRetryPersist,
  onSignIn,
}: CompletionScreenProps): React.JSX.Element {
  const hasFired = useRef(false);

  // Fire confetti on mount (once)
  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    // Respect reduced motion preference
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    (async () => {
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#a855f7", "#6366f1", "#2dd4bf", "#f59e0b"],
        });
      } catch {
        // Silent catch -- confetti is cosmetic only
      }
    })();
  }, []);

  const heading =
    tone === "quest" ? "Quest Chapter 1 Complete" : "Session 1 Complete";
  const subheading =
    tone === "quest"
      ? "Your profile has been forged!"
      : "Here\u2019s what we discovered.";

  const topStrength =
    scoreState.strengths.length > 0 ? scoreState.strengths[0] : null;

  const showBanner = persistResult !== null && !persistResult.success;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      {/* Animated checkmark */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
        >
          <motion.circle
            cx="20"
            cy="20"
            r="18"
            stroke="#2dd4bf"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <motion.path
            d="M12 20l6 6 10-12"
            stroke="#2dd4bf"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          />
        </svg>
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.8 }}
        className="text-2xl font-semibold text-white text-center"
      >
        {heading}
      </motion.h1>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 1.0 }}
        className="text-sm text-white/60 text-center"
      >
        {subheading}
      </motion.p>

      {/* Static summary cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 1.4 }}
        className="flex flex-row gap-3 max-w-sm w-full justify-center"
      >
        {/* Class card */}
        <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {classLabel}
          </p>
          <p className="text-[11px] text-white/40 mt-0.5">Your Archetype</p>
        </div>

        {/* Top strength card */}
        {topStrength && (
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {topStrength}
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">Top Strength</p>
          </div>
        )}
      </motion.div>

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 1.8 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <button
          onClick={onViewDashboard}
          className="rounded-xl bg-[var(--cq-primary,#8b5cf6)] px-8 py-3 font-semibold text-white shadow-[0_0_20px_var(--cq-glow,rgba(139,92,246,0.3))] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
          aria-label="View Dashboard"
        >
          View Dashboard
        </button>
        <button
          onClick={onSaveExit}
          className="rounded-xl bg-transparent border border-white/20 px-8 py-3 font-semibold text-white/70 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
          aria-label="Save and Exit"
        >
          Save &amp; Exit
        </button>
      </motion.div>

      {/* Persistence failure banner */}
      {showBanner && (
        <PersistenceBanner
          errorType={
            (persistResult?.errorType as "network" | "auth" | "unknown") ??
            "unknown"
          }
          onRetry={onRetryPersist}
          onSignIn={onSignIn}
          visible={true}
        />
      )}
    </div>
  );
}
