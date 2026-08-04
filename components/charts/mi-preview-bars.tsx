"use client";

import { motion, useReducedMotion } from "framer-motion";

interface MiPreviewBarsProps {
  scores: Record<string, number>;
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

export default function MiPreviewBars({ scores }: MiPreviewBarsProps) {
  const prefersReduced = useReducedMotion();
  // A dimension reads 0 until it has enough signals to earn a score (see
  // MIN_MI_SIGNALS in lib/scoring/mi.ts), and Session 1's ~10 MI picks are
  // spread over 8 dimensions -- two of which (musical, naturalistic) appear
  // in only two options in the whole session. So it is routine for one or
  // two dimensions to clear the threshold and the rest to sit at 0.
  //
  // Taking the top three unconditionally then listed a 0 under the heading
  // "Your strongest learning styles": a labelled row with an empty bar and
  // the number 0 beside it. Rank only what has a reading; how many rows
  // appear is how many the student earned.
  const sorted = [...MI_DIMENSIONS].sort(
    (a, b) => (scores[b.key] ?? 0) - (scores[a.key] ?? 0)
  );
  const scored = sorted.filter((dim) => (scores[dim.key] ?? 0) > 0);
  const top3 = scored.slice(0, 3);
  const remaining = sorted.filter((dim) => !top3.includes(dim));

  // Nothing has a reading yet -- an empty top-three would dress up "no data
  // yet" as a result.
  const allZero = scored.length === 0;

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-white/70 mb-1 uppercase tracking-wider">
        Learning Styles
      </h3>
      <p className="text-xs text-white/55 mb-4">
        {/* Singular when only one dimension has a reading -- which is a
            routine outcome now that unscored ones are no longer padded into
            the list, and "styles" above a single row is a small lie about
            how much was measured. */}
        {top3.length === 1
          ? "Your strongest learning style (preliminary)"
          : "Your strongest learning styles (preliminary)"}
      </p>

      {allZero ? (
        <p className="text-xs text-white/55 text-center py-2">
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
                      // See charts/riasec-bars for why initial is false here.
                      initial={prefersReduced ? false : { width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{
                        type: "spring",
                        stiffness: 100,
                        damping: 20,
                        delay: prefersReduced ? 0 : index * 0.1,
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

          {/* Not yet measured -- see charts/values-sliders for why this block
              is no longer dimmed as a whole. */}
          <div className="flex flex-col gap-2">
            {remaining.map((dim) => (
              <div key={dim.key} className="flex items-center gap-3">
                <span className="text-xs text-white/55 w-28 flex-shrink-0 truncate">
                  {dim.label}
                </span>
                <div className="flex-1 h-3 rounded-full bg-white/5" />
              </div>
            ))}
          </div>
        </>
      )}
      <p className="text-xs text-white/55 mt-1 italic">
        More detail to come
      </p>
    </div>
  );
}
