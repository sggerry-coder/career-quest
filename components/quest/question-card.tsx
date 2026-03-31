"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface QuestionCardProps {
  questionText: string;
  questionIndex: number;
  totalQuestions: number;
  blockName: string;
  timeEstimate: string;
  direction: "left" | "right";
  canUndo: boolean;
  onUndo: () => void;
  canSkip: boolean;
  onSkip: () => void;
  children: ReactNode;
}

const variants = {
  enter: (direction: "left" | "right") => ({
    x: direction === "left" ? -300 : 300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: "left" | "right") => ({
    x: direction === "left" ? 300 : -300,
    opacity: 0,
  }),
};

export default function QuestionCard({
  questionText,
  questionIndex,
  totalQuestions,
  blockName,
  timeEstimate,
  direction,
  canUndo,
  onUndo,
  canSkip,
  onSkip,
  children,
}: QuestionCardProps) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      {/* Top bar: undo + block info + time */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {canUndo && (
            <button
              onClick={onUndo}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Go back to previous question"
              tabIndex={0}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.5 15L7.5 10L12.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
            {blockName}
          </span>
        </div>
        <span className="text-xs text-white/50">{timeEstimate}</span>
      </div>

      {/* Question content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={questionIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex w-full max-w-lg flex-col items-center gap-8"
        >
          <div className="text-center">
            <p className="text-sm text-white/50 mb-2">
              {questionIndex + 1} of {totalQuestions}
            </p>
            <h2 className="text-xl font-semibold leading-relaxed text-white md:text-2xl">
              {questionText}
            </h2>
          </div>

          {/* Input component slot */}
          <div className="w-full">{children}</div>

          {/* Skip button */}
          {canSkip && (
            <button
              onClick={onSkip}
              className="mt-2 text-sm text-white/40 underline decoration-white/20 transition-colors hover:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-2 py-1"
              aria-label="Skip this question"
              tabIndex={0}
            >
              Skip this question
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
