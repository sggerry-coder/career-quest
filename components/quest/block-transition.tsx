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
