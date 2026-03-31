"use client";

import { motion } from "framer-motion";

interface EngagementCheckpointProps {
  className: string;
  message?: string;
  onContinue: () => void;
}

export default function EngagementCheckpoint({
  className,
  message,
  onContinue,
}: EngagementCheckpointProps) {
  const displayMessage =
    message || `Nice progress, ${className}! Halfway there...`;

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
          Keep going!
        </button>
      </motion.div>
    </div>
  );
}
