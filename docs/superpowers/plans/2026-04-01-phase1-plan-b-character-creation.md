# Phase 1 Plan B: Character Creation + Landing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the landing page (returning vs new student detection, animated intro) and the full character creation wizard (tone toggle, avatar selection, identity, destinations, curiosities, Supabase auth + persistence, navigation to Session 1).

**Architecture:** Client-side React components using CSS custom properties for the 3-theme RPG system. The character creation page is a multi-step wizard using React state and Framer Motion transitions. On "Begin Quest," the app creates an anonymous Supabase auth user, inserts student + assessment_scores + achievement rows, then navigates to `/quest/session/1`. The landing page server-renders with Supabase session detection.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Framer Motion 12, Supabase (anonymous auth + row inserts), CSS custom properties for theme system

---

## Prerequisites

This plan depends on **Plan A** being complete. Plan A creates:
- `lib/theme.ts` — theme definitions, class definitions, CSS variable maps
- `data/classes.ts` — 7 class definitions with quest/explorer names, icons, taglines, narrations
- `data/education-systems.ts` — education system options with flags
- `data/destinations.ts` — destination country options with flags
- `components/ui/theme-provider.tsx` — ThemeProvider component that sets `data-theme` attribute and CSS custom properties
- Updated `lib/types/student.ts` — with `avatar_class`, `tone`, `self_map`, `preferred_destinations` fields
- `supabase/migrations/00002_phase1_additions.sql` — schema changes

The plan also assumes these data files exist with the following shapes (created in Plan A):

```typescript
// data/classes.ts
export interface ClassDefinition {
  id: string;
  name: { quest: string; explorer: string };
  icon: string;
  theme: "purple-teal" | "magenta-violet" | "blue-indigo";
  group: string;
  tagline: { quest: string; explorer: string };
}
export const classes: ClassDefinition[];

// data/education-systems.ts
export interface EducationSystem {
  id: string;
  label: string;
  country: string;
  flag: string;
}
export const educationSystems: EducationSystem[];

// data/destinations.ts
export interface Destination {
  id: string;
  label: string;
  flag: string;
}
export const destinations: Destination[];
```

---

## Task 1: Global CSS — Dark RPG Theme Base

**Files:** Modify `app/globals.css`

- [ ] **Step 1.1: Rewrite `app/globals.css` with dark RPG theme and all 3 theme variants**

Overwrite the entire file:

**File: `app/globals.css`**
```css
@import "tailwindcss";

/* ============================================
   Career Quest — Dark RPG Theme System
   ============================================ */

/* --- Base theme (default: purple-teal / Shadow Court) --- */
:root {
  --cq-bg-primary: #0f0a1e;
  --cq-bg-secondary: #1a1035;
  --cq-bg-card: #1e1440;
  --cq-bg-card-hover: #261a50;
  --cq-bg-input: #160f30;
  --cq-text-primary: #f0eef5;
  --cq-text-secondary: #a89ec8;
  --cq-text-muted: #6b5f8a;
  --cq-border: #2d2255;
  --cq-border-focus: #8b5cf6;

  /* Theme-specific (default = purple-teal) */
  --cq-primary: #8b5cf6;
  --cq-accent: #2dd4bf;
  --cq-glow: rgba(139, 92, 246, 0.5);
  --cq-glow-accent: rgba(45, 212, 191, 0.4);
  --cq-radius: 6px;

  /* Functional */
  --cq-error: #ef4444;
  --cq-error-bg: rgba(239, 68, 68, 0.15);
  --cq-success: #22c55e;
  --cq-success-bg: rgba(34, 197, 94, 0.15);

  /* Spacing */
  --cq-card-padding: 1.5rem;
  --cq-gap: 1rem;
}

/* --- Theme: purple-teal (Shadow Court) --- */
[data-theme="purple-teal"] {
  --cq-primary: #8b5cf6;
  --cq-accent: #2dd4bf;
  --cq-glow: rgba(139, 92, 246, 0.5);
  --cq-glow-accent: rgba(45, 212, 191, 0.4);
  --cq-radius: 6px;
}

/* --- Theme: magenta-violet (Crimson Order) --- */
[data-theme="magenta-violet"] {
  --cq-primary: #ec4899;
  --cq-accent: #f0abfc;
  --cq-glow: rgba(236, 72, 153, 0.4);
  --cq-glow-accent: rgba(240, 171, 252, 0.3);
  --cq-radius: 16px;
}

/* --- Theme: blue-indigo (Azure Path) --- */
[data-theme="blue-indigo"] {
  --cq-primary: #3b82f6;
  --cq-accent: #38bdf8;
  --cq-glow: rgba(59, 130, 246, 0.4);
  --cq-glow-accent: rgba(56, 189, 248, 0.3);
  --cq-radius: 12px;
}

/* --- Tailwind v4 theme inline overrides --- */
@theme inline {
  --color-background: var(--cq-bg-primary);
  --color-foreground: var(--cq-text-primary);
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
}

/* --- Base element styles --- */
html {
  scroll-behavior: smooth;
}

body {
  background: linear-gradient(180deg, var(--cq-bg-primary), var(--cq-bg-secondary));
  color: var(--cq-text-primary);
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  min-height: 100vh;
}

/* --- Focus styles (accessibility) --- */
*:focus-visible {
  outline: 2px solid var(--cq-primary);
  outline-offset: 2px;
  border-radius: var(--cq-radius);
}

/* --- Custom scrollbar (dark theme) --- */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--cq-bg-primary);
}

::-webkit-scrollbar-thumb {
  background: var(--cq-border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--cq-text-muted);
}

/* Firefox scrollbar */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--cq-border) var(--cq-bg-primary);
}

/* --- Reduced motion --- */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* --- High contrast mode --- */
@media (forced-colors: active) {
  :root {
    --cq-primary: LinkText;
    --cq-accent: Highlight;
    --cq-text-primary: CanvasText;
    --cq-bg-primary: Canvas;
    --cq-border: ButtonBorder;
  }
}

/* --- Card base utility --- */
.cq-card {
  background: var(--cq-bg-card);
  border: 1px solid var(--cq-border);
  border-radius: var(--cq-radius);
  padding: var(--cq-card-padding);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.cq-card:hover {
  border-color: var(--cq-primary);
}

.cq-card-selected {
  border-color: var(--cq-primary);
  box-shadow: 0 0 20px var(--cq-glow), inset 0 0 20px rgba(0, 0, 0, 0.3);
}

/* --- Glow effect utility --- */
.cq-glow {
  box-shadow: 0 0 15px var(--cq-glow), 0 0 30px var(--cq-glow);
}

.cq-glow-accent {
  box-shadow: 0 0 15px var(--cq-glow-accent), 0 0 30px var(--cq-glow-accent);
}

/* --- Button base --- */
.cq-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  font-size: 1rem;
  border-radius: var(--cq-radius);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  min-width: 44px;
}

.cq-button-primary {
  background: var(--cq-primary);
  color: white;
}

.cq-button-primary:hover {
  filter: brightness(1.15);
  box-shadow: 0 0 20px var(--cq-glow);
}

.cq-button-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: none;
  box-shadow: none;
}

.cq-button-ghost {
  background: transparent;
  color: var(--cq-text-secondary);
  border: 1px solid var(--cq-border);
}

.cq-button-ghost:hover {
  border-color: var(--cq-primary);
  color: var(--cq-text-primary);
}

/* --- Input base --- */
.cq-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--cq-bg-input);
  border: 1px solid var(--cq-border);
  border-radius: var(--cq-radius);
  color: var(--cq-text-primary);
  font-size: 1rem;
  min-height: 44px;
  transition: border-color 0.2s ease;
}

.cq-input:focus {
  border-color: var(--cq-primary);
  outline: none;
  box-shadow: 0 0 0 3px var(--cq-glow);
}

.cq-input::placeholder {
  color: var(--cq-text-muted);
}

/* --- Chip / pill base --- */
.cq-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid var(--cq-border);
  border-radius: 9999px;
  background: var(--cq-bg-card);
  color: var(--cq-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  min-width: 44px;
  user-select: none;
}

.cq-chip:hover {
  border-color: var(--cq-primary);
  color: var(--cq-text-primary);
}

.cq-chip-selected {
  background: var(--cq-primary);
  border-color: var(--cq-primary);
  color: white;
  box-shadow: 0 0 10px var(--cq-glow);
}

/* --- Error card --- */
.cq-error-card {
  background: var(--cq-error-bg);
  border: 1px solid var(--cq-error);
  border-radius: var(--cq-radius);
  padding: var(--cq-card-padding);
  color: var(--cq-text-primary);
  text-align: center;
}
```

---

## Task 2: Root Layout Update

**Files:** Modify `app/layout.tsx`

- [ ] **Step 2.1: Update root layout with ThemeProvider and dark background**

**File: `app/layout.tsx`**
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ui/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Career Quest",
  description: "Discover your career path through a gamified quest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={inter.className}
        style={{
          background: "linear-gradient(180deg, #0f0a1e, #1a1035)",
          minHeight: "100vh",
        }}
      >
        <ThemeProvider defaultTheme="purple-teal">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## Task 3: Tone Toggle Component

**Files:** Create `components/character/tone-toggle.tsx`

- [ ] **Step 3.1: Create the tone toggle component**

**File: `components/character/tone-toggle.tsx`**
```tsx
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
```

---

## Task 4: Avatar Select Component

**Files:** Create `components/character/avatar-select.tsx`

- [ ] **Step 4.1: Create the avatar selection grid component**

**File: `components/character/avatar-select.tsx`**
```tsx
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
```

---

## Task 5: Education System Cards

**Files:** Create `components/character/education-cards.tsx`

- [ ] **Step 5.1: Create the education system cards component**

**File: `components/character/education-cards.tsx`**
```tsx
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
```

---

## Task 6: Destination Picker

**Files:** Create `components/character/destination-picker.tsx`

- [ ] **Step 6.1: Create the destination picker component**

**File: `components/character/destination-picker.tsx`**
```tsx
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
```

---

## Task 7: Curiosities Picker

**Files:** Create `components/character/curiosities-picker.tsx`

- [ ] **Step 7.1: Create the curiosities picker component**

**File: `components/character/curiosities-picker.tsx`**
```tsx
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
```

---

## Task 8: Character Creation Page — Multi-Step Wizard

**Files:** Rewrite `app/quest/character/page.tsx`

- [ ] **Step 8.1: Rewrite the character creation page with the full multi-step wizard**

**File: `app/quest/character/page.tsx`**
```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ToneToggle, type Tone } from "@/components/character/tone-toggle";
import { AvatarSelect } from "@/components/character/avatar-select";
import { EducationCards } from "@/components/character/education-cards";
import { DestinationPicker } from "@/components/character/destination-picker";
import { CuriositiesPicker } from "@/components/character/curiosities-picker";
import { createClient } from "@/lib/supabase/client";
import { classes } from "@/data/classes";

type WizardStep = 0 | 1 | 2;

const ageOptions = [13, 14, 15, 16, 17, 18];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export default function CharacterCreation() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(0);
  const [direction, setDirection] = useState(1);

  // Step 0: Tone + Avatar
  const [tone, setTone] = useState<Tone>("quest");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  // Step 1: Name + Age + Education
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [educationSystem, setEducationSystem] = useState<string | null>(null);

  // Step 2: Destinations + Curiosities
  const [destinations, setDestinations] = useState<string[]>([]);
  const [curiosities, setCuriosities] = useState<string[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply theme when class is selected
  const handleClassSelect = useCallback(
    (classId: string) => {
      setSelectedClass(classId);
      const classDef = classes.find((c) => c.id === classId);
      if (classDef) {
        document.documentElement.setAttribute("data-theme", classDef.theme);
      }
    },
    []
  );

  const canProceedStep0 = selectedClass !== null;
  const canProceedStep1 =
    name.trim().length > 0 && age !== null && educationSystem !== null;
  const canProceedStep2 =
    destinations.length > 0 && curiosities.length > 0;

  const goNext = () => {
    if (step < 2) {
      setDirection(1);
      setStep((s) => (s + 1) as WizardStep);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => (s - 1) as WizardStep);
    }
  };

  const handleBeginQuest = async () => {
    if (!canProceedStep2 || !selectedClass || !age || !educationSystem) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Anonymous auth
      const { data: authData, error: authError } =
        await supabase.auth.signInAnonymously();

      if (authError || !authData.user) {
        setError(
          tone === "quest"
            ? "The quest portal is temporarily sealed... Try again"
            : "Connection issue. Please try again."
        );
        setIsSubmitting(false);
        return;
      }

      const userId = authData.user.id;

      // 2. Insert student row
      const { error: studentError } = await supabase
        .from("students")
        .insert({
          id: userId,
          name: name.trim(),
          age,
          education_system: educationSystem,
          avatar_class: selectedClass,
          tone,
          preferred_destinations: destinations,
          self_map: { curiosities },
          current_session: 0,
        });

      if (studentError) {
        setError(
          tone === "quest"
            ? "The quest portal is temporarily sealed... Try again"
            : "Could not save your profile. Please try again."
        );
        setIsSubmitting(false);
        return;
      }

      // 3. Insert empty assessment_scores (non-blocking)
      await supabase
        .from("assessment_scores")
        .insert({
          student_id: userId,
          riasec_scores: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
          mi_scores: {
            linguistic: 0,
            logical: 0,
            spatial: 0,
            musical: 0,
            bodily: 0,
            interpersonal: 0,
            intrapersonal: 0,
            naturalistic: 0,
          },
          mbti_indicators: { EI: 0, SN: 0, TF: 0, JP: 0 },
          values_compass: {
            security_adventure: 0,
            income_impact: 0,
            prestige_fulfilment: 0,
            structure_flexibility: 0,
            solo_team: 0,
          },
          strengths: [],
        })
        .catch(() => {
          // Non-blocking — will be created at first checkpoint
        });

      // 4. Insert "Quest Started" badge (non-blocking)
      await supabase
        .from("achievements")
        .insert({
          student_id: userId,
          badge_id: "quest_started",
        })
        .catch(() => {
          // Non-blocking — badge shown from client state
        });

      // 5. Navigate to Session 1
      router.push("/quest/session/1");
    } catch {
      setError(
        tone === "quest"
          ? "The quest portal is temporarily sealed... Try again"
          : "Something went wrong. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem 1rem",
      }}
    >
      {/* Progress indicator */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "2rem",
        }}
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={3}
        aria-label={`Step ${step + 1} of 3`}
      >
        {[0, 1, 2].map((s) => (
          <div
            key={s}
            style={{
              width: "3rem",
              height: "4px",
              borderRadius: "2px",
              background:
                s <= step ? "var(--cq-primary)" : "var(--cq-border)",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Step content with animation */}
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          flex: 1,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          {step === 0 && (
            <motion.div
              key="step-0"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2rem",
              }}
            >
              <h1
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: "var(--cq-text-primary)",
                  textAlign: "center",
                }}
              >
                {tone === "quest"
                  ? "Create Your Character"
                  : "Set Up Your Profile"}
              </h1>

              <ToneToggle value={tone} onChange={setTone} />

              <AvatarSelect
                selectedClass={selectedClass}
                onSelect={handleClassSelect}
                tone={tone}
              />
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <h1
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: "var(--cq-text-primary)",
                }}
              >
                {tone === "quest" ? "Your Identity" : "About You"}
              </h1>

              {/* Name */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <label
                  htmlFor="adventurer-name"
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--cq-text-primary)",
                  }}
                >
                  {tone === "quest" ? "Adventurer Name" : "Your Name"}
                </label>
                <input
                  id="adventurer-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    tone === "quest"
                      ? "Enter your adventurer name..."
                      : "Enter your name..."
                  }
                  className="cq-input"
                  autoComplete="given-name"
                  maxLength={50}
                />
              </div>

              {/* Age */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <label
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--cq-text-primary)",
                  }}
                >
                  {tone === "quest" ? "Level (Age)" : "Age"}
                </label>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                  role="radiogroup"
                  aria-label="Age selection"
                >
                  {ageOptions.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAge(a)}
                      role="radio"
                      aria-checked={age === a}
                      aria-label={`Age ${a}`}
                      className={`cq-chip ${age === a ? "cq-chip-selected" : ""}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Education System */}
              <EducationCards
                value={educationSystem}
                onChange={setEducationSystem}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2rem",
              }}
            >
              <h1
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: "var(--cq-text-primary)",
                }}
              >
                {tone === "quest"
                  ? "Your Horizons"
                  : "Future Plans"}
              </h1>

              <DestinationPicker
                value={destinations}
                onChange={setDestinations}
              />

              <CuriositiesPicker
                value={curiosities}
                onChange={setCuriosities}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error card */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="cq-error-card"
          style={{
            maxWidth: "640px",
            width: "100%",
            marginTop: "1rem",
          }}
        >
          <p style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            {tone === "quest" ? "⚔️" : "⚠️"} {error}
          </p>
          <button
            onClick={() => {
              setError(null);
              handleBeginQuest();
            }}
            className="cq-button cq-button-primary"
            style={{ marginTop: "0.5rem" }}
          >
            {tone === "quest" ? "Try Again ⚔️" : "Retry"}
          </button>
        </motion.div>
      )}

      {/* Navigation buttons */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginTop: "2rem",
          width: "100%",
          maxWidth: "640px",
          justifyContent: "space-between",
        }}
      >
        {step > 0 ? (
          <button
            onClick={goBack}
            className="cq-button cq-button-ghost"
            aria-label="Go back"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {step < 2 ? (
          <button
            onClick={goNext}
            disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
            className="cq-button cq-button-primary"
            aria-label="Continue to next step"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleBeginQuest}
            disabled={!canProceedStep2 || isSubmitting}
            className="cq-button cq-button-primary"
            aria-label={tone === "quest" ? "Begin Quest" : "Get Started"}
            style={{
              minWidth: "160px",
            }}
          >
            {isSubmitting
              ? tone === "quest"
                ? "Opening portal..."
                : "Setting up..."
              : tone === "quest"
                ? "Begin Quest ⚔️"
                : "Get Started"}
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## Task 9: Landing Page

**Files:** Rewrite `app/page.tsx`

- [ ] **Step 9.1: Rewrite the landing page with returning user detection and animated intro**

**File: `app/page.tsx`**
```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { classes } from "@/data/classes";
import type { Student } from "@/lib/types/student";

type LandingState =
  | { status: "loading" }
  | { status: "returning"; student: Student }
  | { status: "new"; introCard: number };

const introCards = [
  "Every adventurer has a story waiting to be discovered...",
  "Your quest will reveal hidden strengths, unlock your interests, and chart your path...",
  "Answer honestly — there are no wrong answers, only discoveries...",
];

const CARD_DURATION_MS = 2500;

export default function Home() {
  const router = useRouter();
  const [state, setState] = useState<LandingState>({ status: "loading" });
  const [introSkipped, setIntroSkipped] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // Check for student record
          const { data: student } = await supabase
            .from("students")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (student) {
            setState({ status: "returning", student: student as Student });
            return;
          }
        }

        // No session or no student record — show intro
        setState({ status: "new", introCard: 0 });
      } catch {
        // On any error, treat as new user
        setState({ status: "new", introCard: 0 });
      }
    }

    checkSession();
  }, []);

  // Auto-advance intro cards
  useEffect(() => {
    if (state.status !== "new" || introSkipped) return;

    const timer = setInterval(() => {
      setState((prev) => {
        if (prev.status !== "new") return prev;
        if (prev.introCard < introCards.length - 1) {
          return { ...prev, introCard: prev.introCard + 1 };
        }
        // Stay on last card
        return prev;
      });
    }, CARD_DURATION_MS);

    return () => clearInterval(timer);
  }, [state.status, introSkipped]);

  const handleSkipIntro = useCallback(() => {
    setIntroSkipped(true);
  }, []);

  const handleStartQuest = useCallback(() => {
    router.push("/quest/character");
  }, [router]);

  const handleContinueQuest = useCallback(
    (student: Student) => {
      if (student.current_session >= 1) {
        router.push("/quest/dashboard");
      } else {
        router.push("/quest/session/1");
      }
    },
    [router]
  );

  // Loading state
  if (state.status === "loading") {
    return (
      <main
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            fontSize: "1.125rem",
            color: "var(--cq-text-muted)",
          }}
        >
          Loading...
        </motion.div>
      </main>
    );
  }

  // Returning user
  if (state.status === "returning") {
    const { student } = state;
    const classDef = classes.find((c) => c.id === student.avatar_class);
    const tone = (student as Record<string, unknown>).tone as
      | "quest"
      | "explorer"
      | undefined;
    const displayTone = tone ?? "quest";

    return (
      <main
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
          gap: "2rem",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
            maxWidth: "480px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "var(--cq-text-primary)",
            }}
          >
            {displayTone === "quest"
              ? "Welcome back, adventurer!"
              : "Welcome back!"}
          </h1>

          {/* Class icon + name */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem 1.5rem",
              background: "var(--cq-bg-card)",
              border: "1px solid var(--cq-border)",
              borderRadius: "var(--cq-radius)",
            }}
          >
            {classDef && (
              <span
                style={{ fontSize: "2rem" }}
                role="img"
                aria-label={classDef.name[displayTone]}
              >
                {classDef.icon}
              </span>
            )}
            <div style={{ textAlign: "left" }}>
              <p
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  color: "var(--cq-text-primary)",
                }}
              >
                {student.name}
              </p>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--cq-text-secondary)",
                }}
              >
                {classDef
                  ? classDef.name[displayTone]
                  : "Adventurer"}{" "}
                &middot; Session {student.current_session || 1}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleContinueQuest(student)}
            className="cq-button cq-button-primary"
            style={{ width: "100%", maxWidth: "280px" }}
            aria-label="Continue Quest"
          >
            {displayTone === "quest"
              ? "Continue Quest ⚔️"
              : "Continue"}
          </button>

          <button
            onClick={handleStartQuest}
            className="cq-button cq-button-ghost"
            style={{ fontSize: "0.875rem" }}
            aria-label="Start a new quest"
          >
            Start a new quest instead
          </button>
        </motion.div>
      </main>
    );
  }

  // New user — animated intro
  const showCTA =
    introSkipped || state.introCard >= introCards.length - 1;

  return (
    <main
      style={{
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        gap: "2rem",
        position: "relative",
      }}
    >
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          fontSize: "2.5rem",
          fontWeight: 800,
          color: "var(--cq-text-primary)",
          textAlign: "center",
          letterSpacing: "-0.02em",
        }}
      >
        Career Quest
      </motion.h1>

      {/* Intro cards */}
      <div
        style={{
          minHeight: "120px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "480px",
          width: "100%",
        }}
      >
        <AnimatePresence mode="wait">
          {!introSkipped && (
            <motion.p
              key={state.introCard}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              style={{
                fontSize: "1.25rem",
                color: "var(--cq-text-secondary)",
                textAlign: "center",
                lineHeight: 1.6,
                fontStyle: "italic",
              }}
            >
              {introCards[state.introCard]}
            </motion.p>
          )}

          {introSkipped && (
            <motion.p
              key="skipped"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                fontSize: "1.125rem",
                color: "var(--cq-text-secondary)",
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              Discover your career path through a gamified quest
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showCTA ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <button
          onClick={handleStartQuest}
          className="cq-button cq-button-primary cq-glow"
          style={{
            fontSize: "1.125rem",
            padding: "1rem 2.5rem",
            minWidth: "220px",
          }}
          aria-label="Start Your Quest"
        >
          Start Your Quest ⚔️
        </button>
      </motion.div>

      {/* Skip button — visible from card 1 */}
      {!introSkipped && state.introCard < introCards.length - 1 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleSkipIntro}
          style={{
            position: "absolute",
            bottom: "2rem",
            right: "2rem",
            background: "transparent",
            border: "none",
            color: "var(--cq-text-muted)",
            cursor: "pointer",
            fontSize: "0.875rem",
            padding: "0.5rem",
            minHeight: "44px",
            minWidth: "44px",
          }}
          aria-label="Skip intro"
        >
          Skip
        </motion.button>
      )}

      {/* Progress dots for intro */}
      {!introSkipped && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            position: "absolute",
            bottom: "2rem",
          }}
        >
          {introCards.map((_, i) => (
            <div
              key={i}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background:
                  i <= state.introCard
                    ? "var(--cq-primary)"
                    : "var(--cq-border)",
                transition: "background 0.3s ease",
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
```

---

## Commit Plan

After each task, commit:

| Task | Commit Message |
|------|---------------|
| 1 | `style: rewrite globals.css with dark RPG theme and 3 theme variants` |
| 2 | `feat: update root layout with ThemeProvider and dark background` |
| 3 | `feat: add ToneToggle component for quest/explorer mode selection` |
| 4 | `feat: add AvatarSelect component with themed class grid` |
| 5 | `feat: add EducationCards component with country-flagged options` |
| 6 | `feat: add DestinationPicker component with multi-select country cards` |
| 7 | `feat: add CuriositiesPicker component with pill tags` |
| 8 | `feat: build character creation wizard with Supabase auth and persistence` |
| 9 | `feat: build landing page with returning user detection and animated intro` |
