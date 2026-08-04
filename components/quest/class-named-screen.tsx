"use client";

import { motion } from "framer-motion";
import {
  CHARACTER_CLASSES,
  characterClassDisplayName,
  type DerivedClass,
} from "@/lib/character/classes";
import { classDefinitions } from "@/lib/theme";
import { useScreenChange } from "@/hooks/use-screen-change";
import { useBeatDelay } from "@/hooks/use-beat-delay";

interface ClassNamedScreenProps {
  derived: DerivedClass;
  tone: "quest" | "explorer";
  onContinue: () => void;
}

/**
 * The moment the student becomes someone.
 *
 * Before this existed, the app's colours simply changed behind a generic
 * interstitial and the student's first sight of their class name was a
 * passing "Nice progress, Warsmith!" — a name they had never been given.
 * The per-class taglines were written and rendered nowhere.
 */
export default function ClassNamedScreen({
  derived,
  tone,
  onContinue,
}: ClassNamedScreenProps): React.JSX.Element {
  const name = characterClassDisplayName(derived, tone);
  // The naming moment replaces the question the student just answered.
  const headingRef = useScreenChange<HTMLHeadingElement>(name);
  // Continue used to fade in 1.1s after the screen arrived -- invisible and
  // still focusable for that whole second. Under reduced motion it is there.
  const { delay, from } = useBeatDelay();
  const def = classDefinitions.find((c) => c.id === derived.primary);
  const tagline = def?.tagline[tone] ?? "";
  const icon = CHARACTER_CLASSES[derived.primary].icon;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <motion.span
        className="text-6xl"
        initial={from({ scale: 0.6, opacity: 0 })}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        aria-hidden="true"
      >
        {icon}
      </motion.span>

      <motion.h1
        initial={from({ opacity: 0, y: 16 })}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: delay(0.3) }}
        ref={headingRef}
        className="text-2xl font-semibold text-white focus:outline-none"
      >
        {tone === "quest" ? `You are a ${name}.` : `Your profile: ${name}`}
      </motion.h1>

      <motion.p
        initial={from({ opacity: 0 })}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: delay(0.7) }}
        className="text-sm text-white/70 max-w-xs italic"
      >
        {tagline}
      </motion.p>

      <motion.button
        initial={from({ opacity: 0 })}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: delay(1.1) }}
        onClick={onContinue}
        className="rounded-xl bg-[var(--cq-primary,#8b5cf6)] px-8 py-3 font-semibold text-white shadow-[0_0_20px_var(--cq-glow,rgba(139,92,246,0.3))] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
      >
        {tone === "quest" ? "Continue the quest" : "Continue"}
      </motion.button>
    </div>
  );
}
