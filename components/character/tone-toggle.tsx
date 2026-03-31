"use client";

import { motion } from "framer-motion";

export type Tone = "quest" | "explorer";

interface ToneToggleProps {
  value: Tone;
  onChange: (tone: Tone) => void;
}

export function ToneToggle({ value, onChange }: ToneToggleProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p
        style={{ color: "var(--cq-text-secondary)", fontSize: "0.875rem" }}
      >
        Choose your style
      </p>
      <div
        style={{
          display: "flex",
          background: "var(--cq-bg-input)",
          border: "1px solid var(--cq-border)",
          borderRadius: "9999px",
          padding: "4px",
          position: "relative",
        }}
        role="radiogroup"
        aria-label="Tone selection"
      >
        {/* Sliding background indicator */}
        <motion.div
          layout
          style={{
            position: "absolute",
            top: "4px",
            bottom: "4px",
            width: "calc(50% - 4px)",
            borderRadius: "9999px",
            background: "var(--cq-primary)",
            zIndex: 0,
          }}
          animate={{
            left: value === "quest" ? "4px" : "calc(50%)",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />

        <button
          role="radio"
          aria-checked={value === "quest"}
          aria-label="Quest Mode"
          onClick={() => onChange("quest")}
          style={{
            position: "relative",
            zIndex: 1,
            padding: "0.625rem 1.25rem",
            fontSize: "0.9375rem",
            fontWeight: 600,
            border: "none",
            background: "transparent",
            color: value === "quest" ? "white" : "var(--cq-text-muted)",
            cursor: "pointer",
            borderRadius: "9999px",
            minHeight: "44px",
            minWidth: "44px",
            transition: "color 0.2s ease",
            whiteSpace: "nowrap",
          }}
        >
          Quest Mode{" "}
          <span role="img" aria-hidden="true">
            🗡️
          </span>
        </button>

        <button
          role="radio"
          aria-checked={value === "explorer"}
          aria-label="Explorer Mode"
          onClick={() => onChange("explorer")}
          style={{
            position: "relative",
            zIndex: 1,
            padding: "0.625rem 1.25rem",
            fontSize: "0.9375rem",
            fontWeight: 600,
            border: "none",
            background: "transparent",
            color: value === "explorer" ? "white" : "var(--cq-text-muted)",
            cursor: "pointer",
            borderRadius: "9999px",
            minHeight: "44px",
            minWidth: "44px",
            transition: "color 0.2s ease",
            whiteSpace: "nowrap",
          }}
        >
          Explorer Mode{" "}
          <span role="img" aria-hidden="true">
            🧭
          </span>
        </button>
      </div>
    </div>
  );
}
