"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { educationSystems } from "@/data/education-systems";

interface EducationCardsProps {
  value: string | null;
  onChange: (value: string) => void;
}

export function EducationCards({ value, onChange }: EducationCardsProps) {
  const [otherText, setOtherText] = useState("");

  const handleSelect = (id: string) => {
    if (id === "other") {
      onChange(`other:${otherText}`);
    } else {
      onChange(id);
    }
  };

  const handleOtherTextChange = (text: string) => {
    setOtherText(text);
    if (value?.startsWith("other")) {
      onChange(`other:${text}`);
    }
  };

  const isOtherSelected = value?.startsWith("other") ?? false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <label
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--cq-text-primary)",
        }}
      >
        Education System
      </label>
      <p style={{ fontSize: "0.875rem", color: "var(--cq-text-secondary)" }}>
        What curriculum are you studying?
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "0.5rem",
        }}
        role="radiogroup"
        aria-label="Education system selection"
      >
        {educationSystems.map((system) => {
          const isSelected =
            system.id === "other" ? isOtherSelected : value === system.id;

          return (
            <motion.button
              key={system.id}
              onClick={() => handleSelect(system.id)}
              whileTap={{ scale: 0.97 }}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${system.flag} ${system.label}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.75rem 1rem",
                background: isSelected
                  ? "var(--cq-bg-card-hover)"
                  : "var(--cq-bg-card)",
                border: `1px solid ${isSelected ? "var(--cq-primary)" : "var(--cq-border)"}`,
                borderRadius: "var(--cq-radius)",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                boxShadow: isSelected ? "0 0 10px var(--cq-glow)" : "none",
                minHeight: "44px",
              }}
            >
              <span style={{ fontSize: "1.25rem" }} aria-hidden="true">
                {system.flag}
              </span>
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: isSelected
                    ? "var(--cq-text-primary)"
                    : "var(--cq-text-secondary)",
                }}
              >
                {system.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* "Other" free text input */}
      {isOtherSelected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <input
            type="text"
            placeholder="Enter your education system..."
            value={otherText}
            onChange={(e) => handleOtherTextChange(e.target.value)}
            className="cq-input"
            style={{ marginTop: "0.5rem" }}
            aria-label="Other education system"
            autoFocus
          />
        </motion.div>
      )}
    </div>
  );
}
