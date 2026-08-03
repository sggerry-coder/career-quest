"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RiasecBars from "@/components/charts/riasec-bars";
import MiPreviewBars from "@/components/charts/mi-preview-bars";
import MbtiSliders from "@/components/charts/mbti-sliders";
import ValuesSliders from "@/components/charts/values-sliders";
import ClassLabel from "@/components/charts/class-label";
import EmergingType from "@/components/charts/emerging-type";
import { deriveEmergingType } from "@/lib/scoring/mbti";
import { deriveClassLabel } from "@/lib/scoring/riasec";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";

interface ScoreState {
  riasec: Record<string, number>;
  mi: Record<string, number>;
  mbti: Record<string, number>;
  mbti_raw?: Record<string, number[]>;
  values: Record<string, number>;
  strengths: string[];
  class_label: string;
}

interface RevealSequenceProps {
  scoreState: ScoreState;
  className: string;
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
  className,
  tone,
  onRevealComplete,
}: RevealSequenceProps) {
  const [phase, setPhase] = useState<RevealPhase>("transition");

  const classLabel = deriveClassLabel(scoreState.riasec);
  const mbtiRawCounts: Record<string, number> = {};
  for (const key of ["EI", "SN", "TF", "JP"]) {
    mbtiRawCounts[key] = scoreState.mbti_raw?.[key]?.length ?? 0;
  }
  const { display: emergingType, hasEmerging } = deriveEmergingType(scoreState.mbti, mbtiRawCounts);

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
          {tone === "quest"
            ? `Let's see what we've discovered, ${className}!`
            : `Here are your results, ${className}.`}
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
              {Object.values(scoreState.riasec).every(v => v === 0) && (
                <p className="text-xs text-white/30 text-center mt-1">Answer more questions to refine</p>
              )}
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
              className="flex justify-center"
            >
              <ClassLabel label={classLabel} />
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
              {Object.values(scoreState.mi).every(v => v === 0) && (
                <p className="text-xs text-white/30 text-center mt-1">Answer more questions to refine</p>
              )}
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

          {/* Emerging type */}
          {(phase === "emerging_type" ||
            phase === "values" ||
            phase === "explanation") && (
            <motion.div
              key="emerging"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center"
            >
              <EmergingType typeCode={emergingType} descriptor="" hasEmerging={hasEmerging} />
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
                Session 2 will deepen these results.
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
