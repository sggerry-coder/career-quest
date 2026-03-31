"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { destinations } from "@/data/destinations";

interface DestinationPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function DestinationPicker({ value, onChange }: DestinationPickerProps) {
  const [otherText, setOtherText] = useState("");

  const toggleDestination = (id: string) => {
    // "not_sure" is mutually exclusive with other selections
    if (id === "not_sure") {
      onChange(value.includes("not_sure") ? [] : ["not_sure"]);
      return;
    }

    // Selecting a country deselects "not_sure"
    const withoutNotSure = value.filter((v) => v !== "not_sure");

    if (withoutNotSure.includes(id)) {
      onChange(withoutNotSure.filter((v) => v !== id));
    } else {
      onChange([...withoutNotSure, id]);
    }
  };

  const handleOtherToggle = () => {
    const withoutNotSure = value.filter((v) => v !== "not_sure");
    if (withoutNotSure.some((v) => v.startsWith("other:"))) {
      onChange(withoutNotSure.filter((v) => !v.startsWith("other:")));
    } else {
      onChange([...withoutNotSure, `other:${otherText}`]);
    }
  };

  const handleOtherTextChange = (text: string) => {
    setOtherText(text);
    const updated = value
      .filter((v) => !v.startsWith("other:"))
      .concat([`other:${text}`]);
    onChange(updated);
  };

  const isOtherSelected = value.some((v) => v.startsWith("other:"));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <label
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--cq-text-primary)",
        }}
      >
        Study Destinations
      </label>
      <p style={{ fontSize: "0.875rem", color: "var(--cq-text-secondary)" }}>
        Any countries in mind for university? Pick as many as you like.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "0.5rem",
        }}
        role="group"
        aria-label="Study destination selection"
      >
        {destinations.map((dest) => {
          const isSelected =
            dest.id === "not_sure"
              ? value.includes("not_sure")
              : value.includes(dest.id);

          return (
            <motion.button
              key={dest.id}
              onClick={() => toggleDestination(dest.id)}
              whileTap={{ scale: 0.97 }}
              role="checkbox"
              aria-checked={isSelected}
              aria-label={`${dest.flag} ${dest.label}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
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
                {dest.flag}
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
                {dest.label}
              </span>
            </motion.button>
          );
        })}

        {/* Other option */}
        <motion.button
          onClick={handleOtherToggle}
          whileTap={{ scale: 0.97 }}
          role="checkbox"
          aria-checked={isOtherSelected}
          aria-label="Other destination"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            background: isOtherSelected
              ? "var(--cq-bg-card-hover)"
              : "var(--cq-bg-card)",
            border: `1px solid ${isOtherSelected ? "var(--cq-primary)" : "var(--cq-border)"}`,
            borderRadius: "var(--cq-radius)",
            cursor: "pointer",
            textAlign: "left",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            boxShadow: isOtherSelected ? "0 0 10px var(--cq-glow)" : "none",
            minHeight: "44px",
          }}
        >
          <span style={{ fontSize: "1.25rem" }} aria-hidden="true">
            🌍
          </span>
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: isOtherSelected
                ? "var(--cq-text-primary)"
                : "var(--cq-text-secondary)",
            }}
          >
            Other
          </span>
        </motion.button>
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
            placeholder="Enter country or region..."
            value={otherText}
            onChange={(e) => handleOtherTextChange(e.target.value)}
            className="cq-input"
            style={{ marginTop: "0.5rem" }}
            aria-label="Other destination country"
            autoFocus
          />
        </motion.div>
      )}
    </div>
  );
}
