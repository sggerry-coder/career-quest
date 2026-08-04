"use client";

import { useCallback, useMemo } from "react";
import { useReducedMotion } from "framer-motion";

export interface BeatTiming {
  /** A staged delay, or 0 for a student who asked for less motion. */
  delay: (seconds: number) => number;
  /**
   * The `initial` prop for a staged element: the state it enters from, or
   * `false` — Framer's "just render the target" — under reduced motion.
   */
  from: <T>(state: T) => T | false;
}

/**
 * Timing for screens built out of staged beats.
 *
 * MotionConfig's `reducedMotion="user"` stops things moving, but it cannot know
 * that a 1.1s delay before the Continue button fades in is theatre rather than
 * timing. The naming moment, the celebration and the interstitials are built out
 * of those delays, and left alone a student who asked for less motion still sits
 * through the whole performance — and for that second and a bit the button they
 * need is invisible while remaining focusable and clickable, which is the same
 * defect as the landing page's zero-opacity CTA, just briefer.
 *
 * Reduced, not removed: every beat is still rendered, in the same order, with
 * the same content. They simply all arrive at once.
 */
export function useBeatDelay(): BeatTiming {
  const prefersReduced = useReducedMotion();

  const delay = useCallback(
    (seconds: number): number => (prefersReduced ? 0 : seconds),
    [prefersReduced]
  );

  const from = useCallback(
    <T,>(state: T): T | false => (prefersReduced ? false : state),
    [prefersReduced]
  );

  return useMemo(() => ({ delay, from }), [delay, from]);
}
