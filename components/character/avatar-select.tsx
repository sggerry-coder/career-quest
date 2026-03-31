"use client";

import { motion } from "framer-motion";
import type { Tone } from "./tone-toggle";
import { classes, type ClassDefinition } from "@/data/classes";

interface AvatarSelectProps {
  selectedClass: string | null;
  onSelect: (classId: string) => void;
  tone: Tone;
}

const themeGroups: { theme: ClassDefinition["theme"]; label: string }[] = [
  { theme: "purple-teal", label: "Shadow Court" },
  { theme: "magenta-violet", label: "Crimson Order" },
  { theme: "blue-indigo", label: "Azure Path" },
];

const themeColors: Record<
  ClassDefinition["theme"],
  { primary: string; glow: string }
> = {
  "purple-teal": { primary: "#8b5cf6", glow: "rgba(139,92,246,0.5)" },
  "magenta-violet": { primary: "#ec4899", glow: "rgba(236,72,153,0.4)" },
  "blue-indigo": { primary: "#3b82f6", glow: "rgba(59,130,246,0.4)" },
};

const themeRadius: Record<ClassDefinition["theme"], string> = {
  "purple-teal": "6px",
  "magenta-violet": "16px",
  "blue-indigo": "12px",
};

export function AvatarSelect({
  selectedClass,
  onSelect,
  tone,
}: AvatarSelectProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        width: "100%",
        maxWidth: "640px",
        margin: "0 auto",
      }}
    >
      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "var(--cq-text-primary)",
          textAlign: "center",
        }}
      >
        {tone === "quest" ? "Choose Your Class" : "Choose Your Role"}
      </h2>

      {themeGroups.map((group) => {
        const groupClasses = classes.filter((c) => c.theme === group.theme);
        if (groupClasses.length === 0) return null;

        return (
          <div key={group.theme}>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: themeColors[group.theme].primary,
                marginBottom: "0.75rem",
              }}
            >
              {group.label}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  groupClasses.length === 1
                    ? "1fr"
                    : "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {groupClasses.map((cls) => {
                const isSelected = selectedClass === cls.id;
                const colors = themeColors[cls.theme];
                const radius = themeRadius[cls.theme];

                return (
                  <motion.button
                    key={cls.id}
                    onClick={() => onSelect(cls.id)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    aria-label={`Select ${cls.name[tone]} class`}
                    aria-pressed={isSelected}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "1.25rem 1rem",
                      background: isSelected
                        ? `linear-gradient(135deg, ${colors.primary}22, ${colors.primary}11)`
                        : "var(--cq-bg-card)",
                      border: `2px solid ${isSelected ? colors.primary : "var(--cq-border)"}`,
                      borderRadius: radius,
                      cursor: "pointer",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                      boxShadow: isSelected
                        ? `0 0 20px ${colors.glow}, 0 0 40px ${colors.glow}`
                        : "none",
                      minHeight: "44px",
                      minWidth: "44px",
                    }}
                  >
                    <span
                      style={{ fontSize: "2rem" }}
                      role="img"
                      aria-hidden="true"
                    >
                      {cls.icon}
                    </span>
                    <span
                      style={{
                        fontSize: "0.9375rem",
                        fontWeight: 600,
                        color: isSelected
                          ? colors.primary
                          : "var(--cq-text-primary)",
                      }}
                    >
                      {cls.name[tone]}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--cq-text-muted)",
                        textAlign: "center",
                      }}
                    >
                      {cls.tagline[tone]}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
