"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ToneToggle, type Tone } from "@/components/character/tone-toggle";
import { EducationCards } from "@/components/character/education-cards";
import { DestinationPicker } from "@/components/character/destination-picker";
import { CuriositiesPicker } from "@/components/character/curiosities-picker";
import { provisionStudent } from "@/lib/persistence/provision-student";
import { cacheTone } from "@/lib/theme";

// Neutral figures, not gendered -- personalisation without asking a
// 13-year-old to declare their gender to a school app.
const FIGURES = [
  { id: "figure_a", emoji: "\u{1F9CD}", label: "Figure A" },
  { id: "figure_b", emoji: "\u{1F9CE}", label: "Figure B" },
  { id: "figure_c", emoji: "\u{1F9D1}", label: "Figure C" },
  { id: "figure_d", emoji: "\u{1F464}", label: "Figure D" },
];

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

  // Step 0: Tone + Figure (defaults to the first figure so nothing blocks
  // progress; the student can still change it).
  const [tone, setTone] = useState<Tone>("quest");
  const [figure, setFigure] = useState<string>(FIGURES[0].id);

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

  // Step 0 only offers tone + a cosmetic figure, both of which already have
  // defaults, so there is nothing to block progress on.
  const canProceedStep0 = true;
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
    if (!canProceedStep2 || !age || !educationSystem) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Provision (or replace in place) the student record. When an auth
      // session already exists this reuses the same user and clears the
      // previous run's data instead of orphaning it (P2.3). Every student
      // starts as "wanderer" -- the class crystallises from their answers.
      const result = await provisionStudent({
        name: name.trim(),
        age,
        educationSystem,
        avatarClass: "wanderer",
        tone,
        destinations,
        curiosities,
        figure,
      });

      if (!result.success) {
        setError(
          tone === "quest"
            ? "The quest portal is temporarily sealed... Try again"
            : "Could not save your profile. Please try again."
        );
        setIsSubmitting(false);
        return;
      }

      // Cache tone for instant restoration on future loads (P2.5)
      cacheTone(tone);

      // Navigate to Session 1
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

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.0625rem",
                    fontWeight: 600,
                    color: "var(--cq-text-primary)",
                  }}
                >
                  Choose Your Figure
                </h2>
                <div
                  role="radiogroup"
                  aria-label="Choose your figure"
                  className="flex gap-3"
                >
                  {FIGURES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="radio"
                      aria-checked={figure === f.id}
                      aria-label={f.label}
                      onClick={() => setFigure(f.id)}
                      className={`flex h-16 w-16 items-center justify-center rounded-xl border-2 text-3xl transition-colors ${
                        figure === f.id
                          ? "border-[var(--cq-primary)] bg-[var(--cq-primary)]/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span aria-hidden="true">{f.emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
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
