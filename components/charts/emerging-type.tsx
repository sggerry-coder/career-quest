"use client";

import { motion } from "framer-motion";

interface EmergingTypeProps {
  /** e.g. "I N _ J" */
  typeCode: string;
  /** e.g. "The Strategic Visionary" */
  descriptor: string;
  /** true if any dichotomy is underdetermined */
  hasEmerging?: boolean;
}

export default function EmergingType({
  typeCode,
  descriptor,
  hasEmerging,
}: EmergingTypeProps) {
  const letters = typeCode.split(" ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="flex items-center gap-2">
        {letters.map((letter, i) => {
          const isUnderscore = letter === "_";
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              // 30px bold is large text, so the floor is 3:1 -- which four of
              // the palette primaries missed on the dark background (2.37:1
              // for a Wanderer). Accent, as everywhere else the palette has
              // to be read rather than sat on. See charts/class-label.
              className={`text-3xl font-bold tracking-widest ${
                isUnderscore
                  ? "text-white/55"
                  : "text-[var(--color-accent)]"
              }`}
            >
              {letter}
            </motion.span>
          );
        })}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-sm text-white/60 italic"
      >
        {descriptor}
      </motion.p>
      {hasEmerging && (
        <div className="mt-2 flex flex-col items-center gap-1">
          <span className="rounded-full bg-white/10 border border-white/20 px-3 py-0.5 text-xs font-medium text-white/60">
            Still Emerging
          </span>
          <p className="text-xs text-white/55 max-w-[200px] text-center">
            Some preferences need more data to pin down
          </p>
        </div>
      )}
    </motion.div>
  );
}
