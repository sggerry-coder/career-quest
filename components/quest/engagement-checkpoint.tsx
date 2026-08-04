"use client";

import { motion } from "framer-motion";

interface EngagementCheckpointProps {
  /**
   * The student's class name, or null while they are still a Wanderer.
   *
   * This checkpoint fires inside the interest block, which is before the
   * first naming for every student, so null is the common case rather than
   * an edge case. Addressing them by their placeholder produced "Nice
   * progress, Wanderer!" for 100% of students and, in explorer tone, the
   * ungrammatical "Nice progress, Still forming!".
   */
  characterName: string | null;
  tone: "quest" | "explorer";
  message?: string;
  onContinue: () => void;
}

function defaultMessage(
  characterName: string | null,
  tone: "quest" | "explorer"
): string {
  if (tone === "explorer") {
    return characterName
      ? `Nice progress, ${characterName}. You're about halfway.`
      : "Nice progress. You're about halfway.";
  }
  return characterName
    ? `Nice progress, ${characterName}! Halfway there...`
    : "Nice progress! Halfway there...";
}

export default function EngagementCheckpoint({
  characterName,
  tone,
  message,
  onContinue,
}: EngagementCheckpointProps) {
  const displayMessage = message || defaultMessage(characterName, tone);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex max-w-sm flex-col items-center gap-6 text-center"
      >
        <span className="text-5xl">{"\u{2728}"}</span>
        <p className="text-lg font-medium text-white/90">{displayMessage}</p>
        <button
          onClick={onContinue}
          className="rounded-xl bg-[var(--color-primary)] px-8 py-3 font-medium text-white shadow-[0_0_20px_var(--color-glow)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
          aria-label="Continue quest"
          tabIndex={0}
        >
          {tone === "quest" ? "Keep going!" : "Keep going"}
        </button>
      </motion.div>
    </div>
  );
}
