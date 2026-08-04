"use client";

import { motion } from "framer-motion";
import { chapterLabel } from "@/lib/copy/chapter";
import { useScreenChange } from "@/hooks/use-screen-change";

interface ResumePromptProps {
  tone: "quest" | "explorer";
  questionsAnswered: number;
  onResume: () => void;
  onStartOver: () => void;
}

/**
 * Tone-branched "Welcome back" card shown when a mid-session checkpoint
 * exists for this student (P1.1). Resume rehydrates the saved state;
 * Start over clears the checkpoint and begins from question 1.
 */
export default function ResumePrompt({
  tone,
  questionsAnswered,
  onResume,
  onStartOver,
}: ResumePromptProps): React.JSX.Element {
  const heading =
    tone === "quest" ? "Welcome back, adventurer!" : "Welcome back!";
  const headingRef = useScreenChange<HTMLHeadingElement>(heading);
  const body =
    tone === "quest"
      ? `Your quest paused with ${questionsAnswered} ${
          questionsAnswered === 1 ? "answer" : "answers"
        } already recorded. Pick up where you left off?`
      : `You were part-way through ${chapterLabel(1, tone)} (${questionsAnswered} ${
          questionsAnswered === 1 ? "answer" : "answers"
        } saved). Pick up where you left off?`;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-sm w-full flex flex-col items-center gap-6 rounded-2xl bg-white/5 border border-white/10 p-6"
      >
        <span className="text-5xl" aria-hidden="true">
          {"\u{1F4CD}"}
        </span>
        <h1
          ref={headingRef}
          className="text-xl font-semibold text-white focus:outline-none"
        >
          {heading}
        </h1>
        <p className="text-sm text-white/60">{body}</p>
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onResume}
            className="rounded-xl bg-[var(--color-primary)] px-8 py-3 font-medium text-white shadow-[0_0_20px_var(--color-glow)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
            tabIndex={0}
          >
            {tone === "quest" ? (
              <>
                Resume Quest <span aria-hidden="true">⚔️</span>
              </>
            ) : (
              "Resume"
            )}
          </button>
          <button
            onClick={onStartOver}
            className="rounded-xl bg-transparent border border-white/20 px-8 py-3 font-medium text-white/70 transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
            tabIndex={0}
          >
            Start over
          </button>
        </div>
      </motion.div>
    </div>
  );
}
