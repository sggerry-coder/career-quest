"use client";

import { motion } from "framer-motion";

interface RiasecBarsProps {
  scores: Record<string, number>;
  classLabel: string;
}

const RIASEC_TYPES = [
  { key: "R", label: "Maker", emoji: "\u{1F527}" },
  { key: "I", label: "Investigator", emoji: "\u{1F52C}" },
  { key: "A", label: "Creator", emoji: "\u{1F3A8}" },
  { key: "S", label: "Helper", emoji: "\u{1F91D}" },
  { key: "E", label: "Leader", emoji: "\u{1F4E2}" },
  { key: "C", label: "Organizer", emoji: "\u{1F4CB}" },
];

export default function RiasecBars({ scores, classLabel }: RiasecBarsProps) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider">
        Ability Scores
      </h3>
      <div className="flex flex-col gap-3">
        {RIASEC_TYPES.map((type, index) => {
          const score = Math.round(scores[type.key] ?? 0);
          const isHighlighted = score > 50;
          return (
            <div key={type.key} className="flex items-center gap-3">
              <span className="text-lg w-7 text-center flex-shrink-0">
                {type.emoji}
              </span>
              <span className="text-xs text-white/50 w-20 flex-shrink-0">
                {type.label}
              </span>
              <div className="flex-1 h-6 rounded-full bg-white/10 overflow-hidden relative">
                <motion.div
                  className={`h-full rounded-full ${
                    isHighlighted
                      ? "bg-[var(--color-accent)]"
                      : "bg-white/20"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 20,
                    delay: index * 0.1,
                  }}
                />
              </div>
              <span
                className={`text-sm font-mono w-8 text-right flex-shrink-0 ${
                  isHighlighted ? "text-white" : "text-white/40"
                }`}
              >
                {score}
              </span>
            </div>
          );
        })}
      </div>
      {/* CLASS label badge */}
      <div className="mt-4 flex justify-center">
        <span className="rounded-full bg-[var(--color-primary)]/20 px-4 py-1.5 text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider">
          CLASS: {classLabel}
        </span>
      </div>
    </div>
  );
}
