"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useScreenChange } from "@/hooks/use-screen-change";

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
  // The overlay is the whole screen while it is up, and it replaces the last
  // question. Without this the student is left focused on a removed button.
  const overlayRef = useScreenChange<HTMLDivElement>(badgeName);

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
          ref={overlayRef}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm focus:outline-none"
          onClick={() => setVisible(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setVisible(false);
          }}
          role="button"
          tabIndex={0}
          /* No aria-label: it read "Badge unlocked. Press to continue" and
             replaced the contents as the accessible name, so the badge the
             student had just earned was never said. Named by its contents, it
             announces the badge and how to dismiss it. */
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
            {/* The overlay was always dismissable by tap or key and never said
                so. It is also the accessible name's second half now. */}
            <p className="mt-3 text-xs text-white/55">Tap to continue</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
