"use client";

import { motion } from "framer-motion";

interface MbtiSlidersProps {
  scores: Record<string, number>;
}

const MBTI_DICHOTOMIES = [
  { key: "EI", leftLabel: "Extraversion", rightLabel: "Introversion", leftLetter: "E", rightLetter: "I" },
  { key: "SN", leftLabel: "Sensing", rightLabel: "Intuition", leftLetter: "S", rightLetter: "N" },
  { key: "TF", leftLabel: "Thinking", rightLabel: "Feeling", leftLetter: "T", rightLetter: "F" },
  { key: "JP", leftLabel: "Judging", rightLabel: "Perceiving", leftLetter: "J", rightLetter: "P" },
];

const STILL_EMERGING_THRESHOLD = 35;

export default function MbtiSliders({ scores }: MbtiSlidersProps) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider">
        Character Traits
      </h3>
      <div className="flex flex-col gap-5">
        {MBTI_DICHOTOMIES.map((d, index) => {
          const score = scores[d.key] ?? 0;
          const isEmerging = Math.abs(score) < STILL_EMERGING_THRESHOLD;
          // Map -100..+100 to 0..100% position
          const position = ((score + 100) / 200) * 100;
          const tendency = score < 0 ? d.leftLabel : d.rightLabel;
          const tendencyLetter = score < 0 ? d.leftLetter : d.rightLetter;

          return (
            <div key={d.key}>
              {/* Pole labels */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/50">{d.leftLabel} ({d.leftLetter})</span>
                <span className="text-xs text-white/50">{d.rightLabel} ({d.rightLetter})</span>
              </div>

              {/* Track */}
              <div className="relative h-8 rounded-full bg-white/10">
                {/* Center marker */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />

                {/* Dot */}
                <motion.div
                  className={`absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                    isEmerging
                      ? "bg-white/30"
                      : "bg-[var(--color-primary)] shadow-[0_0_12px_var(--color-glow)]"
                  }`}
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

              {/* Tendency label */}
              <p className={`text-xs mt-1 text-center ${isEmerging ? "text-white/30 italic" : "text-white/60"}`}>
                {isEmerging ? "Still emerging..." : `${tendency} (${tendencyLetter})`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
