# Phase 1 Plan C: Session 1 Flow + Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Session 1 question flow engine (all card/input types, block transitions, discovery mode, self-map capture, reveal sequence) and the RPG stats dashboard with animated charts, badges, and XP bar.
**Architecture:** The session page is a client-side state machine that progresses through blocks (warmup, riasec+mi, mbti+values, selfmap, reveal, confirmatory, complete), rendering the correct input component per question type. The dashboard reads persisted scores from Supabase and renders them as animated chart components. Both pages consume theme context (Plan B) and scoring functions (Plan A).
**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Framer Motion, Tailwind CSS v4, Supabase (persistence checkpoints), CSS custom properties (theme system from Plan B)

---

## Dependencies

This plan assumes **Plan A** (scoring engine, state management, question data) and **Plan B** (character creation, theme system, providers) are complete. Specifically:

- `lib/scoring/riasec.ts`, `mi.ts`, `mbti.ts`, `values.ts`, `strengths.ts`, `adaptive.ts` exist (Plan A)
- `hooks/use-quest-state.ts`, `hooks/use-scores.ts` exist (Plan A)
- `providers/quest-provider.tsx` exists with `QuestState` and `ScoreState` context (Plan A)
- `lib/theme.ts` and `components/ui/theme-provider.tsx` exist (Plan B)
- `data/classes.ts` exists with `ClassDefinition` objects and narration text (Plan B)
- `data/questions/session-1-core.ts` and `session-1-adaptive.ts` exist with question objects (Plan A)
- `data/mbti-descriptors.ts` exists (Plan A)

---

## Task 1: Question Card Shell

### Step 1.1 — Create `components/quest/question-card.tsx`

- [ ] Create the file `components/quest/question-card.tsx` with the following content:

```tsx
"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface QuestionCardProps {
  questionText: string;
  questionIndex: number;
  totalQuestions: number;
  blockName: string;
  timeEstimate: string;
  direction: "left" | "right";
  canUndo: boolean;
  onUndo: () => void;
  canSkip: boolean;
  onSkip: () => void;
  children: ReactNode;
}

const variants = {
  enter: (direction: "left" | "right") => ({
    x: direction === "left" ? -300 : 300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: "left" | "right") => ({
    x: direction === "left" ? 300 : -300,
    opacity: 0,
  }),
};

export default function QuestionCard({
  questionText,
  questionIndex,
  totalQuestions,
  blockName,
  timeEstimate,
  direction,
  canUndo,
  onUndo,
  canSkip,
  onSkip,
  children,
}: QuestionCardProps) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      {/* Top bar: undo + block info + time */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {canUndo && (
            <button
              onClick={onUndo}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Go back to previous question"
              tabIndex={0}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.5 15L7.5 10L12.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
            {blockName}
          </span>
        </div>
        <span className="text-xs text-white/50">{timeEstimate}</span>
      </div>

      {/* Question content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={questionIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex w-full max-w-lg flex-col items-center gap-8"
        >
          <div className="text-center">
            <p className="text-sm text-white/50 mb-2">
              {questionIndex + 1} of {totalQuestions}
            </p>
            <h2 className="text-xl font-semibold leading-relaxed text-white md:text-2xl">
              {questionText}
            </h2>
          </div>

          {/* Input component slot */}
          <div className="w-full">{children}</div>

          {/* Skip button */}
          {canSkip && (
            <button
              onClick={onSkip}
              className="mt-2 text-sm text-white/40 underline decoration-white/20 transition-colors hover:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-2 py-1"
              aria-label="Skip this question"
              tabIndex={0}
            >
              Skip this question
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

### Step 1.2 — Commit Task 1

- [ ] Stage and commit:
```bash
git add components/quest/question-card.tsx
git commit -m "feat: add question card shell with animations and undo support"
```

---

## Task 2: Likert Slider Component

### Step 2.1 — Create `components/quest/likert-slider.tsx`

- [ ] Create the file `components/quest/likert-slider.tsx` with the following content:

```tsx
"use client";

import { motion } from "framer-motion";

interface LikertSliderProps {
  value: number | null;
  onChange: (value: number) => void;
}

const POINTS = [
  { value: 1, emoji: "\u{1F612}", label: "Strongly Dislike" },
  { value: 2, emoji: "\u{1F615}", label: "Dislike" },
  { value: 3, emoji: "\u{1F610}", label: "Neutral" },
  { value: 4, emoji: "\u{1F642}", label: "Like" },
  { value: 5, emoji: "\u{1F929}", label: "Strongly Like" },
];

export default function LikertSlider({ value, onChange }: LikertSliderProps) {
  return (
    <div className="w-full" role="radiogroup" aria-label="Rate on a scale of 1 to 5">
      {/* Emoji labels row */}
      <div className="flex items-center justify-between mb-3 px-1">
        {POINTS.map((point) => (
          <span
            key={point.value}
            className={`text-2xl transition-transform ${
              value === point.value ? "scale-125" : "opacity-60"
            }`}
          >
            {point.emoji}
          </span>
        ))}
      </div>

      {/* Track */}
      <div className="relative flex items-center justify-between rounded-full bg-white/10 p-1 h-14">
        {POINTS.map((point) => {
          const isSelected = value === point.value;
          return (
            <button
              key={point.value}
              onClick={() => onChange(point.value)}
              role="radio"
              aria-checked={isSelected}
              aria-label={point.label}
              tabIndex={0}
              className={`relative z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 ${
                isSelected
                  ? "bg-[var(--color-primary)] text-white shadow-[0_0_16px_var(--color-glow)]"
                  : "text-white/60 hover:bg-white/10"
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="likert-indicator"
                  className="absolute inset-0 rounded-full bg-[var(--color-primary)] shadow-[0_0_16px_var(--color-glow)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{point.value}</span>
            </button>
          );
        })}
      </div>

      {/* Label text */}
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-xs text-white/40">Strongly Dislike</span>
        <span className="text-xs text-white/40">Strongly Like</span>
      </div>
    </div>
  );
}
```

### Step 2.2 — Commit Task 2

- [ ] Stage and commit:
```bash
git add components/quest/likert-slider.tsx
git commit -m "feat: add Likert slider with emoji labels and accessible tap targets"
```

---

## Task 3: Spectrum Slider Component

### Step 3.1 — Create `components/quest/spectrum-slider.tsx`

- [ ] Create the file `components/quest/spectrum-slider.tsx` with the following content:

```tsx
"use client";

import { useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface SpectrumSliderProps {
  value: number | null;
  onChange: (value: number) => void;
  leftLabel: string;
  rightLabel: string;
}

const POSITIONS = [-3, -2, -1, 0, 1, 2, 3];

export default function SpectrumSlider({
  value,
  onChange,
  leftLabel,
  rightLabel,
}: SpectrumSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const raw = pct * 6 - 3;
      const snapped = Math.round(Math.max(-3, Math.min(3, raw)));
      onChange(snapped);
    },
    [onChange]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!trackRef.current) return;
      const touch = e.touches[0];
      const rect = trackRef.current.getBoundingClientRect();
      const pct = (touch.clientX - rect.left) / rect.width;
      const raw = pct * 6 - 3;
      const snapped = Math.round(Math.max(-3, Math.min(3, raw)));
      onChange(snapped);
    },
    [onChange]
  );

  const thumbPct = value !== null ? ((value + 3) / 6) * 100 : 50;

  return (
    <div className="w-full" role="group" aria-label={`${leftLabel} to ${rightLabel}`}>
      {/* Pole labels */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <p className="text-sm text-white/70 text-left max-w-[40%]">{leftLabel}</p>
        <p className="text-sm text-white/70 text-right max-w-[40%]">{rightLabel}</p>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-14 rounded-full bg-white/10 cursor-pointer touch-none"
        onClick={handleTrackClick}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchMove}
      >
        {/* Discrete tap points */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={(e) => {
                e.stopPropagation();
                onChange(pos);
              }}
              aria-label={`${pos < 0 ? leftLabel : pos > 0 ? rightLabel : "Neutral"} (${Math.abs(pos)} of 3)`}
              tabIndex={0}
              className={`h-11 w-11 flex items-center justify-center rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 ${
                value === pos
                  ? "text-white"
                  : pos === 0
                    ? "text-white/40"
                    : "text-white/20 hover:text-white/40"
              }`}
            >
              {pos === 0 ? "\u2022" : ""}
            </button>
          ))}
        </div>

        {/* Thumb */}
        {value !== null && (
          <motion.div
            className="absolute top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-primary)] shadow-[0_0_20px_var(--color-glow)]"
            animate={{ left: `${thumbPct}%` }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </div>

      {/* Discrete point fallback for accessibility */}
      <div className="flex items-center justify-between mt-2 px-2">
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => onChange(pos)}
            className={`h-8 w-8 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 ${
              value === pos
                ? "bg-[var(--color-primary)] text-white"
                : "bg-white/5 text-white/30 hover:bg-white/10"
            }`}
            aria-label={`Select ${pos}`}
            tabIndex={0}
          >
            {pos}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Step 3.2 — Commit Task 3

- [ ] Stage and commit:
```bash
git add components/quest/spectrum-slider.tsx
git commit -m "feat: add spectrum slider for MBTI and Values questions"
```

---

## Task 4: Ipsative Picker Component

### Step 4.1 — Create `components/quest/ipsative-picker.tsx`

- [ ] Create the file `components/quest/ipsative-picker.tsx` with the following content:

```tsx
"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";

interface IpsativeOption {
  label: string;
  value: string;
  emoji?: string;
  framework_signals?: Record<string, number>;
}

interface IpsativePickerProps {
  options: IpsativeOption[];
  onComplete: (ranked: { value: string; rank: number }[]) => void;
}

const RANK_STYLES = [
  {
    rank: 1,
    label: "1st",
    bg: "bg-amber-500/20",
    border: "border-amber-400",
    text: "text-amber-300",
    badge: "bg-amber-500 text-white",
  },
  {
    rank: 2,
    label: "2nd",
    bg: "bg-gray-400/10",
    border: "border-gray-400",
    text: "text-gray-300",
    badge: "bg-gray-400 text-white",
  },
  {
    rank: 3,
    label: "3rd",
    bg: "bg-amber-800/10",
    border: "border-amber-700",
    text: "text-amber-600",
    badge: "bg-amber-700 text-white",
  },
];

export default function IpsativePicker({
  options,
  onComplete,
}: IpsativePickerProps) {
  const [rankings, setRankings] = useState<Map<string, number>>(new Map());

  const handleTap = useCallback(
    (optionValue: string) => {
      // If this option already has a rank, reset all
      if (rankings.has(optionValue)) {
        setRankings(new Map());
        return;
      }

      const nextRank = rankings.size + 1;
      const updated = new Map(rankings);
      updated.set(optionValue, nextRank);

      // If this is the second tap, auto-assign rank 3 to remaining
      if (nextRank === 2) {
        const remaining = options.find((o) => !updated.has(o.value));
        if (remaining) {
          updated.set(remaining.value, 3);
        }
      }

      setRankings(updated);

      // If all ranked, fire onComplete
      if (updated.size === options.length) {
        const ranked = options.map((o) => ({
          value: o.value,
          rank: updated.get(o.value)!,
        }));
        onComplete(ranked);
      }
    },
    [rankings, options, onComplete]
  );

  return (
    <div className="w-full" role="group" aria-label="Rank these activities from most to least enjoyable">
      <p className="text-sm text-white/50 text-center mb-4">
        Tap your favourite first, then second. Third is auto-assigned.
      </p>
      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const rank = rankings.get(option.value);
          const rankStyle = rank ? RANK_STYLES[rank - 1] : null;

          return (
            <motion.button
              key={option.value}
              onClick={() => handleTap(option.value)}
              whileTap={{ scale: 0.97 }}
              animate={rank ? { scale: [1, 1.03, 1] } : {}}
              transition={{ duration: 0.2 }}
              aria-label={`${option.label}${rank ? `, ranked ${rank}` : ""}`}
              tabIndex={0}
              className={`relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 ${
                rankStyle
                  ? `${rankStyle.bg} ${rankStyle.border}`
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              {/* Emoji */}
              {option.emoji && (
                <span className="text-2xl flex-shrink-0">{option.emoji}</span>
              )}

              {/* Label */}
              <span
                className={`flex-1 font-medium ${
                  rankStyle ? rankStyle.text : "text-white/80"
                }`}
              >
                {option.label}
              </span>

              {/* Rank badge */}
              {rankStyle && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankStyle.badge}`}
                >
                  {rankStyle.label}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
      {rankings.size > 0 && rankings.size < options.length && (
        <p className="text-xs text-white/30 text-center mt-3">
          Tap a ranked activity to reset
        </p>
      )}
    </div>
  );
}
```

### Step 4.2 — Commit Task 4

- [ ] Stage and commit:
```bash
git add components/quest/ipsative-picker.tsx
git commit -m "feat: add ipsative picker with tap-to-rank interaction"
```

---

## Task 5: Option Grid (Multiple Choice)

### Step 5.1 — Create `components/quest/option-grid.tsx`

- [ ] Create the file `components/quest/option-grid.tsx` with the following content:

```tsx
"use client";

import { motion } from "framer-motion";

interface OptionGridOption {
  label: string;
  value: string;
  emoji?: string;
  subtitle?: string;
}

interface OptionGridProps {
  options: OptionGridOption[];
  value: string | null;
  onChange: (value: string) => void;
}

export default function OptionGrid({
  options,
  value,
  onChange,
}: OptionGridProps) {
  return (
    <div
      className="grid grid-cols-2 gap-3 w-full"
      role="radiogroup"
      aria-label="Select one option"
    >
      {options.map((option, index) => {
        const isSelected = value === option.value;
        return (
          <motion.button
            key={option.value}
            onClick={() => onChange(option.value)}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            role="radio"
            aria-checked={isSelected}
            aria-label={option.label}
            tabIndex={0}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[88px] ${
              isSelected
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
            }`}
          >
            {option.emoji && <span className="text-2xl">{option.emoji}</span>}
            <span
              className={`text-sm font-medium ${
                isSelected ? "text-white" : "text-white/80"
              }`}
            >
              {option.label}
            </span>
            {option.subtitle && (
              <span className="text-xs text-white/40">{option.subtitle}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
```

### Step 5.2 — Commit Task 5

- [ ] Stage and commit:
```bash
git add components/quest/option-grid.tsx
git commit -m "feat: add option grid component for multiple choice questions"
```

---

## Task 6: Progress Bar

### Step 6.1 — Create `components/quest/progress-bar.tsx`

- [ ] Create the file `components/quest/progress-bar.tsx` with the following content:

```tsx
"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  currentBlock: string;
  questionsAnsweredInBlock: number;
  totalQuestionsInBlock: number;
  totalQuestionsAnswered: number;
  totalQuestions: number;
  timeEstimate: string;
}

export default function ProgressBar({
  currentBlock,
  questionsAnsweredInBlock,
  totalQuestionsInBlock,
  totalQuestionsAnswered,
  totalQuestions,
  timeEstimate,
}: ProgressBarProps) {
  const blockProgress =
    totalQuestionsInBlock > 0
      ? (questionsAnsweredInBlock / totalQuestionsInBlock) * 100
      : 0;
  const overallProgress =
    totalQuestions > 0 ? (totalQuestionsAnswered / totalQuestions) * 100 : 0;

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Block name pill + time estimate */}
      <div className="flex items-center justify-between mb-2">
        <span className="rounded-full bg-[var(--color-primary)]/20 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
          {currentBlock}
        </span>
        <span className="text-xs text-white/40">~{timeEstimate} left</span>
      </div>

      {/* Block progress bar */}
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[var(--color-primary)]"
          initial={{ width: 0 }}
          animate={{ width: `${blockProgress}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
        />
      </div>

      {/* Overall progress */}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] text-white/30">
          {questionsAnsweredInBlock}/{totalQuestionsInBlock} in block
        </span>
        <span className="text-[10px] text-white/30">
          {totalQuestionsAnswered}/{totalQuestions} overall
        </span>
      </div>

      {/* Thin overall progress bar */}
      <div className="mt-1 h-1 w-full rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[var(--color-accent)]"
          initial={{ width: 0 }}
          animate={{ width: `${overallProgress}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
        />
      </div>
    </div>
  );
}
```

### Step 6.2 — Commit Task 6

- [ ] Stage and commit:
```bash
git add components/quest/progress-bar.tsx
git commit -m "feat: add block-aware progress bar with time estimate"
```

---

## Task 7: Block Transition Card

### Step 7.1 — Create `components/quest/block-transition.tsx`

- [ ] Create the file `components/quest/block-transition.tsx` with the following content:

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BlockTransitionProps {
  narrationText: string;
  onComplete: () => void;
}

export default function BlockTransition({
  narrationText,
  onComplete,
}: BlockTransitionProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) {
      const exitTimer = setTimeout(onComplete, 400);
      return () => clearTimeout(exitTimer);
    }
  }, [visible, onComplete]);

  const handleTap = () => {
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={handleTap}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleTap();
          }}
          role="button"
          tabIndex={0}
          aria-label="Tap to skip transition"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#0f0a1e] to-[#1a1035] px-8 cursor-pointer"
        >
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="max-w-md text-center text-xl font-medium leading-relaxed text-white/90 italic"
          >
            {narrationText}
          </motion.p>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
            className="mt-8 text-xs text-white/30"
          >
            Tap to continue
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Step 7.2 — Commit Task 7

- [ ] Stage and commit:
```bash
git add components/quest/block-transition.tsx
git commit -m "feat: add block transition interstitial card with fade animation"
```

---

## Task 8: Engagement Checkpoint Card

### Step 8.1 — Create `components/quest/engagement-checkpoint.tsx`

- [ ] Create the file `components/quest/engagement-checkpoint.tsx` with the following content:

```tsx
"use client";

import { motion } from "framer-motion";

interface EngagementCheckpointProps {
  className: string;
  message?: string;
  onContinue: () => void;
}

export default function EngagementCheckpoint({
  className,
  message,
  onContinue,
}: EngagementCheckpointProps) {
  const displayMessage =
    message || `Nice progress, ${className}! Halfway there...`;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex max-w-sm flex-col items-center gap-6 text-center"
      >
        <span className="text-5xl">{"\u{2728}"}</span>
        <p className="text-lg font-medium text-white/90">{displayMessage}</p>
        <button
          onClick={onContinue}
          className="rounded-xl bg-[var(--color-primary)] px-8 py-3 font-medium text-white shadow-[0_0_20px_var(--color-glow)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
          aria-label="Continue quest"
          tabIndex={0}
        >
          Keep going!
        </button>
      </motion.div>
    </div>
  );
}
```

### Step 8.2 — Commit Task 8

- [ ] Stage and commit:
```bash
git add components/quest/engagement-checkpoint.tsx
git commit -m "feat: add engagement checkpoint card with motivational message"
```

---

## Task 9: Discovery Mode Prompt

### Step 9.1 — Create `components/quest/discovery-mode-prompt.tsx`

- [ ] Create the file `components/quest/discovery-mode-prompt.tsx` with the following content:

```tsx
"use client";

import { motion } from "framer-motion";

interface DiscoveryModePromptProps {
  className: string;
  onContinue: () => void;
}

export default function DiscoveryModePrompt({
  className,
  onContinue,
}: DiscoveryModePromptProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex max-w-sm flex-col items-center gap-6 text-center"
      >
        <span className="text-5xl">{"\u{1F914}"}</span>
        <h2 className="text-xl font-semibold text-white">
          Tough to decide?
        </h2>
        <p className="text-sm text-white/70 leading-relaxed">
          Let&apos;s try a different approach, {className}. Instead of rating
          activities, you&apos;ll pick between two options. No sitting on the fence!
        </p>
        <button
          onClick={onContinue}
          className="rounded-xl bg-[var(--color-primary)] px-8 py-3 font-medium text-white shadow-[0_0_20px_var(--color-glow)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
          aria-label="Continue with discovery mode"
          tabIndex={0}
        >
          Let&apos;s try it!
        </button>
      </motion.div>
    </div>
  );
}
```

### Step 9.2 — Commit Task 9

- [ ] Stage and commit:
```bash
git add components/quest/discovery-mode-prompt.tsx
git commit -m "feat: add discovery mode prompt for neutral Likert fallback"
```

---

## Task 10: Self-Map Capture

### Step 10.1 — Create `components/selfmap/self-map-capture.tsx`

- [ ] Create the file `components/selfmap/self-map-capture.tsx` with the following content:

```tsx
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
```

### Step 10.2 — Commit Task 10

- [ ] Stage and commit:
```bash
git add components/selfmap/self-map-capture.tsx
git commit -m "feat: add self-map capture wizard (clarity, sources, strengths)"
```

---

## Task 11: Session 1 Flow Engine

### Step 11.1 — Rewrite `app/quest/session/[id]/page.tsx`

- [ ] Replace the contents of `app/quest/session/[id]/page.tsx` with:

```tsx
"use client";

import { use, useState, useCallback, useEffect, useMemo } from "react";
import QuestionCard from "@/components/quest/question-card";
import LikertSlider from "@/components/quest/likert-slider";
import SpectrumSlider from "@/components/quest/spectrum-slider";
import IpsativePicker from "@/components/quest/ipsative-picker";
import OptionGrid from "@/components/quest/option-grid";
import ProgressBar from "@/components/quest/progress-bar";
import BlockTransition from "@/components/quest/block-transition";
import EngagementCheckpoint from "@/components/quest/engagement-checkpoint";
import DiscoveryModePrompt from "@/components/quest/discovery-mode-prompt";
import SelfMapCapture from "@/components/selfmap/self-map-capture";
import RevealSequence from "@/components/quest/reveal-sequence";
import { useQuestState } from "@/hooks/use-quest-state";
import { useScores } from "@/hooks/use-scores";

// Block definitions with question index ranges
interface BlockDef {
  name: string;
  key: string;
  startIndex: number;
  endIndex: number;
  canSkip: boolean;
  canUndo: boolean;
}

type FlowPhase =
  | "questions"
  | "block_transition"
  | "engagement"
  | "discovery_prompt"
  | "selfmap"
  | "reveal"
  | "confirmatory"
  | "complete";

export default function Session({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    questState,
    submitResponse,
    undoResponse,
    skipQuestion,
    setDiscoveryMode,
    setSelfMap,
    setPhaseComplete,
    persistCheckpoint,
    getQuestionsForSession,
    getAdaptiveQuestions,
    getClassName,
    getNarration,
    getTone,
  } = useQuestState();

  const { scoreState, processResponse, recalculateAll } = useScores();

  const sessionQuestions = useMemo(
    () => getQuestionsForSession(Number(id)),
    [id, getQuestionsForSession]
  );

  const [flowPhase, setFlowPhase] = useState<FlowPhase>("questions");
  const [currentIndex, setCurrentIndex] = useState(
    questState.current_question_index
  );
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [transitionNarration, setTransitionNarration] = useState("");
  const [adaptiveQuestions, setAdaptiveQuestions] = useState<typeof sessionQuestions>([]);
  const [confirmIndex, setConfirmIndex] = useState(0);

  // Track consecutive neutral Likert responses for discovery mode trigger
  const [consecutiveNeutrals, setConsecutiveNeutrals] = useState(0);

  const currentQuestion = useMemo(() => {
    if (flowPhase === "confirmatory") {
      return adaptiveQuestions[confirmIndex] ?? null;
    }
    return sessionQuestions[currentIndex] ?? null;
  }, [flowPhase, sessionQuestions, currentIndex, adaptiveQuestions, confirmIndex]);

  // Build block definitions from question data
  const blocks = useMemo(() => {
    const blockMap = new Map<string, BlockDef>();
    sessionQuestions.forEach((q, i) => {
      const existing = blockMap.get(q.block);
      if (existing) {
        existing.endIndex = i;
      } else {
        const canSkip = q.block === "riasec" || q.block === "riasec_mi";
        const canUndo = q.block !== "warmup";
        blockMap.set(q.block, {
          name: q.block.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          key: q.block,
          startIndex: i,
          endIndex: i,
          canSkip,
          canUndo,
        });
      }
    });
    return Array.from(blockMap.values());
  }, [sessionQuestions]);

  const currentBlock = useMemo(() => {
    return blocks.find(
      (b) => currentIndex >= b.startIndex && currentIndex <= b.endIndex
    );
  }, [blocks, currentIndex]);

  // Time estimate based on remaining questions * 25s
  const timeEstimate = useMemo(() => {
    const remaining = sessionQuestions.length - currentIndex;
    const seconds = remaining * 25;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min`;
  }, [sessionQuestions.length, currentIndex]);

  // Check for block transitions
  const checkBlockTransition = useCallback(
    (nextIndex: number) => {
      const currentBlockKey = sessionQuestions[currentIndex]?.block;
      const nextBlockKey = sessionQuestions[nextIndex]?.block;

      if (!nextBlockKey || currentBlockKey === nextBlockKey) return false;

      const tone = getTone();
      const transitions: Record<string, string> = {
        warmup_riasec: getNarration("riasec_intro"),
        warmup_riasec_mi: getNarration("riasec_intro"),
        riasec_mbti: getNarration("mbti_intro"),
        riasec_mi_mbti: getNarration("mbti_intro"),
        riasec_mbti_values: getNarration("mbti_intro"),
        mbti_values: tone === "quest"
          ? "One more thing \u2014 what drives you?"
          : "Almost done \u2014 a few questions about what matters to you.",
        values_selfmap: "Almost there... one moment of reflection.",
      };

      const key = `${currentBlockKey}_${nextBlockKey}`;
      const narration = transitions[key];
      if (narration) {
        setTransitionNarration(narration);
        setFlowPhase("block_transition");
        return true;
      }
      return false;
    },
    [currentIndex, sessionQuestions, getTone, getNarration]
  );

  // Check for engagement checkpoint (question 7 in RIASEC block)
  const checkEngagement = useCallback(
    (nextIndex: number) => {
      const q = sessionQuestions[nextIndex];
      if (q && q.block === "riasec" && nextIndex === (currentBlock?.startIndex ?? 0) + 7) {
        setFlowPhase("engagement");
        return true;
      }
      return false;
    },
    [sessionQuestions, currentBlock]
  );

  // Check for discovery mode trigger
  const checkDiscoveryMode = useCallback(
    (responseValue: number, questionType: string) => {
      if (questState.discovery_mode_active) return false;
      if (questionType !== "likert") return false;

      const newCount = responseValue === 3 ? consecutiveNeutrals + 1 : 0;
      setConsecutiveNeutrals(newCount);

      if (newCount >= 3) {
        setFlowPhase("discovery_prompt");
        return true;
      }
      return false;
    },
    [questState.discovery_mode_active, consecutiveNeutrals]
  );

  // Handle answer submission
  const handleAnswer = useCallback(
    (value: number | string, label?: string) => {
      if (!currentQuestion) return;

      const numericValue = typeof value === "string" ? 0 : value;
      const responseLabel = label ?? String(value);

      // Submit to quest state
      submitResponse({
        question_id: currentQuestion.id,
        response_value: numericValue,
        response_label: responseLabel,
        framework: currentQuestion.framework,
        framework_target: currentQuestion.framework_target,
        answered_at: Date.now(),
      });

      // Process scoring
      processResponse(currentQuestion, numericValue);

      // Check discovery mode trigger (only for Likert in RIASEC block)
      if (
        currentQuestion.question_type === "likert" &&
        currentQuestion.block === "riasec"
      ) {
        if (checkDiscoveryMode(numericValue, "likert")) return;
      }

      // Advance to next question
      const nextIndex = currentIndex + 1;
      setDirection("right");

      // Check if we've reached the end of all core questions
      if (nextIndex >= sessionQuestions.length) {
        // Move to self-map capture
        setFlowPhase("selfmap");
        return;
      }

      // Persistence checkpoints
      const currentBlockKey = sessionQuestions[currentIndex]?.block;
      const nextBlockKey = sessionQuestions[nextIndex]?.block;
      if (
        currentBlockKey === "riasec" &&
        nextBlockKey !== "riasec" &&
        nextBlockKey !== "riasec_mi"
      ) {
        persistCheckpoint("riasec");
      }
      if (
        (currentBlockKey === "values" || currentBlockKey === "mbti_values") &&
        nextBlockKey !== currentBlockKey
      ) {
        persistCheckpoint("full");
      }

      // Check block transition
      if (checkBlockTransition(nextIndex)) {
        setCurrentIndex(nextIndex);
        return;
      }

      // Check engagement checkpoint
      if (checkEngagement(nextIndex)) {
        setCurrentIndex(nextIndex);
        return;
      }

      setCurrentIndex(nextIndex);
    },
    [
      currentQuestion,
      currentIndex,
      sessionQuestions,
      submitResponse,
      processResponse,
      checkDiscoveryMode,
      checkBlockTransition,
      checkEngagement,
      persistCheckpoint,
    ]
  );

  // Handle ipsative ranking completion
  const handleIpsativeComplete = useCallback(
    (ranked: { value: string; rank: number }[]) => {
      if (!currentQuestion) return;

      const rankToScore: Record<number, number> = { 1: 5, 2: 3, 3: 1 };
      ranked.forEach((r) => {
        processResponse(
          {
            ...currentQuestion,
            framework_target: r.value,
          },
          rankToScore[r.rank]
        );
      });

      submitResponse({
        question_id: currentQuestion.id,
        response_value: 0,
        response_label: ranked.map((r) => `${r.rank}:${r.value}`).join(","),
        framework: currentQuestion.framework,
        framework_target: "ipsative",
        answered_at: Date.now(),
      });

      // Advance
      const nextIndex = currentIndex + 1;
      setDirection("right");
      if (nextIndex >= sessionQuestions.length) {
        setFlowPhase("selfmap");
        return;
      }
      if (checkBlockTransition(nextIndex)) {
        setCurrentIndex(nextIndex);
        return;
      }
      setCurrentIndex(nextIndex);
    },
    [
      currentQuestion,
      currentIndex,
      sessionQuestions,
      processResponse,
      submitResponse,
      checkBlockTransition,
    ]
  );

  // Handle undo
  const handleUndo = useCallback(() => {
    if (currentIndex <= 0) return;
    setDirection("left");
    undoResponse();
    setCurrentIndex(currentIndex - 1);
  }, [currentIndex, undoResponse]);

  // Handle skip
  const handleSkip = useCallback(() => {
    skipQuestion(currentQuestion?.id ?? "");
    const nextIndex = currentIndex + 1;
    setDirection("right");
    if (nextIndex >= sessionQuestions.length) {
      setFlowPhase("selfmap");
      return;
    }
    if (checkBlockTransition(nextIndex)) {
      setCurrentIndex(nextIndex);
      return;
    }
    setCurrentIndex(nextIndex);
  }, [
    currentQuestion,
    currentIndex,
    sessionQuestions,
    skipQuestion,
    checkBlockTransition,
  ]);

  // Handle block transition complete
  const handleTransitionComplete = useCallback(() => {
    setFlowPhase("questions");
  }, []);

  // Handle engagement continue
  const handleEngagementContinue = useCallback(() => {
    setFlowPhase("questions");
  }, []);

  // Handle discovery mode activation
  const handleDiscoveryContinue = useCallback(() => {
    setDiscoveryMode(true);
    setFlowPhase("questions");
  }, [setDiscoveryMode]);

  // Handle self-map completion
  const handleSelfMapComplete = useCallback(
    (data: { clarity: number; sources: string[]; perceived_strengths: string[] }) => {
      setSelfMap(data);
      setFlowPhase("reveal");
    },
    [setSelfMap]
  );

  // Handle reveal sequence completion (moves to confirmatory)
  const handleRevealComplete = useCallback(() => {
    const adaptive = getAdaptiveQuestions(scoreState);
    setAdaptiveQuestions(adaptive);
    setConfirmIndex(0);
    setFlowPhase("confirmatory");
  }, [getAdaptiveQuestions, scoreState]);

  // Handle confirmatory answer
  const handleConfirmatoryAnswer = useCallback(
    (value: number | string, label?: string) => {
      const q = adaptiveQuestions[confirmIndex];
      if (!q) return;

      const numericValue = typeof value === "string" ? 0 : value;
      submitResponse({
        question_id: q.id,
        response_value: numericValue,
        response_label: label ?? String(value),
        framework: q.framework,
        framework_target: q.framework_target,
        answered_at: Date.now(),
      });
      processResponse(q, numericValue);

      if (confirmIndex + 1 >= adaptiveQuestions.length) {
        // Final persistence + complete
        persistCheckpoint("final");
        setPhaseComplete();
        setFlowPhase("complete");
      } else {
        setDirection("right");
        setConfirmIndex(confirmIndex + 1);
      }
    },
    [
      adaptiveQuestions,
      confirmIndex,
      submitResponse,
      processResponse,
      persistCheckpoint,
      setPhaseComplete,
    ]
  );

  // Render the correct input component based on question_type
  const renderInput = useCallback(
    (
      question: (typeof sessionQuestions)[0],
      onSubmit: (value: number | string, label?: string) => void
    ) => {
      switch (question.question_type) {
        case "likert":
          return (
            <LikertSlider
              value={null}
              onChange={(v) => onSubmit(v)}
            />
          );

        case "spectrum":
          return (
            <SpectrumSlider
              value={null}
              onChange={(v) => onSubmit(v)}
              leftLabel={question.options[0]?.label ?? ""}
              rightLabel={question.options[1]?.label ?? ""}
            />
          );

        case "ipsative":
          return (
            <IpsativePicker
              options={question.options.map((o) => ({
                label: o.label,
                value: o.value as string,
                emoji: o.emoji,
                framework_signals: o.framework_signals,
              }))}
              onComplete={handleIpsativeComplete}
            />
          );

        case "multiple_choice":
          return (
            <OptionGrid
              options={question.options.map((o) => ({
                label: o.label,
                value: o.value as string,
                emoji: o.emoji,
              }))}
              value={null}
              onChange={(v) => {
                const selectedOption = question.options.find(
                  (o) => o.value === v
                );
                onSubmit(v, selectedOption?.label);
              }}
            />
          );

        case "forced_choice":
          return (
            <div className="flex flex-col gap-3 w-full">
              {question.options.map((option) => (
                <button
                  key={String(option.value)}
                  onClick={() => onSubmit(option.value, option.label)}
                  className="w-full rounded-xl border-2 border-white/10 bg-white/5 p-4 text-left text-white/80 font-medium transition-colors hover:bg-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
                  aria-label={option.label}
                  tabIndex={0}
                >
                  {option.emoji && (
                    <span className="mr-2">{option.emoji}</span>
                  )}
                  {option.label}
                </button>
              ))}
            </div>
          );

        default:
          return null;
      }
    },
    [handleIpsativeComplete]
  );

  // === RENDER ===

  // Block transition interstitial
  if (flowPhase === "block_transition") {
    return (
      <BlockTransition
        narrationText={transitionNarration}
        onComplete={handleTransitionComplete}
      />
    );
  }

  // Engagement checkpoint
  if (flowPhase === "engagement") {
    return (
      <EngagementCheckpoint
        className={getClassName()}
        onContinue={handleEngagementContinue}
      />
    );
  }

  // Discovery mode prompt
  if (flowPhase === "discovery_prompt") {
    return (
      <DiscoveryModePrompt
        className={getClassName()}
        onContinue={handleDiscoveryContinue}
      />
    );
  }

  // Self-map capture
  if (flowPhase === "selfmap") {
    return <SelfMapCapture onComplete={handleSelfMapComplete} />;
  }

  // Reveal sequence
  if (flowPhase === "reveal") {
    return (
      <RevealSequence
        scoreState={scoreState}
        className={getClassName()}
        tone={getTone()}
        onRevealComplete={handleRevealComplete}
        onSessionComplete={() => setFlowPhase("complete")}
      />
    );
  }

  // Confirmatory round
  if (flowPhase === "confirmatory" && currentQuestion) {
    return (
      <div>
        <div className="absolute top-4 left-4 right-4">
          <ProgressBar
            currentBlock="Confirmatory"
            questionsAnsweredInBlock={confirmIndex}
            totalQuestionsInBlock={adaptiveQuestions.length}
            totalQuestionsAnswered={sessionQuestions.length + confirmIndex}
            totalQuestions={sessionQuestions.length + adaptiveQuestions.length}
            timeEstimate="2 min"
          />
        </div>
        <QuestionCard
          questionText={currentQuestion.question_text}
          questionIndex={confirmIndex}
          totalQuestions={adaptiveQuestions.length}
          blockName="Confirmatory"
          timeEstimate="~2 min left"
          direction={direction}
          canUndo={false}
          onUndo={() => {}}
          canSkip={false}
          onSkip={() => {}}
        >
          {renderInput(currentQuestion, handleConfirmatoryAnswer)}
        </QuestionCard>
      </div>
    );
  }

  // Session complete
  if (flowPhase === "complete") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <span className="text-6xl mb-6">{"\u{1F389}"}</span>
        <h1 className="text-2xl font-bold text-white mb-2">
          Quest progress saved!
        </h1>
        <p className="text-white/60 mb-8">
          Session 1 complete. Your profile has been revealed.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <a
            href="/quest/dashboard"
            className="rounded-xl bg-[var(--color-primary)] px-8 py-3 font-medium text-white text-center shadow-[0_0_20px_var(--color-glow)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
          >
            View Dashboard
          </a>
          <div className="flex items-center gap-2 justify-center text-white/30 mt-4">
            <span className="text-lg">{"\u{1F512}"}</span>
            <span className="text-sm">Session 2 coming soon</span>
          </div>
        </div>
      </div>
    );
  }

  // Main question flow
  if (!currentQuestion) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-white/50">Loading questions...</p>
      </div>
    );
  }

  const canUndo =
    questState.last_response_undoable &&
    currentBlock?.canUndo === true &&
    currentIndex > (currentBlock?.startIndex ?? 0);

  const canSkip = currentBlock?.canSkip === true;

  return (
    <div>
      <div className="absolute top-16 left-4 right-4 z-20">
        <ProgressBar
          currentBlock={currentBlock?.name ?? ""}
          questionsAnsweredInBlock={
            currentIndex - (currentBlock?.startIndex ?? 0)
          }
          totalQuestionsInBlock={
            (currentBlock?.endIndex ?? 0) - (currentBlock?.startIndex ?? 0) + 1
          }
          totalQuestionsAnswered={currentIndex}
          totalQuestions={sessionQuestions.length}
          timeEstimate={timeEstimate}
        />
      </div>
      <QuestionCard
        questionText={currentQuestion.question_text}
        questionIndex={currentIndex}
        totalQuestions={sessionQuestions.length}
        blockName={currentBlock?.name ?? ""}
        timeEstimate={`~${timeEstimate} left`}
        direction={direction}
        canUndo={canUndo}
        onUndo={handleUndo}
        canSkip={canSkip}
        onSkip={handleSkip}
      >
        {renderInput(currentQuestion, handleAnswer)}
      </QuestionCard>
    </div>
  );
}
```

### Step 11.2 — Commit Task 11

- [ ] Stage and commit:
```bash
git add app/quest/session/\[id\]/page.tsx
git commit -m "feat: rewrite session page as flow engine with block progression and discovery mode"
```

---

## Task 12: RIASEC Stat Bars

### Step 12.1 — Create `components/charts/riasec-bars.tsx`

- [ ] Create the file `components/charts/riasec-bars.tsx` with the following content:

```tsx
"use client";

import { motion } from "framer-motion";

interface RiasecBarsProps {
  scores: Record<string, number>;
  classLabel: string;
}

const RIASEC_TYPES = [
  { key: "R", label: "Maker", emoji: "\u{1F527}" },
  { key: "I", label: "Investigator", emoji: "\u{1F52C}" },
  { key: "A", label: "Creator", emoji: "\u{1F3A8}" },
  { key: "S", label: "Helper", emoji: "\u{1F91D}" },
  { key: "E", label: "Leader", emoji: "\u{1F4E2}" },
  { key: "C", label: "Organizer", emoji: "\u{1F4CB}" },
];

export default function RiasecBars({ scores, classLabel }: RiasecBarsProps) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider">
        Ability Scores
      </h3>
      <div className="flex flex-col gap-3">
        {RIASEC_TYPES.map((type, index) => {
          const score = Math.round(scores[type.key] ?? 0);
          const isHighlighted = score > 50;
          return (
            <div key={type.key} className="flex items-center gap-3">
              <span className="text-lg w-7 text-center flex-shrink-0">
                {type.emoji}
              </span>
              <span className="text-xs text-white/50 w-20 flex-shrink-0">
                {type.label}
              </span>
              <div className="flex-1 h-6 rounded-full bg-white/10 overflow-hidden relative">
                <motion.div
                  className={`h-full rounded-full ${
                    isHighlighted
                      ? "bg-[var(--color-accent)]"
                      : "bg-white/20"
                  }`}
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
              <span
                className={`text-sm font-mono w-8 text-right flex-shrink-0 ${
                  isHighlighted ? "text-white" : "text-white/40"
                }`}
              >
                {score}
              </span>
            </div>
          );
        })}
      </div>
      {/* CLASS label badge */}
      <div className="mt-4 flex justify-center">
        <span className="rounded-full bg-[var(--color-primary)]/20 px-4 py-1.5 text-sm font-bold text-[var(--color-primary)] uppercase tracking-wider">
          CLASS: {classLabel}
        </span>
      </div>
    </div>
  );
}
```

### Step 12.2 — Commit Task 12

- [ ] Stage and commit:
```bash
git add components/charts/riasec-bars.tsx
git commit -m "feat: add RIASEC stat bars with animated fills and CLASS label"
```

---

## Task 13: MI Preview Bars

### Step 13.1 — Create `components/charts/mi-preview-bars.tsx`

- [ ] Create the file `components/charts/mi-preview-bars.tsx` with the following content:

```tsx
"use client";

import { motion } from "framer-motion";

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
        <p className="text-xs text-white/20 mt-1 italic">
          More detail in Session 2
        </p>
      </div>
    </div>
  );
}
```

### Step 13.2 — Commit Task 13

- [ ] Stage and commit:
```bash
git add components/charts/mi-preview-bars.tsx
git commit -m "feat: add MI preview bars showing top 3 learning styles"
```

---

## Task 14: MBTI Spectrum Sliders (Display)

### Step 14.1 — Create `components/charts/mbti-sliders.tsx`

- [ ] Create the file `components/charts/mbti-sliders.tsx` with the following content:

```tsx
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
```

### Step 14.2 — Commit Task 14

- [ ] Stage and commit:
```bash
git add components/charts/mbti-sliders.tsx
git commit -m "feat: add MBTI spectrum slider display with emerging threshold"
```

---

## Task 15: Values Sliders (Display)

### Step 15.1 — Create `components/charts/values-sliders.tsx`

- [ ] Create the file `components/charts/values-sliders.tsx` with the following content:

```tsx
"use client";

import { motion } from "framer-motion";

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

export default function ValuesSliders({ scores }: ValuesSlidersProps) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-white/70 mb-1 uppercase tracking-wider">
        Values Compass
      </h3>
      <p className="text-xs text-white/30 mb-4">Initial value readings</p>

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
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                <motion.div
                  className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)] shadow-[0_0_10px_var(--color-glow)]"
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
            </div>
          );
        })}
      </div>

      {/* Remaining grayed out */}
      <div className="flex flex-col gap-3 opacity-40">
        {REMAINING_DIMENSIONS.map((dim) => (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/30">{dim.leftLabel}</span>
              <span className="text-xs text-white/30">{dim.rightLabel}</span>
            </div>
            <div className="h-4 rounded-full bg-white/5" />
          </div>
        ))}
        <p className="text-xs text-white/20 italic">
          More dimensions in Session 2
        </p>
      </div>
    </div>
  );
}
```

### Step 15.2 — Commit Task 15

- [ ] Stage and commit:
```bash
git add components/charts/values-sliders.tsx
git commit -m "feat: add values compass display sliders with locked dimensions"
```

---

## Task 16: Class Label + Emerging Type

### Step 16.1 — Create `components/charts/class-label.tsx`

- [ ] Create the file `components/charts/class-label.tsx` with the following content:

```tsx
"use client";

import { motion } from "framer-motion";

interface ClassLabelProps {
  label: string;
}

export default function ClassLabel({ label }: ClassLabelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="inline-flex items-center"
    >
      <span className="rounded-[var(--border-radius)] bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 px-5 py-2 text-sm font-bold text-[var(--color-primary)] uppercase tracking-widest shadow-[0_0_20px_var(--color-glow)]">
        CLASS: {label}
      </span>
    </motion.div>
  );
}
```

### Step 16.2 — Create `components/charts/emerging-type.tsx`

- [ ] Create the file `components/charts/emerging-type.tsx` with the following content:

```tsx
"use client";

import { motion } from "framer-motion";

interface EmergingTypeProps {
  /** e.g. "I N _ J" */
  typeCode: string;
  /** e.g. "The Strategic Visionary" */
  descriptor: string;
}

export default function EmergingType({
  typeCode,
  descriptor,
}: EmergingTypeProps) {
  const letters = typeCode.split(" ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="flex items-center gap-2">
        {letters.map((letter, i) => {
          const isUnderscore = letter === "_";
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className={`text-3xl font-bold tracking-widest ${
                isUnderscore
                  ? "text-white/20"
                  : "text-[var(--color-primary)]"
              }`}
            >
              {letter}
            </motion.span>
          );
        })}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-sm text-white/60 italic"
      >
        {descriptor}
      </motion.p>
    </motion.div>
  );
}
```

### Step 16.3 — Commit Task 16

- [ ] Stage and commit:
```bash
git add components/charts/class-label.tsx components/charts/emerging-type.tsx
git commit -m "feat: add CLASS label badge and emerging MBTI type display"
```

---

## Task 17: Badge Row + Unlock Animation

### Step 17.1 — Create `components/badges/badge-row.tsx`

- [ ] Create the file `components/badges/badge-row.tsx` with the following content:

```tsx
"use client";

import { BadgeDefinition } from "@/data/badges";

interface BadgeRowProps {
  allBadges: BadgeDefinition[];
  unlockedIds: string[];
}

const BADGE_ICONS: Record<string, string> = {
  rocket: "\u{1F680}",
  "magnifying-glass": "\u{1F50D}",
  compass: "\u{1F9ED}",
  map: "\u{1F5FA}\u{FE0F}",
  clipboard: "\u{1F4CB}",
  scroll: "\u{1F4DC}",
};

export default function BadgeRow({ allBadges, unlockedIds }: BadgeRowProps) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">
        Inventory
      </h3>
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {allBadges.map((badge) => {
          const isUnlocked = unlockedIds.includes(badge.id);
          return (
            <div
              key={badge.id}
              className={`flex flex-col items-center gap-1 flex-shrink-0 ${
                isUnlocked ? "" : "opacity-40"
              }`}
              title={isUnlocked ? badge.description : "???"}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${
                  isUnlocked
                    ? "bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                {isUnlocked
                  ? BADGE_ICONS[badge.icon] ?? "\u{2728}"
                  : "\u{1F512}"}
              </div>
              <span
                className={`text-[10px] max-w-[56px] text-center truncate ${
                  isUnlocked ? "text-white/60" : "text-white/20"
                }`}
              >
                {isUnlocked ? badge.name : "???"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Step 17.2 — Create `components/badges/badge-unlock.tsx`

- [ ] Create the file `components/badges/badge-unlock.tsx` with the following content:

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BadgeUnlockProps {
  badgeName: string;
  badgeIcon: string;
  onComplete: () => void;
}

const BADGE_ICONS: Record<string, string> = {
  rocket: "\u{1F680}",
  "magnifying-glass": "\u{1F50D}",
  compass: "\u{1F9ED}",
  map: "\u{1F5FA}\u{FE0F}",
  clipboard: "\u{1F4CB}",
  scroll: "\u{1F4DC}",
};

export default function BadgeUnlock({
  badgeName,
  badgeIcon,
  onComplete,
}: BadgeUnlockProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) {
      const exitTimer = setTimeout(onComplete, 400);
      return () => clearTimeout(exitTimer);
    }
  }, [visible, onComplete]);

  const emoji = BADGE_ICONS[badgeIcon] ?? "\u{2728}";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setVisible(false)}
        >
          {/* Glow pulse background */}
          <motion.div
            className="absolute w-40 h-40 rounded-full bg-[var(--color-primary)]/30 blur-3xl"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Badge icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1.0] }}
            transition={{
              times: [0, 0.6, 1],
              duration: 0.6,
              ease: "easeOut",
            }}
            className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--color-primary)]/20 border-2 border-[var(--color-primary)] shadow-[0_0_40px_var(--color-glow)]"
          >
            <span className="text-4xl">{emoji}</span>
          </motion.div>

          {/* Badge name */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center"
          >
            <p className="text-xs text-white/50 uppercase tracking-widest mb-1">
              Badge Unlocked!
            </p>
            <p className="text-lg font-bold text-white">{badgeName}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Step 17.3 — Commit Task 17

- [ ] Stage and commit:
```bash
git add components/badges/badge-row.tsx components/badges/badge-unlock.tsx
git commit -m "feat: add badge inventory row and unlock animation overlay"
```

---

## Task 18: XP Bar

### Step 18.1 — Create `components/ui/xp-bar.tsx`

- [ ] Create the file `components/ui/xp-bar.tsx` with the following content:

```tsx
"use client";

import { motion } from "framer-motion";

interface XpBarProps {
  currentXp: number;
  maxXp: number;
}

const COSMETIC_THRESHOLDS = [
  { xp: 150, label: "Background", emoji: "\u{1F3A8}" },
  { xp: 300, label: "Accent", emoji: "\u{2728}" },
  { xp: 450, label: "Gold Trim", emoji: "\u{1F451}" },
];

export default function XpBar({ currentXp, maxXp }: XpBarProps) {
  const pct = maxXp > 0 ? Math.min((currentXp / maxXp) * 100, 100) : 0;

  return (
    <div className="w-full">
      {/* XP count */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-white/60">XP</span>
        <span className="text-xs font-mono text-white/50">
          {currentXp} / {maxXp}
        </span>
      </div>

      {/* Bar with threshold markers */}
      <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
        {/* Fill */}
        <motion.div
          className="h-full rounded-full bg-[var(--color-accent)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />

        {/* Threshold markers */}
        {COSMETIC_THRESHOLDS.map((t) => {
          const markerPct = (t.xp / maxXp) * 100;
          const isUnlocked = currentXp >= t.xp;
          return (
            <div
              key={t.xp}
              className="absolute top-0 bottom-0 flex items-center"
              style={{ left: `${markerPct}%` }}
              title={`${t.label} unlocked at ${t.xp} XP`}
            >
              <div
                className={`h-5 w-5 -translate-x-1/2 rounded-full border-2 flex items-center justify-center text-[8px] ${
                  isUnlocked
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/30"
                    : "border-white/20 bg-white/5"
                }`}
              >
                {isUnlocked ? t.emoji : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Step 18.2 — Commit Task 18

- [ ] Stage and commit:
```bash
git add components/ui/xp-bar.tsx
git commit -m "feat: add XP progress bar with cosmetic unlock thresholds"
```

---

## Task 19: Dashboard Page

### Step 19.1 — Rewrite `app/quest/dashboard/page.tsx`

- [ ] Replace the contents of `app/quest/dashboard/page.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RiasecBars from "@/components/charts/riasec-bars";
import MiPreviewBars from "@/components/charts/mi-preview-bars";
import MbtiSliders from "@/components/charts/mbti-sliders";
import ValuesSliders from "@/components/charts/values-sliders";
import ClassLabel from "@/components/charts/class-label";
import EmergingType from "@/components/charts/emerging-type";
import BadgeRow from "@/components/badges/badge-row";
import XpBar from "@/components/ui/xp-bar";
import { badges as allBadgeDefinitions } from "@/data/badges";

interface StudentData {
  name: string;
  age: number;
  avatar_class: string;
  tone: "quest" | "explorer";
  current_session: number;
  self_map: {
    clarity: number;
    sources: string[];
    perceived_strengths: string[];
    curiosities: string[];
  } | null;
}

interface ScoresData {
  riasec_scores: Record<string, number>;
  mi_scores: Record<string, number>;
  mbti_indicators: Record<string, number>;
  values_compass: Record<string, number>;
  strengths: string[];
}

interface AchievementRow {
  badge_id: string;
}

// XP calculation based on spec
function calculateXp(currentSession: number, hasCompletedSession1: boolean): number {
  let xp = 100; // character creation
  if (hasCompletedSession1) {
    xp += 50 + 100 + 50 + 100 + 25 + 25; // warmup + riasec + mi + mbti + values + confirmatory
  }
  return xp;
}

// CLASS label derivation
function deriveClassLabel(scores: Record<string, number>): string {
  const DISPLAY_NAMES: Record<string, string> = {
    R: "MAKER",
    I: "INVESTIGATOR",
    A: "CREATOR",
    S: "HELPER",
    E: "LEADER",
    C: "ORGANIZER",
  };

  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);

  if (sorted.length < 2) return "SEEKER";

  const [top, second, third] = sorted;
  const gap23 = third ? second[1] - third[1] : second[1];

  if (top[1] > 50 && second[1] > 50 && gap23 > 10) {
    return `${DISPLAY_NAMES[top[0]] ?? top[0]}-${DISPLAY_NAMES[second[0]] ?? second[0]}`;
  }
  if (top[1] > 50) {
    if (top[1] - second[1] > 15) {
      return DISPLAY_NAMES[top[0]] ?? top[0];
    }
    return "EXPLORER";
  }
  if (sorted.every(([, v]) => v < 40)) {
    return "SEEKER";
  }
  return "EXPLORER";
}

// Derive MBTI type string with underscore for emerging
function deriveEmergingTypeCode(mbti: Record<string, number>): string {
  const threshold = 35;
  const letters: string[] = [];

  const pairs: [string, string, string][] = [
    ["EI", "E", "I"],
    ["SN", "S", "N"],
    ["TF", "T", "F"],
    ["JP", "J", "P"],
  ];

  for (const [key, left, right] of pairs) {
    const score = mbti[key] ?? 0;
    if (Math.abs(score) < threshold) {
      letters.push("_");
    } else {
      letters.push(score < 0 ? left : right);
    }
  }

  return letters.join(" ");
}

// CLASS name mapping for avatar
const CLASS_NAMES: Record<string, { quest: string; explorer: string }> = {
  warrior: { quest: "Warrior", explorer: "Strategist" },
  mage: { quest: "Mage", explorer: "Analyst" },
  ranger: { quest: "Ranger", explorer: "Pathfinder" },
  sorceress: { quest: "Sorceress", explorer: "Visionary" },
  valkyrie: { quest: "Valkyrie", explorer: "Defender" },
  huntress: { quest: "Huntress", explorer: "Scout" },
  wanderer: { quest: "Wanderer", explorer: "Explorer" },
};

const CLASS_ICONS: Record<string, string> = {
  warrior: "\u{2694}\u{FE0F}",
  mage: "\u{1F9D9}",
  ranger: "\u{1F3F9}",
  sorceress: "\u{1F52E}",
  valkyrie: "\u{1F6E1}\u{FE0F}",
  huntress: "\u{1F319}",
  wanderer: "\u{2728}",
};

export default function Dashboard() {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [scores, setScores] = useState<ScoresData | null>(null);
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const [studentRes, scoresRes, achievementsRes] = await Promise.all([
          supabase
            .from("students")
            .select("name, age, avatar_class, tone, current_session, self_map")
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("assessment_scores")
            .select(
              "riasec_scores, mi_scores, mbti_indicators, values_compass, strengths"
            )
            .eq("student_id", user.id)
            .single(),
          supabase
            .from("achievements")
            .select("badge_id")
            .eq("student_id", user.id),
        ]);

        if (studentRes.data) {
          setStudent(studentRes.data as StudentData);
        }
        if (scoresRes.data) {
          setScores(scoresRes.data as ScoresData);
        }
        if (achievementsRes.data) {
          setUnlockedBadgeIds(
            (achievementsRes.data as AchievementRow[]).map((a) => a.badge_id)
          );
        }
      } catch {
        // Silently handle — dashboard shows empty state
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
      </div>
    );
  }

  if (!student || !scores) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <p className="text-white/50 mb-4">No quest data found.</p>
        <a
          href="/"
          className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-white font-medium"
        >
          Start Your Quest
        </a>
      </div>
    );
  }

  const className =
    CLASS_NAMES[student.avatar_class]?.[student.tone] ?? student.avatar_class;
  const classIcon = CLASS_ICONS[student.avatar_class] ?? "\u{2728}";
  const hasCompletedSession1 = student.current_session >= 1;
  const xp = calculateXp(student.current_session, hasCompletedSession1);
  const classLabel = deriveClassLabel(scores.riasec_scores);
  const emergingTypeCode = deriveEmergingTypeCode(scores.mbti_indicators);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#0f0a1e] to-[#1a1035] px-4 py-6 pb-20">
      <div className="mx-auto max-w-3xl">
        {/* === Top bar: avatar + class + level + XP === */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 text-2xl flex-shrink-0">
            {classIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white truncate">
                {student.name}
              </h1>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50 flex-shrink-0">
                {className}
              </span>
            </div>
            <p className="text-xs text-white/40 mb-1">
              Level {student.age}
            </p>
            <XpBar currentXp={xp} maxXp={1000} />
          </div>
        </div>

        {/* === Badge inventory === */}
        <div className="mb-8">
          <BadgeRow
            allBadges={allBadgeDefinitions}
            unlockedIds={unlockedBadgeIds}
          />
        </div>

        {/* === Two-column grid === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {/* Left: RIASEC + CLASS */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <RiasecBars
              scores={scores.riasec_scores}
              classLabel={classLabel}
            />
          </div>

          {/* Right: MBTI + Emerging type */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <MbtiSliders scores={scores.mbti_indicators} />
            <div className="mt-4 flex justify-center">
              <EmergingType
                typeCode={emergingTypeCode}
                descriptor=""
              />
            </div>
          </div>
        </div>

        {/* === Second row === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {/* Left: MI preview */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <MiPreviewBars scores={scores.mi_scores} />
          </div>

          {/* Right: Values preview */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <ValuesSliders scores={scores.values_compass} />
          </div>
        </div>

        {/* === Locked panels === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl bg-white/5 border border-white/5 p-5 opacity-40">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{"\u{1F512}"}</span>
              <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
                Full Learning Styles
              </h3>
            </div>
            <p className="text-xs text-white/20">
              Deepens in Session 2
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/5 p-5 opacity-40">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{"\u{1F512}"}</span>
              <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
                Full Values Compass
              </h3>
            </div>
            <p className="text-xs text-white/20">
              Deepens in Session 2
            </p>
          </div>
        </div>

        {/* === Strengths section === */}
        {scores.strengths && scores.strengths.length > 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-6">
            <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">
              Detected Strengths
            </h3>
            <div className="flex flex-wrap gap-2">
              {scores.strengths.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs font-medium text-[var(--color-accent)]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* === Quest Log === */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-6">
          <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">
            Quest Log
          </h3>
          <div className="flex flex-col gap-2">
            {/* Session 1 */}
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  hasCompletedSession1
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {hasCompletedSession1 ? "\u{2713}" : "\u{25CF}"}
              </span>
              <span className="text-sm text-white/70">
                Session 1: Discovery Quest
              </span>
              <span
                className={`ml-auto text-xs ${
                  hasCompletedSession1 ? "text-green-400" : "text-yellow-400"
                }`}
              >
                {hasCompletedSession1 ? "Complete" : "In progress"}
              </span>
            </div>
            {/* Sessions 2-4 locked */}
            {[
              { num: 2, name: "Deep Dive" },
              { num: 3, name: "Career Matching" },
              { num: 4, name: "Action Plan" },
            ].map((session) => (
              <div key={session.num} className="flex items-center gap-3 opacity-40">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-xs text-white/20">
                  {"\u{1F512}"}
                </span>
                <span className="text-sm text-white/30">
                  Session {session.num}: {session.name}
                </span>
                <span className="ml-auto text-xs text-white/20">Locked</span>
              </div>
            ))}
          </div>
        </div>

        {/* === Action button === */}
        <div className="flex justify-center">
          <button
            disabled
            className="rounded-xl bg-white/10 px-8 py-3 font-medium text-white/30 cursor-not-allowed min-h-[44px]"
          >
            Begin Session 2 — Coming soon
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 19.2 — Commit Task 19

- [ ] Stage and commit:
```bash
git add app/quest/dashboard/page.tsx
git commit -m "feat: build RPG stats dashboard with charts, badges, XP, and quest log"
```

---

## Task 20: Reveal Sequence

### Step 20.1 — Create `components/quest/reveal-sequence.tsx`

- [ ] Create the file `components/quest/reveal-sequence.tsx` with the following content:

```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RiasecBars from "@/components/charts/riasec-bars";
import MiPreviewBars from "@/components/charts/mi-preview-bars";
import MbtiSliders from "@/components/charts/mbti-sliders";
import ValuesSliders from "@/components/charts/values-sliders";
import ClassLabel from "@/components/charts/class-label";
import EmergingType from "@/components/charts/emerging-type";
import BadgeUnlock from "@/components/badges/badge-unlock";

interface ScoreState {
  riasec: Record<string, number>;
  mi: Record<string, number>;
  mbti: Record<string, number>;
  values: Record<string, number>;
  strengths: string[];
  class_label: string;
}

interface RevealSequenceProps {
  scoreState: ScoreState;
  className: string;
  tone: "quest" | "explorer";
  onRevealComplete: () => void;
  onSessionComplete: () => void;
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
  | "confirmatory_intro"
  | "badge_unlock"
  | "comparison_hint"
  | "done";

// CLASS label derivation
function deriveClassLabel(scores: Record<string, number>): string {
  const DISPLAY_NAMES: Record<string, string> = {
    R: "MAKER",
    I: "INVESTIGATOR",
    A: "CREATOR",
    S: "HELPER",
    E: "LEADER",
    C: "ORGANIZER",
  };

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  if (sorted.length < 2) return "SEEKER";

  const [top, second, third] = sorted;
  const gap23 = third ? second[1] - third[1] : second[1];

  if (top[1] > 50 && second[1] > 50 && gap23 > 10) {
    return `${DISPLAY_NAMES[top[0]] ?? top[0]}-${DISPLAY_NAMES[second[0]] ?? second[0]}`;
  }
  if (top[1] > 50) {
    if (top[1] - second[1] > 15) return DISPLAY_NAMES[top[0]] ?? top[0];
    return "EXPLORER";
  }
  if (sorted.every(([, v]) => v < 40)) return "SEEKER";
  return "EXPLORER";
}

// Derive MBTI type code
function deriveEmergingTypeCode(mbti: Record<string, number>): string {
  const threshold = 35;
  const pairs: [string, string, string][] = [
    ["EI", "E", "I"],
    ["SN", "S", "N"],
    ["TF", "T", "F"],
    ["JP", "J", "P"],
  ];
  return pairs
    .map(([key, left, right]) => {
      const score = mbti[key] ?? 0;
      if (Math.abs(score) < threshold) return "_";
      return score < 0 ? left : right;
    })
    .join(" ");
}

export default function RevealSequence({
  scoreState,
  className,
  tone,
  onRevealComplete,
  onSessionComplete,
}: RevealSequenceProps) {
  const [phase, setPhase] = useState<RevealPhase>("transition");
  const [showBadge, setShowBadge] = useState(false);

  const classLabel = deriveClassLabel(scoreState.riasec);
  const emergingType = deriveEmergingTypeCode(scoreState.mbti);

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
    } else if (phase === "badge_unlock") {
      setPhase("comparison_hint");
    } else if (phase === "comparison_hint") {
      onSessionComplete();
    }
  }, [phase, onRevealComplete, onSessionComplete]);

  // Called after confirmatory round completes (from parent)
  const handlePostConfirmatory = useCallback(() => {
    setShowBadge(true);
    setPhase("badge_unlock");
  }, []);

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

  // Badge unlock overlay
  if (showBadge && phase === "badge_unlock") {
    return (
      <BadgeUnlock
        badgeName="Self-Discoverer"
        badgeIcon="magnifying-glass"
        onComplete={() => {
          setShowBadge(false);
          handleNext();
        }}
      />
    );
  }

  // Comparison hint
  if (phase === "comparison_hint") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md"
        >
          <span className="text-4xl mb-4 block">{"\u{1F4A1}"}</span>
          <p className="text-white/80 text-sm leading-relaxed mb-6">
            Your profile has been saved. The dashboard is where you can review
            your results anytime.
          </p>
          <button
            onClick={handleNext}
            className="rounded-xl bg-[var(--color-primary)] px-8 py-3 font-medium text-white shadow-[0_0_20px_var(--color-glow)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
            aria-label="Finish"
            tabIndex={0}
          >
            View Dashboard
          </button>
        </motion.div>
      </div>
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
            5 quick questions based on what we&apos;ve seen so far. Your charts
            will update live.
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
              <RiasecBars scores={scoreState.riasec} classLabel={classLabel} />
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
              <EmergingType typeCode={emergingType} descriptor="" />
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
```

### Step 20.2 — Commit Task 20

- [ ] Stage and commit:
```bash
git add components/quest/reveal-sequence.tsx
git commit -m "feat: add reveal sequence with staggered chart animations and badge unlock"
```
