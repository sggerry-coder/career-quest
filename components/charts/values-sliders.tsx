"use client";

import { motion, useReducedMotion } from "framer-motion";

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

/** Below this, the answer is too close to centre to call a side. */
const BALANCED_THRESHOLD = 20;

/**
 * Put the reading into words. The dot alone left students unable to say which
 * side they landed on — the Character Traits card prints its tendency
 * underneath and this card did not, so it read as though nothing was measured.
 */
export function describeLean(
  score: number,
  leftLabel: string,
  rightLabel: string
): string {
  if (Math.abs(score) < BALANCED_THRESHOLD) return "Balanced for now";
  return `Leans ${score < 0 ? leftLabel : rightLabel}`;
}

export default function ValuesSliders({ scores }: ValuesSlidersProps) {
  const prefersReduced = useReducedMotion();

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-white/70 mb-1 uppercase tracking-wider">
        Values Compass
      </h3>
      <p className="text-xs text-white/55 mb-4">Initial value readings</p>

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
                {/* Centre reference -- see charts/mbti-sliders. */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/45" />
                <motion.div
                  className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)] shadow-[0_0_10px_var(--color-glow)]"
                  // See charts/riasec-bars.
                  initial={prefersReduced ? false : { left: "50%" }}
                  animate={{ left: `${position}%` }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 20,
                    delay: prefersReduced ? 0 : index * 0.15,
                  }}
                />
              </div>

              {/* Which side you landed on, in words */}
              <p
                className={`text-xs mt-1 text-center ${
                  Math.abs(score) < BALANCED_THRESHOLD
                    ? "text-white/55 italic"
                    : "text-white/60"
                }`}
              >
                {describeLean(score, dim.leftLabel, dim.rightLabel)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Not yet measured. The wrapper used to dim this whole block to 40%, which multiplies
          into the text alpha -- the dimension names came out at 1.44:1 and a
          student could not read what was still to come. The empty track says
          "no reading yet" on its own. */}
      <div className="flex flex-col gap-3">
        {REMAINING_DIMENSIONS.map((dim) => (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/55">{dim.leftLabel}</span>
              <span className="text-xs text-white/55">{dim.rightLabel}</span>
            </div>
            <div className="h-4 rounded-full bg-white/5" />
          </div>
        ))}
        <p className="text-xs text-white/55 italic">
          More dimensions to come
        </p>
      </div>
    </div>
  );
}
