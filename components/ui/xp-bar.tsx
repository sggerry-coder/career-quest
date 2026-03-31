"use client";

import { motion } from "framer-motion";

interface XpBarProps {
  currentXp: number;
  maxXp: number;
}

const COSMETIC_THRESHOLDS = [
  { xp: 150, label: "Background", emoji: "\u{1F3A8}" },
  { xp: 300, label: "Accent", emoji: "\u{2728}" },
  { xp: 450, label: "Gold Trim", emoji: "\u{1F451}" },
];

export default function XpBar({ currentXp, maxXp }: XpBarProps) {
  const pct = maxXp > 0 ? Math.min((currentXp / maxXp) * 100, 100) : 0;

  return (
    <div className="w-full">
      {/* XP count */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-white/60">XP</span>
        <span className="text-xs font-mono text-white/50">
          {currentXp} / {maxXp}
        </span>
      </div>

      {/* Bar with threshold markers */}
      <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
        {/* Fill */}
        <motion.div
          className="h-full rounded-full bg-[var(--color-accent)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />

        {/* Threshold markers */}
        {COSMETIC_THRESHOLDS.map((t) => {
          const markerPct = (t.xp / maxXp) * 100;
          const isUnlocked = currentXp >= t.xp;
          return (
            <div
              key={t.xp}
              className="absolute top-0 bottom-0 flex items-center"
              style={{ left: `${markerPct}%` }}
              title={`${t.label} unlocked at ${t.xp} XP`}
            >
              <div
                className={`h-5 w-5 -translate-x-1/2 rounded-full border-2 flex items-center justify-center text-[8px] ${
                  isUnlocked
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/30"
                    : "border-white/20 bg-white/5"
                }`}
              >
                {isUnlocked ? t.emoji : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
