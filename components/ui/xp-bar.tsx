"use client";

import { motion } from "framer-motion";
import { COSMETIC_UNLOCKS } from "@/lib/xp";

interface XpBarProps {
  currentXp: number;
  maxXp: number;
  /** Milestone name shown next to the count, e.g. "Chapter 1" (P2.2). */
  milestoneLabel?: string;
}

export default function XpBar({ currentXp, maxXp, milestoneLabel }: XpBarProps) {
  const pct = maxXp > 0 ? Math.min((currentXp / maxXp) * 100, 100) : 0;
  const isComplete = maxXp > 0 && currentXp >= maxXp;

  return (
    <div
      className="w-full"
      role="progressbar"
      aria-valuenow={currentXp}
      aria-valuemin={0}
      aria-valuemax={maxXp}
      aria-label={`${milestoneLabel ?? "XP"}: ${currentXp} of ${maxXp} experience points${
        isComplete ? ", complete" : ""
      }`}
    >
      {/* XP count */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-white/60">
          {milestoneLabel ?? "XP"}
        </span>
        <span className="text-xs font-mono text-white/50">
          {currentXp} / {maxXp}
          {isComplete && (
            <span className="ml-1 font-sans font-semibold text-[var(--color-accent)]">
              — Complete!
            </span>
          )}
        </span>
      </div>

      {/* Bar with cosmetic unlock markers (no overflow clip: the final
          marker sits at exactly 100% and must stay fully visible) */}
      <div className="relative h-3 rounded-full bg-white/10">
        {/* Fill */}
        <motion.div
          className="h-full rounded-full bg-[var(--color-accent)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />

        {/* Cosmetic unlock markers -- each tier styles the profile frame */}
        {COSMETIC_UNLOCKS.filter((t) => t.xp <= maxXp).map((t) => {
          const markerPct = (t.xp / maxXp) * 100;
          const isUnlocked = currentXp >= t.xp;
          return (
            <div
              key={t.xp}
              className="absolute top-0 bottom-0 flex items-center"
              style={{ left: `${markerPct}%` }}
              title={`${t.label} (${t.description}) — ${
                isUnlocked ? "unlocked!" : `unlocks at ${t.xp} XP`
              }`}
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
