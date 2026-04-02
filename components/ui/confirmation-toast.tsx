"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

interface ConfirmationToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
}

export default function ConfirmationToast({
  message,
  visible,
  onDismiss,
}: ConfirmationToastProps): React.JSX.Element {
  // Auto-dismiss after 2 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 2000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: visible ? 0 : 40, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[51]"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-2.5"
        style={{
          background: "rgba(34, 197, 94, 0.15)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="7" stroke="#22c55e" strokeWidth="1.5" />
          <path
            d="M5 8l2 2 4-4"
            stroke="#22c55e"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm text-white/80">{message}</span>
      </div>
    </motion.div>
  );
}
