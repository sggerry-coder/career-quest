"use client";

import { motion } from "framer-motion";
import { STRENGTHS_GRID } from "@/components/selfmap/self-map-capture";
import { chapterLabel } from "@/lib/copy/chapter";
import { GlossaryTerm } from "@/components/ui/glossary-term";
import { strengthTermId } from "@/data/glossary";

/**
 * Dashboard card comparing how the student saw themselves (self-map
 * perceived strengths) with what the quest detected (P2.1). Pure
 * client-side rendering of already-persisted data -- zero API cost.
 */

interface SelfVsMeasuredProps {
  selfMap: {
    clarity?: number;
    perceived_strengths?: string[];
  } | null;
  detectedStrengths: string[];
  tone: "quest" | "explorer";
}

/**
 * Map each self-map strength value to the detected strength categories it
 * plausibly corresponds to (see data/strength-categories.ts).
 */
const PERCEIVED_TO_DETECTED: Record<string, string[]> = {
  building: ["Achiever"],
  puzzles: ["Analytical", "Ideation"],
  creating: ["Creativity", "Ideation"],
  helping: ["Empathy", "Communication"],
  leading: ["Command", "Communication"],
  organizing: ["Achiever", "Analytical"],
  tech: ["Analytical", "Achiever"],
  performing: ["Communication", "Creativity", "Adaptability"],
};

/** Whether a perceived strength matches any detected strength category. */
export function perceivedMatchesDetected(
  perceived: string,
  detected: string[]
): boolean {
  const related = PERCEIVED_TO_DETECTED[perceived] ?? [];
  const detectedLower = detected.map((d) => d.toLowerCase());
  return related.some((r) => detectedLower.includes(r.toLowerCase()));
}

/** Encouraging line reflecting the student's starting clarity rating. */
export function clarityLine(clarity: number | undefined): string | null {
  if (typeof clarity !== "number" || clarity < 1 || clarity > 5) return null;
  if (clarity <= 2) {
    return `You started at ${clarity}/5 clarity about your direction — look how much is mapped now.`;
  }
  if (clarity === 3) {
    return "You started at 3/5 clarity — now there's a real map to build on.";
  }
  return `You came in at ${clarity}/5 clarity — and now you have the evidence to back it up.`;
}

export default function SelfVsMeasured({
  selfMap,
  detectedStrengths,
  tone,
}: SelfVsMeasuredProps): React.JSX.Element | null {
  const perceived = selfMap?.perceived_strengths ?? [];
  if (perceived.length === 0 && detectedStrengths.length === 0) return null;

  const line = clarityLine(selfMap?.clarity);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider">
        How you see yourself vs. what we found
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Perceived strengths */}
        <div>
          <p className="text-xs text-white/65 mb-2">You said you&apos;re good at</p>
          <div className="flex flex-wrap gap-2">
            {perceived.length > 0 ? (
              perceived.map((value) => {
                const def = STRENGTHS_GRID.find((s) => s.value === value);
                const matched = perceivedMatchesDetected(value, detectedStrengths);
                return (
                  <motion.span
                    key={value}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                      matched
                        ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/40"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {def?.emoji && <span aria-hidden="true">{def.emoji}</span>}
                    {def?.label ?? value}
                    {matched && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide">
                        You called it!
                      </span>
                    )}
                  </motion.span>
                );
              })
            ) : (
              <p className="text-xs text-white/55">No self-picks recorded</p>
            )}
          </div>
        </div>

        {/* Detected strengths */}
        <div>
          <p className="text-xs text-white/65 mb-2">Your quest revealed</p>
          <div className="flex flex-wrap gap-2">
            {detectedStrengths.length > 0 ? (
              detectedStrengths.map((s) => {
                // Accent on the primary tint -- see charts/class-label.
                const chip =
                  "rounded-full bg-[var(--color-primary)]/15 px-3 py-1 text-xs font-medium text-[var(--color-accent)]";
                // "Ideation" is not a word a fifteen-year-old has met. A name
                // with no definition behind it stays a plain chip rather than
                // a button that opens nothing -- see strengthTermId.
                const term = strengthTermId(s);
                return term ? (
                  <GlossaryTerm key={s} term={term} hitArea={false} className={chip}>
                    {s}
                  </GlossaryTerm>
                ) : (
                  <span key={s} className={chip}>
                    {s}
                  </span>
                );
              })
            ) : (
              <p className="text-xs text-white/55">Complete {chapterLabel(1, tone)} to find out</p>
            )}
          </div>
        </div>
      </div>

      {/* Clarity reflection */}
      {line && <p className="text-xs text-white/50 mt-4 italic">{line}</p>}
    </div>
  );
}
