"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RiasecBars from "@/components/charts/riasec-bars";
import MiPreviewBars from "@/components/charts/mi-preview-bars";
import MbtiSliders from "@/components/charts/mbti-sliders";
import ValuesSliders from "@/components/charts/values-sliders";
import ClassLabel from "@/components/charts/class-label";
import { characterClassDisplayName, type DerivedClass } from "@/lib/character/classes";
import { describeCharacter } from "@/lib/character/description";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";

interface ScoreState {
  riasec: Record<string, number>;
  mi: Record<string, number>;
  mbti: Record<string, number>;
  mbti_raw?: Record<string, number[]>;
  values: Record<string, number>;
  strengths: string[];
  class_label: string;
  /**
   * Set when the answers behind these scores cannot tell one interest from
   * another -- the same tap over and over, or every type at once. Computed
   * and persisted for a long time without a single screen reading it, which
   * made it a check the app performed on itself rather than a thing the
   * student was ever told.
   */
  acquiescence_flag?: boolean;
}

interface RevealSequenceProps {
  scoreState: ScoreState;
  /**
   * The class already locked in by useEmergentClass, passed down rather than
   * re-derived here. A fresh deriveCharacterClass(scoreState.riasec) call
   * would ignore the "may deepen, must never flip" lock, so a student whose
   * lead shifted after naming could see one class in the reveal and a
   * different one on the dashboard once persisted. This component must stay
   * presentational: display what was resolved, don't resolve it again.
   */
  resolvedClass: DerivedClass;
  tone: "quest" | "explorer";
  onRevealComplete: () => void;
}

type RevealPhase =
  | "transition"
  | "riasec"
  | "class_label"
  | "mi_preview"
  | "mbti"
  | "emerging_type"
  | "values"
  | "explanation"
  | "confirmatory_intro";

export default function RevealSequence({
  scoreState,
  resolvedClass,
  tone,
  onRevealComplete,
}: RevealSequenceProps) {
  const [phase, setPhase] = useState<RevealPhase>("transition");

  const emergentClassName = characterClassDisplayName(resolvedClass, tone);
  const emergentDescription = describeCharacter({
    derived: resolvedClass,
    tone,
    mbti: scoreState.mbti,
    values: scoreState.values,
  });

  // Auto-advance from transition
  useEffect(() => {
    if (phase === "transition") {
      const timer = setTimeout(() => setPhase("riasec"), 2000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleNext = useCallback(() => {
    const sequence: RevealPhase[] = [
      "transition",
      "riasec",
      "class_label",
      "mi_preview",
      "mbti",
      "emerging_type",
      "values",
      "explanation",
      "confirmatory_intro",
    ];
    const currentIdx = sequence.indexOf(phase);
    if (currentIdx >= 0 && currentIdx < sequence.length - 1) {
      setPhase(sequence[currentIdx + 1]);
    } else if (phase === "confirmatory_intro") {
      onRevealComplete();
    }
  }, [phase, onRevealComplete]);

  // Transition card
  if (phase === "transition") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-dvh flex-col items-center justify-center px-8 text-center"
      >
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-medium text-white/90 italic"
        >
          {/* Greeting built from the resolved class, guarded on isNamed --
              the same rule EngagementCheckpoint follows. It used to take a
              separate `className` prop derived from questState.avatarClass,
              which holds the primary only and defaults to "wanderer". A
              student who never earned a class was greeted "Here are your
              results, Still forming."; every dual-class student was greeted
              by half their name and shown the other half two beats later. */}
          {resolvedClass.isNamed
            ? tone === "quest"
              ? `Let's see what we've discovered, ${emergentClassName}!`
              : `Here are your results, ${emergentClassName}.`
            : tone === "quest"
              ? "Let's see what we've discovered!"
              : "Here are your results."}
        </motion.p>
      </motion.div>
    );
  }

  // Confirmatory intro
  if (phase === "confirmatory_intro") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm flex flex-col items-center gap-6"
        >
          <span className="text-5xl">{"\u{1F3AF}"}</span>
          <h2 className="text-xl font-semibold text-white">
            Want to sharpen your results?
          </h2>
          <p className="text-sm text-white/60">
            5 quick questions based on what we&apos;ve seen so far. At the
            finish you&apos;ll see exactly how they sharpened your profile.
          </p>
          <button
            onClick={handleNext}
            className="rounded-xl bg-[var(--color-primary)] px-8 py-3 font-medium text-white shadow-[0_0_20px_var(--color-glow)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
            aria-label="Start confirmatory questions"
            tabIndex={0}
          >
            Let&apos;s go!
          </button>
        </motion.div>
      </div>
    );
  }

  // Scrollable reveal cards
  return (
    <div className="min-h-dvh px-4 py-8">
      <div className="mx-auto max-w-lg flex flex-col items-center gap-8">
        <SectionErrorBoundary name="Score Cards">
        <AnimatePresence mode="wait">
          {/* RIASEC */}
          {(phase === "riasec" ||
            phase === "class_label" ||
            phase === "mi_preview" ||
            phase === "mbti" ||
            phase === "emerging_type" ||
            phase === "values" ||
            phase === "explanation") && (
            <motion.div
              key="riasec"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-2xl bg-white/5 border border-white/10 p-5"
            >
              {/* classLabel omitted: the animated ClassLabel below is the
                  reveal beat for it, and passing it here printed it twice. */}
              <RiasecBars scores={scoreState.riasec} />
              {scoreState.acquiescence_flag ? (
                <p className="text-xs text-white/60 text-center mt-2">
                  {tone === "quest"
                    ? "You picked the same answer nearly every time, so these bars can't tell your interests apart yet — worth another run when you've got more time."
                    : "You chose the same answer nearly every time, so these scores can't separate your interests yet — worth answering again when you have more time."}
                </p>
              ) : Object.values(scoreState.riasec).every(v => v === 0) ? (
                <p className="text-xs text-white/30 text-center mt-1">Answer more questions to refine</p>
              ) : null}
            </motion.div>
          )}

          {/* CLASS label */}
          {(phase === "class_label" ||
            phase === "mi_preview" ||
            phase === "mbti" ||
            phase === "emerging_type" ||
            phase === "values" ||
            phase === "explanation") && (
            <motion.div
              key="class"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <ClassLabel label={emergentClassName} />
              <p className="text-sm text-white/60 text-center max-w-xs">{emergentDescription}</p>
            </motion.div>
          )}

          {/* MI preview */}
          {(phase === "mi_preview" ||
            phase === "mbti" ||
            phase === "emerging_type" ||
            phase === "values" ||
            phase === "explanation") && (
            <motion.div
              key="mi"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-2xl bg-white/5 border border-white/10 p-5"
            >
              <MiPreviewBars scores={scoreState.mi} />
            </motion.div>
          )}

          {/* MBTI sliders */}
          {(phase === "mbti" ||
            phase === "emerging_type" ||
            phase === "values" ||
            phase === "explanation") && (
            <motion.div
              key="mbti"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-2xl bg-white/5 border border-white/10 p-5"
            >
              <MbtiSliders scores={scoreState.mbti} />
              {Object.values(scoreState.mbti).every(v => v === 0) && (
                <p className="text-xs text-white/30 text-center mt-1">Answer more questions to refine</p>
              )}
            </motion.div>
          )}

          {/* Personality note: no four-letter type card here. Session 1 gives
              2 answers per dichotomy; deriveEmergingType needs 3, so this
              card could only ever render underscores and "Still Emerging"
              as a false climax. The personality reading itself already
              lives in the class card above (describeCharacter degrades
              honestly per-clause), so this beat just names the limit. */}
          {(phase === "emerging_type" ||
            phase === "values" ||
            phase === "explanation") && (
            <motion.div
              key="emerging"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center text-center"
            >
              <p className="text-xs text-white/30 max-w-xs">
                {tone === "quest"
                  ? "A full four-letter type needs more questions than this chapter asks — more chapters are planned to go deeper."
                  : "A full personality type needs more questions than this part asks."}
              </p>
            </motion.div>
          )}

          {/* Values */}
          {(phase === "values" || phase === "explanation") && (
            <motion.div
              key="values"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-2xl bg-white/5 border border-white/10 p-5"
            >
              <ValuesSliders scores={scoreState.values} />
              {Object.values(scoreState.values).every(v => v === 0) && (
                <p className="text-xs text-white/30 text-center mt-1">Answer more questions to refine</p>
              )}
            </motion.div>
          )}

          {/* Explanation */}
          {phase === "explanation" && (
            <motion.div
              key="explanation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-2xl bg-white/5 border border-white/10 p-5 text-center"
            >
              <p className="text-sm text-white/60 leading-relaxed">
                These charts show your initial profile. The Ability Scores
                reveal your interests, Character Traits show your personality
                tendencies, and Learning Styles highlight how you learn best.
                More chapters are planned — they&apos;ll build on this.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        </SectionErrorBoundary>

        {/* Next button */}
        <button
          onClick={handleNext}
          className="rounded-xl bg-[var(--color-primary)] px-8 py-3 font-medium text-white shadow-[0_0_20px_var(--color-glow)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
          aria-label="Continue"
          tabIndex={0}
        >
          {phase === "explanation" ? "Sharpen results" : "Continue"}
        </button>
      </div>
    </div>
  );
}
