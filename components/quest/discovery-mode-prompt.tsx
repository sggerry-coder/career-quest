"use client";

import { motion } from "framer-motion";

interface DiscoveryModePromptProps {
  className: string;
  onContinue: () => void;
}

export default function DiscoveryModePrompt({
  className,
  onContinue,
}: DiscoveryModePromptProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex max-w-sm flex-col items-center gap-6 text-center"
      >
        <span className="text-5xl">{"\u{1F914}"}</span>
        <h2 className="text-xl font-semibold text-white">
          Tough to decide?
        </h2>
        <p className="text-sm text-white/70 leading-relaxed">
          Let&apos;s try a different approach, {className}. Instead of rating
          activities, you&apos;ll pick between two options. No sitting on the fence!
        </p>
        <button
          onClick={onContinue}
          className="rounded-xl bg-[var(--color-primary)] px-8 py-3 font-medium text-white shadow-[0_0_20px_var(--color-glow)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
          aria-label="Continue with discovery mode"
          tabIndex={0}
        >
          Let&apos;s try it!
        </button>
      </motion.div>
    </div>
  );
}
