"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface SpectrumSliderProps {
  value: number | null;
  onChange: (value: number) => void;
  leftLabel: string;
  rightLabel: string;
}

/**
 * Six positions, no midpoint (2026-08-03). The centre used to be a "Neutral"
 * option and became the default answer for anyone unsure, which told us
 * nothing. Same reasoning as the four-point rating scale in
 * lib/scoring/likert.ts. Scoring is unaffected: the range is still -3..+3.
 */
const POSITIONS = [-3, -2, -1, 1, 2, 3];

/** Word shown inside each segment. Short enough for six across a phone. */
const DEGREE_SHORT: Record<number, string> = {
  1: "A bit",
  2: "Some",
  3: "A lot",
};

const DEGREE_SPOKEN: Record<number, string> = {
  1: "slightly",
  2: "moderately",
  3: "strongly",
};

/** Accessible name for a spectrum position. */
function positionLabel(pos: number, leftLabel: string, rightLabel: string): string {
  const side = pos < 0 ? leftLabel : rightLabel;
  return `${side} — ${DEGREE_SPOKEN[Math.abs(pos)]}`;
}

/**
 * Single-control spectrum input (P2.4): one radiogroup of 7 full-width
 * segments tiling the track. Tap/click commits a position; arrow keys move
 * a provisional focus and Enter/Space commits it. Replaces the previous
 * triple interaction surface (clickable track + 7 in-track buttons + 7
 * fallback buttons) that screen readers announced as 14 controls.
 */
export default function SpectrumSlider({
  value,
  onChange,
  leftLabel,
  rightLabel,
}: SpectrumSliderProps) {
  // Roving tabindex over POSITIONS by index. Index-based, not arithmetic on
  // the value: with the midpoint gone, `pos - 1` from 1 would land on 0, which
  // is no longer a position.
  const initialIndex = Math.max(0, POSITIONS.indexOf(value ?? NaN));
  const [focusedIndex, setFocusedIndex] = useState<number>(initialIndex);
  const focusedPos = POSITIONS[focusedIndex];
  const segmentRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const moveFocus = useCallback((nextIndex: number): void => {
    const clamped = Math.max(0, Math.min(POSITIONS.length - 1, nextIndex));
    setFocusedIndex(clamped);
    segmentRefs.current.get(POSITIONS[clamped])?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          e.preventDefault();
          moveFocus(focusedIndex - 1);
          break;
        case "ArrowRight":
        case "ArrowUp":
          e.preventDefault();
          moveFocus(focusedIndex + 1);
          break;
        case "Home":
          e.preventDefault();
          moveFocus(0);
          break;
        case "End":
          e.preventDefault();
          moveFocus(POSITIONS.length - 1);
          break;
        case "Enter":
        case " ":
          // preventDefault suppresses the native button click so the
          // answer is committed exactly once.
          e.preventDefault();
          onChange(focusedPos);
          break;
      }
    },
    [focusedIndex, focusedPos, moveFocus, onChange]
  );

  // Centre of the selected segment, so the thumb lines up with the word.
  const selectedIndex = value !== null ? POSITIONS.indexOf(value) : -1;
  const thumbPct =
    selectedIndex >= 0 ? ((selectedIndex + 0.5) / POSITIONS.length) * 100 : 50;

  return (
    <div className="w-full">
      {/* Pole labels */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <p className="text-sm text-white/70 text-left max-w-[40%]">{leftLabel}</p>
        <p className="text-sm text-white/70 text-right max-w-[40%]">{rightLabel}</p>
      </div>

      {/* Track: one radiogroup of 7 segments, no other interaction surface */}
      <div
        role="radiogroup"
        aria-label={`${leftLabel} to ${rightLabel}`}
        onKeyDown={handleKeyDown}
        className="relative flex items-center rounded-full bg-white/10 p-1 h-14"
      >
        {/* Committed-value thumb (visual only) */}
        {value !== null && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-primary)] shadow-[0_0_20px_var(--color-glow)]"
            animate={{ left: `${thumbPct}%` }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}

        {POSITIONS.map((pos) => {
          const isSelected = value === pos;
          return (
            <button
              key={pos}
              ref={(el) => {
                if (el) {
                  segmentRefs.current.set(pos, el);
                } else {
                  segmentRefs.current.delete(pos);
                }
              }}
              role="radio"
              aria-checked={isSelected}
              aria-label={positionLabel(pos, leftLabel, rightLabel)}
              tabIndex={pos === focusedPos ? 0 : -1}
              onClick={() => {
                setFocusedIndex(POSITIONS.indexOf(pos));
                onChange(pos);
              }}
              onFocus={() => setFocusedIndex(POSITIONS.indexOf(pos))}
              className={`relative z-10 flex h-12 min-w-0 flex-1 items-center justify-center rounded-full text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                isSelected ? "text-white" : "text-white/55 hover:text-white/85"
              }`}
            >
              {/* A readable word, not a dot. Students could not tell whether
                  the old dots were tappable or whether the track had to be
                  dragged, and went back to change answers they had not
                  meant to give. */}
              <span aria-hidden="true">{DEGREE_SHORT[Math.abs(pos)]}</span>
            </button>
          );
        })}
      </div>

      {/* Say what to do. Without this the control read as a drag-handle. */}
      <p className="text-xs text-white/65 text-center mt-3">
        Tap the option that fits you best
      </p>
    </div>
  );
}
