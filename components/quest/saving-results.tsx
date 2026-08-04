"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useScreenChange } from "@/hooks/use-screen-change";

interface SavingResultsProps {
  tone: "quest" | "explorer";
}

/**
 * Shown between the last question and the celebration, while the final save
 * is in flight.
 *
 * Usually invisible: the save fires on entry to the complete phase, in
 * parallel with the badge-unlock overlay, so a quick save finishes before the
 * badge animation ends. If a student sees this screen, the save is genuinely
 * slow — which is exactly when they should be told something is happening
 * rather than shown a celebration that might be about to be withdrawn.
 */
export default function SavingResults({
  tone,
}: SavingResultsProps): React.JSX.Element {
  const heading =
    tone === "quest" ? "Sealing your results…" : "Saving your results…";
  const headingRef = useScreenChange<HTMLHeadingElement>(heading);
  const prefersReduced = useReducedMotion();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-4">
      <motion.div
        className="h-10 w-10 rounded-full border-2 border-white/20 border-t-[var(--cq-primary,#8b5cf6)]"
        /* Reduced, not removed. MotionConfig would freeze the rotation and
           leave a ring that looks like a crashed page; a slow fade still says
           "working" without anything spinning. */
        animate={
          prefersReduced ? { opacity: [0.4, 1, 0.4] } : { rotate: 360 }
        }
        transition={
          prefersReduced
            ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.9, repeat: Infinity, ease: "linear" }
        }
        aria-hidden="true"
      />
      <h1
        ref={headingRef}
        className="text-base font-medium text-white/80 text-center focus:outline-none"
      >
        {heading}
      </h1>
      <p className="text-xs text-white/65 text-center max-w-xs">
        Hang on a moment &mdash; don&apos;t close this page.
      </p>
    </div>
  );
}
