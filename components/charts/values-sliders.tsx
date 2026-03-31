"use client";

import { motion } from "framer-motion";

interface ValuesSlidersProps {
  scores: Record<string, number>;
}

const VALUES_DIMENSIONS = [
  { key: "security_adventure", leftLabel: "Security", rightLabel: "Adventure" },
  { key: "income_impact", leftLabel: "Income", rightLabel: "Impact" },
  { key: "solo_team", leftLabel: "Solo", rightLabel: "Team" },
];

const REMAINING_DIMENSIONS = [
  { key: "prestige_fulfilment", leftLabel: "Prestige", rightLabel: "Fulfilment" },
  { key: "structure_flexibility", leftLabel: "Structure", rightLabel: "Flexibility" },
];

export default function ValuesSliders({ scores }: ValuesSlidersProps) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-white/70 mb-1 uppercase tracking-wider">
        Values Compass
      </h3>
      <p className="text-xs text-white/30 mb-4">Initial value readings</p>

      <div className="flex flex-col gap-5 mb-4">
        {VALUES_DIMENSIONS.map((dim, index) => {
          const score = scores[dim.key] ?? 0;
          // Map -100..+100 to 0..100% position
          const position = ((score + 100) / 200) * 100;

          return (
            <div key={dim.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/50">{dim.leftLabel}</span>
                <span className="text-xs text-white/50">{dim.rightLabel}</span>
              </div>
              <div className="relative h-6 rounded-full bg-white/10">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                <motion.div
                  className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)] shadow-[0_0_10px_var(--color-glow)]"
                  initial={{ left: "50%" }}
                  animate={{ left: `${position}%` }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 20,
                    delay: index * 0.15,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Remaining grayed out */}
      <div className="flex flex-col gap-3 opacity-40">
        {REMAINING_DIMENSIONS.map((dim) => (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/30">{dim.leftLabel}</span>
              <span className="text-xs text-white/30">{dim.rightLabel}</span>
            </div>
            <div className="h-4 rounded-full bg-white/5" />
          </div>
        ))}
        <p className="text-xs text-white/20 italic">
          More dimensions in Session 2
        </p>
      </div>
    </div>
  );
}
