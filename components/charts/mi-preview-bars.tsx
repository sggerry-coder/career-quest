"use client";

import { motion } from "framer-motion";
import { chapterLabel } from "@/lib/copy/chapter";

interface MiPreviewBarsProps {
  scores: Record<string, number>;
  tone: "quest" | "explorer";
}

const MI_DIMENSIONS = [
  { key: "linguistic", label: "Linguistic" },
  { key: "logical", label: "Logical-Mathematical" },
  { key: "spatial", label: "Spatial" },
  { key: "musical", label: "Musical" },
  { key: "bodily", label: "Bodily-Kinesthetic" },
  { key: "interpersonal", label: "Interpersonal" },
  { key: "intrapersonal", label: "Intrapersonal" },
  { key: "naturalistic", label: "Naturalistic" },
];

export default function MiPreviewBars({ scores, tone }: MiPreviewBarsProps) {
  // A dimension reads 0 until it has enough signals to earn a score (see
  // MIN_MI_SIGNALS in lib/scoring/mi.ts). If every dimension is still 0,
  // there is no "strongest" to rank -- an empty top-three would just
  // dress up "no data yet" as a result.
  const allZero = MI_DIMENSIONS.every((dim) => (scores[dim.key] ?? 0) === 0);

  // Sort by score descending, take top 3
  const sorted = [...MI_DIMENSIONS].sort(
    (a, b) => (scores[b.key] ?? 0) - (scores[a.key] ?? 0)
  );
  const top3 = sorted.slice(0, 3);
  const remaining = sorted.slice(3);

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-white/70 mb-1 uppercase tracking-wider">
        Learning Styles
      </h3>
      <p className="text-xs text-white/30 mb-4">
        Your strongest learning styles (preliminary)
      </p>

      {allZero ? (
        <p className="text-xs text-white/30 text-center py-2">
          Answer more questions to refine
        </p>
      ) : (
        <>
          {/* Top 3 bars */}
          <div className="flex flex-col gap-3 mb-4">
            {top3.map((dim, index) => {
              const score = Math.round(scores[dim.key] ?? 0);
              return (
                <div key={dim.key} className="flex items-center gap-3">
                  <span className="text-xs text-white/60 w-28 flex-shrink-0 truncate">
                    {dim.label}
                  </span>
                  <div className="flex-1 h-4 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[var(--color-accent)]"
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
                  <span className="text-xs font-mono text-white/50 w-6 text-right flex-shrink-0">
                    {score}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Remaining grayed out */}
          <div className="flex flex-col gap-2 opacity-40">
            {remaining.map((dim) => (
              <div key={dim.key} className="flex items-center gap-3">
                <span className="text-xs text-white/30 w-28 flex-shrink-0 truncate">
                  {dim.label}
                </span>
                <div className="flex-1 h-3 rounded-full bg-white/5" />
              </div>
            ))}
          </div>
        </>
      )}
      <p className="text-xs text-white/20 mt-1 italic">
        More detail in {chapterLabel(2, tone)}
      </p>
    </div>
  );
}
