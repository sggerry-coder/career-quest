"use client";

import { motion } from "framer-motion";

interface OptionGridOption {
  label: string;
  value: string;
  emoji?: string;
  subtitle?: string;
}

interface OptionGridProps {
  options: OptionGridOption[];
  value: string | null;
  onChange: (value: string) => void;
}

export default function OptionGrid({
  options,
  value,
  onChange,
}: OptionGridProps) {
  return (
    <div
      className="grid grid-cols-2 gap-3 w-full"
      role="radiogroup"
      aria-label="Select one option"
    >
      {options.map((option, index) => {
        const isSelected = value === option.value;
        return (
          <motion.button
            key={option.value}
            onClick={() => onChange(option.value)}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            role="radio"
            aria-checked={isSelected}
            aria-label={option.label}
            tabIndex={0}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[88px] ${
              isSelected
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
            }`}
          >
            {option.emoji && <span className="text-2xl">{option.emoji}</span>}
            <span
              className={`text-sm font-medium ${
                isSelected ? "text-white" : "text-white/80"
              }`}
            >
              {option.label}
            </span>
            {option.subtitle && (
              <span className="text-xs text-white/40">{option.subtitle}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
