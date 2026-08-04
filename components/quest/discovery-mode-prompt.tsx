"use client";

import { motion } from "framer-motion";

interface DiscoveryModePromptProps {
  /**
   * The student's class name, or null while they are still a Wanderer.
   * Discovery mode triggers on indecision in the interest block, before any
   * student has been named, so the name-less wording is the normal one --
   * "Let's try a different approach, Still forming." was not a sentence.
   */
  characterName: string | null;
  tone: "quest" | "explorer";
  onContinue: () => void;
}

function bodyText(
  characterName: string | null,
  tone: "quest" | "explorer"
): string {
  if (tone === "explorer") {
    const opening = characterName
      ? `Let's try this a different way, ${characterName}.`
      : "Let's try this a different way.";
    return `${opening} Instead of rating activities, you'll choose between two options — no middle ground.`;
  }
  const opening = characterName
    ? `Let's try a different approach, ${characterName}.`
    : "Let's try a different approach.";
  return `${opening} Instead of rating activities, you'll pick between two options. No sitting on the fence!`;
}

export default function DiscoveryModePrompt({
  characterName,
  tone,
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
          {tone === "quest" ? "Tough to decide?" : "Hard to choose?"}
        </h2>
        <p className="text-sm text-white/70 leading-relaxed">
          {bodyText(characterName, tone)}
        </p>
        <button
          onClick={onContinue}
          className="rounded-xl bg-[var(--color-primary)] px-8 py-3 font-medium text-white shadow-[0_0_20px_var(--color-glow)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
          aria-label="Continue with discovery mode"
          tabIndex={0}
        >
          {tone === "quest" ? "Let's try it!" : "Sounds good"}
        </button>
      </motion.div>
    </div>
  );
}
