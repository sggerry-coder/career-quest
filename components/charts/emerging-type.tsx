"use client";

import { motion } from "framer-motion";

interface EmergingTypeProps {
  /** e.g. "I N _ J" */
  typeCode: string;
  /** e.g. "The Strategic Visionary" */
  descriptor: string;
}

export default function EmergingType({
  typeCode,
  descriptor,
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
              className={`text-3xl font-bold tracking-widest ${
                isUnderscore
                  ? "text-white/20"
                  : "text-[var(--color-primary)]"
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
    </motion.div>
  );
}
