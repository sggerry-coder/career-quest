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
      <span className="rounded-[var(--border-radius)] bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 px-5 py-2 text-sm font-bold text-[var(--color-primary)] uppercase tracking-widest shadow-[0_0_20px_var(--color-glow)]">
        CLASS: {label}
      </span>
    </motion.div>
  );
}
