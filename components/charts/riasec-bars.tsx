"use client";

import { motion, useReducedMotion } from "framer-motion";
import { hasRiasecReading } from "@/lib/scoring/riasec";
import { GlossaryHint, GlossaryTerm } from "@/components/ui/glossary-term";
import type { GlossaryTermId } from "@/data/glossary";

interface RiasecBarsProps {
  scores: Record<string, number>;
  /**
   * Class badge to show under the bars. Omit it where the surrounding screen
   * already presents the class itself — the reveal sequence animates its own
   * ClassLabel in as a separate beat, and rendering both printed
   * "CLASS: EXPLORER" twice, one directly above the other.
   */
  classLabel?: string;
  /**
   * How many interest answers stand behind each type, from
   * buildRiasecEvidence.
   *
   * Needed because a type nobody was asked about scores 0, exactly like a type
   * rated at the bottom of the scale — so this chart drew both as a labelled
   * row with an empty bar and a hard 0. Absence rendered as a result, and the
   * one result a student is most likely to take personally.
   *
   * Optional, and omitting it means "assume answered", which is what a caller
   * that cannot tell must do. The dashboard passes the counts persisted
   * alongside the scores (migration 00006), and passes nothing for a legacy
   * row written before that column existed. See hasRiasecReading.
   */
  evidence?: Record<string, number>;
  /**
   * Offer a definition for every word on this chart.
   *
   * Off by default because this chart is also the reveal's first beat, and the
   * reveal is a timed sequence the student is being walked through — a popup
   * there would interrupt an animation that is still running. The dashboard is
   * where a student sits and reads, so the dashboard opts in.
   */
  explain?: boolean;
}

export const RIASEC_TYPES = [
  { key: "R", label: "Maker", emoji: "\u{1F527}", term: "interest-maker" },
  { key: "I", label: "Investigator", emoji: "\u{1F52C}", term: "interest-investigator" },
  { key: "A", label: "Creator", emoji: "\u{1F3A8}", term: "interest-creator" },
  { key: "S", label: "Helper", emoji: "\u{1F91D}", term: "interest-helper" },
  { key: "E", label: "Leader", emoji: "\u{1F4E2}", term: "interest-leader" },
  { key: "C", label: "Organizer", emoji: "\u{1F4CB}", term: "interest-organizer" },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  emoji: string;
  term: GlossaryTermId;
}>;

/** What a row says where the student was never asked. */
const NOT_ASKED = "Not asked";

const HEADING = "Ability Scores";

export default function RiasecBars({
  scores,
  classLabel,
  evidence,
  explain = false,
}: RiasecBarsProps) {
  const prefersReduced = useReducedMotion();

  return (
    <div className="w-full">
      {/*
        The hint sits inside the heading rather than beside it: a wrapper
        around the two would change what this heading's parent element is,
        and that parent is how the dashboard and reveal tests scope
        themselves to this card. A button's label folds into the accessible
        name of the heading containing it, so the name is restated here --
        otherwise this announces as "Ability Scores What Ability Scores
        means, heading level 3".
      */}
      <h3
        className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider"
        aria-label={explain ? HEADING : undefined}
      >
        {HEADING}
        {explain && (
          <GlossaryHint term="ability-scores" className="ml-1.5" />
        )}
      </h3>
      <div className="flex flex-col gap-3">
        {RIASEC_TYPES.map((type, index) => {
          const asked = hasRiasecReading(type.key, evidence);
          const score = Math.round(scores[type.key] ?? 0);
          const isHighlighted = asked && score > 50;

          // Never asked: the row stays, the number goes.
          //
          // Dropping the row outright was the other option and it is worse
          // here than it was for the learning styles, where the card ranks a
          // top three and the count of rows is itself the reading. These six
          // are a fixed roster the student is shown every time, and the class
          // badge is derived from exactly these rows — so a chart that
          // quietly renders three of them gives a student no way to tell
          // "there is no Organizer" from "nobody asked you about Organizer",
          // and no way to see that the name under the chart was read off half
          // the instrument. The row is honest information; the digit is the
          // claim. Keep the first, drop the second, and say which it is in
          // the space the bar would have filled -- the same empty low-contrast
          // track that already means "no reading yet" on the values compass
          // and the learning styles.
          if (!asked) {
            return (
              <div key={type.key} className="flex items-center gap-3">
                <span
                  className="text-lg w-7 text-center flex-shrink-0 opacity-60"
                  aria-hidden="true"
                >
                  {type.emoji}
                </span>
                {/* A row with no reading is the row a student is most likely
                    to want explained -- "Not asked" tells them nothing about
                    what Organizer even was. The definition is of the type,
                    not of their score, so it is the same either way. */}
                {explain ? (
                  <GlossaryTerm
                    term={type.term}
                    className="text-xs text-white/55 w-20 flex-shrink-0 text-left"
                  >
                    {type.label}
                  </GlossaryTerm>
                ) : (
                  <span className="text-xs text-white/55 w-20 flex-shrink-0">
                    {type.label}
                  </span>
                )}
                <div className="flex-1 h-6 rounded-full bg-white/5 flex items-center px-3">
                  <span className="text-xs text-white/55 italic">
                    {NOT_ASKED}
                  </span>
                </div>
                {/* Holds the numeral column open so the tracks above and
                    below still line up. Empty on purpose: any glyph here
                    reads as a score. */}
                <span className="w-8 flex-shrink-0" aria-hidden="true" />
              </div>
            );
          }

          return (
            <div key={type.key} className="flex items-center gap-3">
              <span
                className="text-lg w-7 text-center flex-shrink-0"
                aria-hidden="true"
              >
                {type.emoji}
              </span>
              {explain ? (
                <GlossaryTerm
                  term={type.term}
                  className="text-xs text-white/50 w-20 flex-shrink-0 text-left"
                >
                  {type.label}
                </GlossaryTerm>
              ) : (
                <span className="text-xs text-white/50 w-20 flex-shrink-0">
                  {type.label}
                </span>
              )}
              <div className="flex-1 h-6 rounded-full bg-white/10 overflow-hidden relative">
                <motion.div
                  // The bar *is* the score. A 20% white fill measured 1.41:1
                  // against its own bg-white/10 track, so a below-50 interest
                  // was a number with no visible bar beside it. /45 clears the
                  // 3:1 floor for meaningful non-text at 3.19:1 and still
                  // reads as the quieter of the two states.
                  className={`h-full rounded-full ${
                    isHighlighted
                      ? "bg-[var(--color-accent)]"
                      : "bg-white/45"
                  }`}
                  /* Reduced motion: the bar is its value, it does not grow
                     into it. initial={false} is Framer's "render the target
                     state" -- the score is still shown, nothing moves. */
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
              <span
                className={`text-sm font-mono w-8 text-right flex-shrink-0 ${
                  isHighlighted ? "text-white" : "text-white/65"
                }`}
              >
                {score}
              </span>
            </div>
          );
        })}
      </div>
      {/* CLASS label badge — only where the screen doesn't show it already */}
      {classLabel && (
        <div className="mt-4 flex justify-center">
          {/* Accent, not primary: the primary is picked to carry white label
              text, so as text on its own 20% tint it measured 1.85-2.90:1
              across the palettes. The accent is the same class's other
              colour, 5.48-9.16:1 there. */}
          {explain ? (
            <GlossaryTerm
              term="class"
              hitArea={false}
              className="rounded-full bg-[var(--color-primary)]/20 px-4 py-1.5 text-sm font-bold text-[var(--color-accent)] uppercase tracking-wider"
            >
              CLASS: {classLabel}
            </GlossaryTerm>
          ) : (
            <span className="rounded-full bg-[var(--color-primary)]/20 px-4 py-1.5 text-sm font-bold text-[var(--color-accent)] uppercase tracking-wider">
              CLASS: {classLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
