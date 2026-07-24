"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface SpectrumSliderProps {
  value: number | null;
  onChange: (value: number) => void;
  leftLabel: string;
  rightLabel: string;
}

const POSITIONS = [-3, -2, -1, 0, 1, 2, 3];
const MIN_POS = -3;
const MAX_POS = 3;

const DEGREE: Record<number, string> = {
  1: "slightly",
  2: "moderately",
  3: "strongly",
};

/** Accessible name for a spectrum position. */
function positionLabel(pos: number, leftLabel: string, rightLabel: string): string {
  if (pos === 0) return "Neutral";
  const side = pos < 0 ? leftLabel : rightLabel;
  return `${side} — ${DEGREE[Math.abs(pos)]}`;
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
  // Roving tabindex: the focused segment is provisional until committed.
  const [focusedPos, setFocusedPos] = useState<number>(value ?? 0);
  const segmentRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const moveFocus = useCallback((next: number): void => {
    const clamped = Math.max(MIN_POS, Math.min(MAX_POS, next));
    setFocusedPos(clamped);
    segmentRefs.current.get(clamped)?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          e.preventDefault();
          moveFocus(focusedPos - 1);
          break;
        case "ArrowRight":
        case "ArrowUp":
          e.preventDefault();
          moveFocus(focusedPos + 1);
          break;
        case "Home":
          e.preventDefault();
          moveFocus(MIN_POS);
          break;
        case "End":
          e.preventDefault();
          moveFocus(MAX_POS);
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
    [focusedPos, moveFocus, onChange]
  );

  const thumbPct = value !== null ? ((value + 3) / 6) * 100 : 50;

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
                setFocusedPos(pos);
                onChange(pos);
              }}
              onFocus={() => setFocusedPos(pos)}
              className={`relative z-10 flex h-12 min-w-0 flex-1 items-center justify-center rounded-full text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                isSelected
                  ? "text-white"
                  : pos === 0
                    ? "text-white/40 hover:text-white/60"
                    : "text-white/20 hover:text-white/50"
              }`}
            >
              <span aria-hidden="true">
                {pos === 0 ? "•" : "·"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Degree hints */}
      <div className="flex items-center justify-between mt-2 px-2">
        <span className="text-xs text-white/40">Strongly</span>
        <span className="text-xs text-white/40">Neutral</span>
        <span className="text-xs text-white/40">Strongly</span>
      </div>
    </div>
  );
}
