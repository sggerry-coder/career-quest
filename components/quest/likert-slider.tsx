"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { LIKERT_POINTS, LIKERT_MIN, LIKERT_MAX } from "@/lib/scoring/likert";

interface LikertSliderProps {
  value: number | null;
  onChange: (value: number) => void;
}

// Four points, no midpoint — see lib/scoring/likert.ts for why.
const POINTS = LIKERT_POINTS;

/**
 * Accessible name for a rating point.
 *
 * The digit is what the student sees inside the button, so it has to survive
 * into the accessible name (WCAG 2.5.3): an `aria-label` of "Strongly Dislike"
 * over a visible "1" leaves a voice-control user with nothing to say, and tells
 * a screen-reader user something the screen does not.
 */
function pointLabel(value: number, label: string): string {
  return `${value} — ${label}`;
}

/**
 * The rating scale, as one radiogroup.
 *
 * It carried role="radiogroup" and role="radio" from the start but behaved like
 * four separate buttons: tabIndex={0} on every point, so Tab walked through all
 * four, and no key handler, so the arrow keys a radiogroup is *defined* by did
 * nothing. Same roving-tabindex model as SpectrumSlider (P2.4), down to the key
 * list — a student meets both controls in one session and should not have to
 * learn the scale twice.
 */
export default function LikertSlider({ value, onChange }: LikertSliderProps) {
  // Roving tabindex by index into POINTS, not by rating value: the two agree
  // today only because the scale happens to start at 1.
  const initialIndex = Math.max(
    0,
    POINTS.findIndex((p) => p.value === value)
  );
  const [focusedIndex, setFocusedIndex] = useState<number>(initialIndex);
  const focusedValue = POINTS[focusedIndex].value;
  const pointRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const moveFocus = useCallback((nextIndex: number): void => {
    const clamped = Math.max(0, Math.min(POINTS.length - 1, nextIndex));
    setFocusedIndex(clamped);
    pointRefs.current.get(POINTS[clamped].value)?.focus();
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
          moveFocus(POINTS.length - 1);
          break;
        case "Enter":
        case " ":
          // preventDefault suppresses the native button click so the answer
          // is committed exactly once.
          e.preventDefault();
          onChange(focusedValue);
          break;
      }
    },
    [focusedIndex, focusedValue, moveFocus, onChange]
  );

  return (
    <div
      className="w-full"
      role="radiogroup"
      aria-label={`Rate on a scale of ${LIKERT_MIN} to ${LIKERT_MAX}`}
      onKeyDown={handleKeyDown}
    >
      {/* Emoji row: decoration for the point beneath it, which already carries
          the wording in its accessible name. Announced, it was four unlabelled
          face emoji between the question and the answers. */}
      <div
        className="flex items-center justify-between mb-3 px-1"
        aria-hidden="true"
      >
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
        {POINTS.map((point, index) => {
          const isSelected = value === point.value;
          return (
            <button
              key={point.value}
              ref={(el) => {
                if (el) {
                  pointRefs.current.set(point.value, el);
                } else {
                  pointRefs.current.delete(point.value);
                }
              }}
              onClick={() => {
                setFocusedIndex(index);
                onChange(point.value);
              }}
              onFocus={() => setFocusedIndex(index)}
              role="radio"
              aria-checked={isSelected}
              aria-label={pointLabel(point.value, point.label)}
              tabIndex={point.value === focusedValue ? 0 : -1}
              className={`relative z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                isSelected
                  ? "bg-[var(--color-primary)] text-white shadow-[0_0_16px_var(--color-glow)]"
                  : "text-white/65 hover:bg-white/10"
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
        <span className="text-xs text-white/65">Strongly Dislike</span>
        <span className="text-xs text-white/65">Strongly Like</span>
      </div>
    </div>
  );
}
