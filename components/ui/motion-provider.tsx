"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Honour the OS "reduce motion" setting across every Framer Motion animation
 * in the app.
 *
 * globals.css has had a `prefers-reduced-motion` block since the start, but it
 * can only reach CSS animations and transitions. Everything that actually moves
 * in Career Quest — the question card sliding in, the class name scaling up, the
 * badge pulsing, every chart bar growing — is driven by Framer in JavaScript,
 * and ran at full strength no matter what the student had asked for.
 *
 * `reducedMotion="user"` is the right level rather than "always" or nothing: it
 * disables *transform* animations (x, y, scale, rotate) and leaves opacity and
 * colour alone. Content still fades in, so the student still perceives that the
 * screen changed and no beat is skipped — it simply stops flying about. Screens
 * built out of staged delays collapse those delays separately; see
 * hooks/use-beat-delay.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
