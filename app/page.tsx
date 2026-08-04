"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { applyClassTheme } from "@/lib/theme";
import { chapterLabel } from "@/lib/copy/chapter";
import {
  parseCharacterClass,
  characterClassDisplayName,
  CHARACTER_CLASSES,
  type DerivedClass,
} from "@/lib/character/classes";
import { loadSessionSnapshot } from "@/lib/persistence/session-snapshot";
import type { Student } from "@/lib/types/student";

/**
 * The class to greet a returning student by.
 *
 * A mid-quest class lives only in the checkpoint until the final save, so
 * reading the database alone greets a named student as "Wanderer" — or, in
 * plain tone, the non-sentence "Still forming" — and then turns them back
 * into their class the moment they resume.
 */
function resolveGreetingClass(storedClass: string | null, studentId: string) {
  const stored = parseCharacterClass(storedClass);
  if (stored.isNamed) return stored;
  const snapshot = loadSessionSnapshot(studentId);
  const inProgress = snapshot?.questState?.avatarClass ?? null;
  return parseCharacterClass(inProgress);
}

type LandingState =
  | { status: "loading" }
  | { status: "returning"; student: Student; resolvedClass: DerivedClass }
  | { status: "new"; introCard: number };

const introCards = [
  "Every adventurer has a story waiting to be discovered...",
  "Your quest will reveal hidden strengths, unlock your interests, and chart your path...",
  "Answer honestly \u2014 there are no wrong answers, only discoveries...",
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
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Check for student record
          const { data: student } = await supabase
            .from("students")
            .select("*")
            .eq("id", user.id)
            .single();

          if (student) {
            const returningStudent = student as Student;
            const resolvedClass = resolveGreetingClass(
              returningStudent.avatar_class,
              user.id
            );
            applyClassTheme(resolvedClass.primary);
            setState({ status: "returning", student: returningStudent, resolvedClass });
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
      if (student.has_completed_session1) {
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
    const { student, resolvedClass } = state;
    const classIcon = CHARACTER_CLASSES[resolvedClass.primary].icon;
    const classDisplayName = characterClassDisplayName(
      resolvedClass,
      student.tone ?? "quest"
    );
    const displayTone = student.tone ?? "quest";

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
            <span
              style={{ fontSize: "2rem" }}
              role="img"
              aria-label={classDisplayName}
            >
              {classIcon}
            </span>
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
                {classDisplayName}{" "}
                &middot; {student.has_completed_session1 ? `${chapterLabel(1, displayTone)} Complete` : chapterLabel(student.current_session || 1, displayTone)}
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

          {/*
            "Start a new quest instead" used to open an inline confirmation
            here (P2.3). That confirmation didn't gate anything destructive
            -- it just delayed the navigation -- and it was reachable only
            from this one entry point, so a shared device could still lose
            a student's work via any other route into character creation
            (direct link, browser back/forward, a retried session check).
            The single, authoritative consent gate now lives on
            /quest/character itself, immediately before the destructive
            call, regardless of how the student got there (Task 7). Asking
            here too would ask the same student twice.
          */}
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
