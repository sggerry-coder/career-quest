"use client";

import { motion } from "framer-motion";

interface CuriositiesPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
}

const curiosityOptions = [
  { id: "health_medicine", label: "Health & Medicine", icon: "🏥" },
  { id: "tech_engineering", label: "Technology & Engineering", icon: "💻" },
  { id: "creative_arts", label: "Creative Arts & Design", icon: "🎨" },
  { id: "business_finance", label: "Business & Finance", icon: "💼" },
  { id: "science_research", label: "Science & Research", icon: "🔬" },
  { id: "education_social", label: "Education & Social Work", icon: "📚" },
  { id: "law_government", label: "Law & Government", icon: "⚖️" },
  { id: "media_communication", label: "Media & Communication", icon: "📺" },
  { id: "environment_nature", label: "Environment & Nature", icon: "🌿" },
  { id: "sports_fitness", label: "Sports & Fitness", icon: "⚽" },
  { id: "trades_construction", label: "Trades & Construction", icon: "🔨" },
];

const DONT_KNOW_ID = "dont_know";
const MAX_SELECTIONS = 3;

export function CuriositiesPicker({
  value,
  onChange,
}: CuriositiesPickerProps) {
  const isDontKnow = value.includes(DONT_KNOW_ID);

  const toggleCuriosity = (id: string) => {
    if (id === DONT_KNOW_ID) {
      // "Don't know" is mutually exclusive
      onChange(isDontKnow ? [] : [DONT_KNOW_ID]);
      return;
    }

    // Selecting a curiosity deselects "Don't know"
    const withoutDontKnow = value.filter((v) => v !== DONT_KNOW_ID);

    if (withoutDontKnow.includes(id)) {
      onChange(withoutDontKnow.filter((v) => v !== id));
    } else if (withoutDontKnow.length < MAX_SELECTIONS) {
      onChange([...withoutDontKnow, id]);
    }
    // If already at max, do nothing (ignore tap)
  };

  const remainingPicks = MAX_SELECTIONS - value.filter((v) => v !== DONT_KNOW_ID).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <label
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--cq-text-primary)",
        }}
      >
        Career Curiosities
      </label>
      <p style={{ fontSize: "0.875rem", color: "var(--cq-text-secondary)" }}>
        Any areas that spark your interest? Pick up to {MAX_SELECTIONS}.
        {!isDontKnow && remainingPicks > 0 && remainingPicks < MAX_SELECTIONS && (
          <span style={{ color: "var(--cq-accent)" }}>
            {" "}
            ({remainingPicks} remaining)
          </span>
        )}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
        role="group"
        aria-label="Career curiosities selection"
      >
        {curiosityOptions.map((option) => {
          const isSelected = value.includes(option.id);
          const isDisabled =
            !isSelected && !isDontKnow && remainingPicks === 0;

          return (
            <motion.button
              key={option.id}
              onClick={() => !isDisabled && toggleCuriosity(option.id)}
              whileTap={isDisabled ? undefined : { scale: 0.95 }}
              role="checkbox"
              aria-checked={isSelected}
              aria-disabled={isDisabled}
              aria-label={option.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                border: `1px solid ${isSelected ? "var(--cq-primary)" : "var(--cq-border)"}`,
                borderRadius: "9999px",
                background: isSelected
                  ? "var(--cq-primary)"
                  : isDontKnow || isDisabled
                    ? "var(--cq-bg-input)"
                    : "var(--cq-bg-card)",
                color: isSelected
                  ? "white"
                  : isDisabled || isDontKnow
                    ? "var(--cq-text-muted)"
                    : "var(--cq-text-secondary)",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled || (isDontKnow && !isSelected) ? 0.5 : 1,
                transition: "all 0.2s ease",
                boxShadow: isSelected ? "0 0 10px var(--cq-glow)" : "none",
                minHeight: "44px",
                userSelect: "none",
              }}
            >
              <span aria-hidden="true">{option.icon}</span>
              {option.label}
            </motion.button>
          );
        })}

        {/* Don't know yet — mutually exclusive */}
        <motion.button
          onClick={() => toggleCuriosity(DONT_KNOW_ID)}
          whileTap={{ scale: 0.95 }}
          role="checkbox"
          aria-checked={isDontKnow}
          aria-label="Don't know yet"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            border: `1px solid ${isDontKnow ? "var(--cq-accent)" : "var(--cq-border)"}`,
            borderRadius: "9999px",
            background: isDontKnow ? "var(--cq-accent)" : "var(--cq-bg-card)",
            color: isDontKnow ? "white" : "var(--cq-text-secondary)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: isDontKnow
              ? "0 0 10px var(--cq-glow-accent)"
              : "none",
            minHeight: "44px",
            userSelect: "none",
          }}
        >
          <span aria-hidden="true">🤷</span>
          Don&apos;t know yet
        </motion.button>
      </div>
    </div>
  );
}
