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
        });
        // Non-blocking — will be created at first checkpoint

      // 4. Insert "Quest Started" badge (non-blocking)
      await supabase
        .from("achievements")
        .insert({
          student_id: userId,
          badge_id: "quest_started",
        });
        // Non-blocking — badge shown from client state

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
