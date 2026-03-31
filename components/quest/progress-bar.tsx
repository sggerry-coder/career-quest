"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  currentBlock: string;
  questionsAnsweredInBlock: number;
  totalQuestionsInBlock: number;
  totalQuestionsAnswered: number;
  totalQuestions: number;
  timeEstimate: string;
}

export default function ProgressBar({
  currentBlock,
  questionsAnsweredInBlock,
  totalQuestionsInBlock,
  totalQuestionsAnswered,
  totalQuestions,
  timeEstimate,
}: ProgressBarProps) {
  const blockProgress =
    totalQuestionsInBlock > 0
      ? (questionsAnsweredInBlock / totalQuestionsInBlock) * 100
      : 0;
  const overallProgress =
    totalQuestions > 0 ? (totalQuestionsAnswered / totalQuestions) * 100 : 0;

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Block name pill + time estimate */}
      <div className="flex items-center justify-between mb-2">
        <span className="rounded-full bg-[var(--color-primary)]/20 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
          {currentBlock}
        </span>
        <span className="text-xs text-white/40">~{timeEstimate} left</span>
      </div>

      {/* Block progress bar */}
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[var(--color-primary)]"
          initial={{ width: 0 }}
          animate={{ width: `${blockProgress}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
        />
      </div>

      {/* Overall progress */}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] text-white/30">
          {questionsAnsweredInBlock}/{totalQuestionsInBlock} in block
        </span>
        <span className="text-[10px] text-white/30">
          {totalQuestionsAnswered}/{totalQuestions} overall
        </span>
      </div>

      {/* Thin overall progress bar */}
      <div className="mt-1 h-1 w-full rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[var(--color-accent)]"
          initial={{ width: 0 }}
          animate={{ width: `${overallProgress}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
        />
      </div>
    </div>
  );
}
