"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SelfMapData {
  clarity: number;
  sources: string[];
  perceived_strengths: string[];
}

interface SelfMapCaptureProps {
  onComplete: (data: SelfMapData) => void;
}

const INTEREST_SOURCES = [
  { value: "hobbies", label: "Hobbies" },
  { value: "family", label: "Family" },
  { value: "friends", label: "Friends" },
  { value: "social_media", label: "Social media" },
  { value: "school", label: "School" },
  { value: "mentor", label: "A mentor" },
  { value: "none", label: "Haven't thought about it" },
];

const STRENGTHS_GRID = [
  { value: "building", label: "Building / Fixing", emoji: "\u{1F527}" },
  { value: "puzzles", label: "Solving Puzzles", emoji: "\u{1F9E9}" },
  { value: "creating", label: "Creating / Designing", emoji: "\u{1F3A8}" },
  { value: "helping", label: "Helping / Teaching", emoji: "\u{1F91D}" },
  { value: "leading", label: "Leading / Persuading", emoji: "\u{1F4E2}" },
  { value: "organizing", label: "Organizing / Planning", emoji: "\u{1F4CB}" },
  { value: "tech", label: "Tech / Coding", emoji: "\u{1F4BB}" },
  { value: "performing", label: "Performing / Presenting", emoji: "\u{1F3AD}" },
];

export default function SelfMapCapture({ onComplete }: SelfMapCaptureProps) {
  const [step, setStep] = useState(0);
  const [clarity, setClarity] = useState(3);
  const [sources, setSources] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);

  const handleSourceToggle = (value: string) => {
    if (value === "none") {
      setSources((prev) => (prev.includes("none") ? [] : ["none"]));
      return;
    }
    setSources((prev) => {
      const filtered = prev.filter((s) => s !== "none");
      return filtered.includes(value)
        ? filtered.filter((s) => s !== value)
        : [...filtered, value];
    });
  };

  const handleStrengthToggle = (value: string) => {
    setStrengths((prev) => {
      if (prev.includes(value)) return prev.filter((s) => s !== value);
      if (prev.length >= 3) return prev;
      return [...prev, value];
    });
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      onComplete({ clarity, sources, perceived_strengths: strengths });
    }
  };

  const canProceed =
    step === 0 ? true : step === 1 ? sources.length > 0 : strengths.length > 0;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="flex w-full max-w-md flex-col items-center gap-6"
        >
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((s) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full transition-colors ${
                  s <= step ? "bg-[var(--color-primary)]" : "bg-white/10"
                }`}
              />
            ))}
          </div>

          {step === 0 && (
            <>
              <h2 className="text-lg font-semibold text-white text-center">
                Before we reveal your results...
              </h2>
              <p className="text-sm text-white/70 text-center">
                How clear were you about your career direction going in?
              </p>
              <div className="w-full flex flex-col items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={clarity}
                  onChange={(e) => setClarity(Number(e.target.value))}
                  className="w-full accent-[var(--color-primary)] h-11"
                  aria-label="Direction clarity"
                />
                <div className="flex w-full justify-between text-xs text-white/40">
                  <span>No idea</span>
                  <span>Very clear</span>
                </div>
                {/* Discrete fallback buttons */}
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      onClick={() => setClarity(v)}
                      className={`h-11 w-11 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 ${
                        clarity === v
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-white/10 text-white/50 hover:bg-white/20"
                      }`}
                      aria-label={`Clarity ${v} of 5`}
                      tabIndex={0}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold text-white text-center">
                Where have your career ideas come from so far?
              </h2>
              <div className="flex flex-wrap justify-center gap-2 w-full">
                {INTEREST_SOURCES.map((source) => {
                  const isSelected = sources.includes(source.value);
                  return (
                    <button
                      key={source.value}
                      onClick={() => handleSourceToggle(source.value)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px] ${
                        isSelected
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/15"
                      }`}
                      aria-label={source.label}
                      aria-pressed={isSelected}
                      tabIndex={0}
                    >
                      {source.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold text-white text-center">
                What do you think you&apos;re naturally good at?
              </h2>
              <p className="text-xs text-white/40">Pick up to 3</p>
              <div className="grid grid-cols-2 gap-3 w-full">
                {STRENGTHS_GRID.map((strength) => {
                  const isSelected = strengths.includes(strength.value);
                  const isDisabled =
                    !isSelected && strengths.length >= 3;
                  return (
                    <button
                      key={strength.value}
                      onClick={() => handleStrengthToggle(strength.value)}
                      disabled={isDisabled}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[88px] ${
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                          : isDisabled
                            ? "border-white/5 bg-white/3 opacity-40 cursor-not-allowed"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                      aria-label={strength.label}
                      aria-pressed={isSelected}
                      tabIndex={isDisabled ? -1 : 0}
                    >
                      <span className="text-xl">{strength.emoji}</span>
                      <span className="text-xs font-medium text-white/80">
                        {strength.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Next / Submit button */}
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`mt-4 w-full max-w-xs rounded-xl px-8 py-3 font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px] ${
              canProceed
                ? "bg-[var(--color-primary)] shadow-[0_0_20px_var(--color-glow)] hover:scale-105"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
            aria-label={step < 2 ? "Next" : "Show my results"}
            tabIndex={0}
          >
            {step < 2 ? "Next" : "Show my results!"}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
