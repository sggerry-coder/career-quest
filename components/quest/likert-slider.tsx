"use client";

import { motion } from "framer-motion";

interface LikertSliderProps {
  value: number | null;
  onChange: (value: number) => void;
}

const POINTS = [
  { value: 1, emoji: "\u{1F612}", label: "Strongly Dislike" },
  { value: 2, emoji: "\u{1F615}", label: "Dislike" },
  { value: 3, emoji: "\u{1F610}", label: "Neutral" },
  { value: 4, emoji: "\u{1F642}", label: "Like" },
  { value: 5, emoji: "\u{1F929}", label: "Strongly Like" },
];

export default function LikertSlider({ value, onChange }: LikertSliderProps) {
  return (
    <div className="w-full" role="radiogroup" aria-label="Rate on a scale of 1 to 5">
      {/* Emoji labels row */}
      <div className="flex items-center justify-between mb-3 px-1">
        {POINTS.map((point) => (
          <span
            key={point.value}
            className={`text-2xl transition-transform ${
              value === point.value ? "scale-125" : "opacity-60"
            }`}
          >
            {point.emoji}
          </span>
        ))}
      </div>

      {/* Track */}
      <div className="relative flex items-center justify-between rounded-full bg-white/10 p-1 h-14">
        {POINTS.map((point) => {
          const isSelected = value === point.value;
          return (
            <button
              key={point.value}
              onClick={() => onChange(point.value)}
              role="radio"
              aria-checked={isSelected}
              aria-label={point.label}
              tabIndex={0}
              className={`relative z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 ${
                isSelected
                  ? "bg-[var(--color-primary)] text-white shadow-[0_0_16px_var(--color-glow)]"
                  : "text-white/60 hover:bg-white/10"
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="likert-indicator"
                  className="absolute inset-0 rounded-full bg-[var(--color-primary)] shadow-[0_0_16px_var(--color-glow)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{point.value}</span>
            </button>
          );
        })}
      </div>

      {/* Label text */}
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-xs text-white/40">Strongly Dislike</span>
        <span className="text-xs text-white/40">Strongly Like</span>
      </div>
    </div>
  );
}
