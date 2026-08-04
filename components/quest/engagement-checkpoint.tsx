"use client";

import { motion } from "framer-motion";
import { useScreenChange } from "@/hooks/use-screen-change";

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
  const headingRef = useScreenChange<HTMLHeadingElement>(displayMessage);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex max-w-sm flex-col items-center gap-6 text-center"
      >
        <span className="text-5xl" aria-hidden="true">
          {"\u{2728}"}
        </span>
        {/* A heading, not a paragraph: it is the only thing this screen says,
            and it has to be a focus target when the screen swaps in. */}
        <h1
          ref={headingRef}
          className="text-lg font-medium text-white/90 focus:outline-none"
        >
          {displayMessage}
        </h1>
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
