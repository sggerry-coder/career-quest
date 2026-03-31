"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";

interface IpsativeOption {
  label: string;
  value: string;
  emoji?: string;
  framework_signals?: Record<string, number>;
}

interface IpsativePickerProps {
  options: IpsativeOption[];
  onComplete: (ranked: { value: string; rank: number }[]) => void;
}

const RANK_STYLES = [
  {
    rank: 1,
    label: "1st",
    bg: "bg-amber-500/20",
    border: "border-amber-400",
    text: "text-amber-300",
    badge: "bg-amber-500 text-white",
  },
  {
    rank: 2,
    label: "2nd",
    bg: "bg-gray-400/10",
    border: "border-gray-400",
    text: "text-gray-300",
    badge: "bg-gray-400 text-white",
  },
  {
    rank: 3,
    label: "3rd",
    bg: "bg-amber-800/10",
    border: "border-amber-700",
    text: "text-amber-600",
    badge: "bg-amber-700 text-white",
  },
];

export default function IpsativePicker({
  options,
  onComplete,
}: IpsativePickerProps) {
  const [rankings, setRankings] = useState<Map<string, number>>(new Map());

  const handleTap = useCallback(
    (optionValue: string) => {
      // If this option already has a rank, reset all
      if (rankings.has(optionValue)) {
        setRankings(new Map());
        return;
      }

      const nextRank = rankings.size + 1;
      const updated = new Map(rankings);
      updated.set(optionValue, nextRank);

      // If this is the second tap, auto-assign rank 3 to remaining
      if (nextRank === 2) {
        const remaining = options.find((o) => !updated.has(o.value));
        if (remaining) {
          updated.set(remaining.value, 3);
        }
      }

      setRankings(updated);

      // If all ranked, fire onComplete
      if (updated.size === options.length) {
        const ranked = options.map((o) => ({
          value: o.value,
          rank: updated.get(o.value)!,
        }));
        onComplete(ranked);
      }
    },
    [rankings, options, onComplete]
  );

  return (
    <div className="w-full" role="group" aria-label="Rank these activities from most to least enjoyable">
      <p className="text-sm text-white/50 text-center mb-4">
        Tap your favourite first, then second. Third is auto-assigned.
      </p>
      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const rank = rankings.get(option.value);
          const rankStyle = rank ? RANK_STYLES[rank - 1] : null;

          return (
            <motion.button
              key={option.value}
              onClick={() => handleTap(option.value)}
              whileTap={{ scale: 0.97 }}
              animate={rank ? { scale: [1, 1.03, 1] } : {}}
              transition={{ duration: 0.2 }}
              aria-label={`${option.label}${rank ? `, ranked ${rank}` : ""}`}
              tabIndex={0}
              className={`relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 ${
                rankStyle
                  ? `${rankStyle.bg} ${rankStyle.border}`
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              {/* Emoji */}
              {option.emoji && (
                <span className="text-2xl flex-shrink-0">{option.emoji}</span>
              )}

              {/* Label */}
              <span
                className={`flex-1 font-medium ${
                  rankStyle ? rankStyle.text : "text-white/80"
                }`}
              >
                {option.label}
              </span>

              {/* Rank badge */}
              {rankStyle && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankStyle.badge}`}
                >
                  {rankStyle.label}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
      {rankings.size > 0 && rankings.size < options.length && (
        <p className="text-xs text-white/30 text-center mt-3">
          Tap a ranked activity to reset
        </p>
      )}
    </div>
  );
}
