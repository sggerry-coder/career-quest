"use client";

import { motion } from "framer-motion";

interface PersistenceBannerProps {
  errorType: "network" | "auth" | "unknown";
  onRetry: () => void;
  onSignIn: () => void;
  visible: boolean;
}

export default function PersistenceBanner({
  errorType,
  onRetry,
  onSignIn,
  visible,
}: PersistenceBannerProps): React.JSX.Element {
  const isAuth = errorType === "auth";

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: visible ? 0 : 100, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed bottom-4 left-4 right-4 z-50"
      role="alert"
      aria-live="assertive"
    >
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{
          background: "rgba(239, 68, 68, 0.15)",
          borderLeft: "3px solid #ef4444",
          minHeight: "56px",
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/90">
            {"Couldn\u2019t save your progress"}
          </p>
          <p className="text-xs text-white/60 mt-0.5">
            {isAuth
              ? "Your session expired. Please sign in again."
              : "Check your connection and try again."}
          </p>
        </div>
        {isAuth ? (
          <button
            onClick={onSignIn}
            className="shrink-0 rounded-lg bg-[var(--cq-primary,#8b5cf6)] px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[36px]"
            aria-label="Sign In"
          >
            Sign In
          </button>
        ) : (
          <button
            onClick={onRetry}
            className="shrink-0 rounded-lg bg-[var(--cq-primary,#8b5cf6)] px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[36px]"
            aria-label="Retry"
          >
            Retry
          </button>
        )}
      </div>
    </motion.div>
  );
}
