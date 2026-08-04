"use client";

import { motion } from "framer-motion";

interface ClassLabelProps {
  label: string;
}

export default function ClassLabel({ label }: ClassLabelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="inline-flex items-center"
    >
      {/* The student's class name is the single most meaningful string the
          reveal prints, and it was set in the palette primary on that
          primary's own 20% tint: 1.85:1 for a Wanderer, 2.90:1 at best. The
          accent is the same palette's second colour and clears 4.5:1 for
          every class, so the identity survives and the name is legible. */}
      <span className="rounded-[var(--border-radius)] bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 px-5 py-2 text-sm font-bold text-[var(--color-accent)] uppercase tracking-widest shadow-[0_0_20px_var(--color-glow)]">
        CLASS: {label}
      </span>
    </motion.div>
  );
}
