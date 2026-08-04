"use client";

import { motion, useReducedMotion } from "framer-motion";
import { GlossaryHint, GlossaryTerm } from "@/components/ui/glossary-term";
import type { GlossaryTermId } from "@/data/glossary";

interface MbtiSlidersProps {
  scores: Record<string, number>;
  /** See charts/riasec-bars. */
  explain?: boolean;
}

export const MBTI_DICHOTOMIES = [
  { key: "EI", leftLabel: "Extraversion", rightLabel: "Introversion", leftLetter: "E", rightLetter: "I", term: "traits-ei" },
  { key: "SN", leftLabel: "Sensing", rightLabel: "Intuition", leftLetter: "S", rightLetter: "N", term: "traits-sn" },
  { key: "TF", leftLabel: "Thinking", rightLabel: "Feeling", leftLetter: "T", rightLetter: "F", term: "traits-tf" },
  { key: "JP", leftLabel: "Judging", rightLabel: "Perceiving", leftLetter: "J", rightLetter: "P", term: "traits-jp" },
] as const satisfies ReadonlyArray<{
  key: string;
  leftLabel: string;
  rightLabel: string;
  leftLetter: string;
  rightLetter: string;
  // One definition per line. See charts/values-sliders for why both ends
  // open the same one.
  term: GlossaryTermId;
}>;

const STILL_EMERGING_THRESHOLD = 35;

const HEADING = "Character Traits";

export default function MbtiSliders({
  scores,
  explain = false,
}: MbtiSlidersProps) {
  const prefersReduced = useReducedMotion();

  return (
    <div className="w-full">
      {/* See charts/riasec-bars for why the hint sits inside the heading. */}
      <h3
        className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider"
        aria-label={explain ? HEADING : undefined}
      >
        {HEADING}
        {explain && <GlossaryHint term="character-traits" className="ml-1.5" />}
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
                {explain ? (
                  <>
                    <GlossaryTerm term={d.term} className="text-xs text-white/50">
                      {d.leftLabel} ({d.leftLetter})
                    </GlossaryTerm>
                    <GlossaryTerm term={d.term} className="text-xs text-white/50">
                      {d.rightLabel} ({d.rightLetter})
                    </GlossaryTerm>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-white/50">{d.leftLabel} ({d.leftLetter})</span>
                    <span className="text-xs text-white/50">{d.rightLabel} ({d.rightLetter})</span>
                  </>
                )}
              </div>

              {/* Track */}
              <div className="relative h-8 rounded-full bg-white/10">
                {/* Center marker */}
                {/* The centre reference. At /20 it was 1.41:1 against its own
                    track and the dot's position meant nothing. */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/45" />

                {/* Dot */}
                <motion.div
                  className={`absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                    isEmerging
                      ? "bg-white/45"
                      : "bg-[var(--color-primary)] shadow-[0_0_12px_var(--color-glow)]"
                  }`}
                  // See charts/riasec-bars: the dot is at the reading, it
                  // does not travel there.
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

              {/* Tendency label */}
              <p className={`text-xs mt-1 text-center ${isEmerging ? "text-white/55 italic" : "text-white/60"}`}>
                {isEmerging ? "Still emerging..." : `${tendency} (${tendencyLetter})`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
