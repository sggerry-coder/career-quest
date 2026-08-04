"use client";

import { use, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QuestionCard from "@/components/quest/question-card";
import LikertSlider from "@/components/quest/likert-slider";
import SpectrumSlider from "@/components/quest/spectrum-slider";
import IpsativePicker from "@/components/quest/ipsative-picker";
import OptionGrid from "@/components/quest/option-grid";
import ProgressBar from "@/components/quest/progress-bar";
import BlockTransition from "@/components/quest/block-transition";
import ClassNamedScreen from "@/components/quest/class-named-screen";
import EngagementCheckpoint from "@/components/quest/engagement-checkpoint";
import DiscoveryModePrompt from "@/components/quest/discovery-mode-prompt";
import SelfMapCapture, { type SelfMapData } from "@/components/selfmap/self-map-capture";
import RevealSequence from "@/components/quest/reveal-sequence";
import CompletionScreen from "@/components/quest/completion-screen";
import SavingResults from "@/components/quest/saving-results";
import SaveFailedScreen from "@/components/quest/save-failed-screen";
import ResumePrompt from "@/components/quest/resume-prompt";
import BadgeUnlock from "@/components/badges/badge-unlock";
import ConfirmationToast from "@/components/ui/confirmation-toast";
import { useQuestState } from "@/hooks/use-quest-state";
import { useScores } from "@/hooks/use-scores";
import { useFinalPersist } from "@/hooks/use-final-persist";
import { useEmergentClass } from "@/hooks/use-emergent-class";
import {
  characterClassDisplayName,
  serializeCharacterClass,
} from "@/lib/character/classes";
import { countInterestResponses } from "@/lib/character/evidence";
import { session1CoreQuestions } from "@/data/questions/session-1-core";
import { session1AdaptivePool } from "@/data/questions/session-1-adaptive";
import { selectAdaptiveQuestions } from "@/lib/scoring/adaptive";
import { classDefinitions, cacheTone, readCachedTone } from "@/lib/theme";
import { accumulateStrengths } from "@/lib/scoring/strengths";
import { STRENGTH_COUNTS_KEY } from "@/lib/character/relics";
import { createClient } from "@/lib/supabase/client";
import { runFinalPersist } from "@/lib/persistence/final-persist";
import { chapterLabel } from "@/lib/copy/chapter";
import {
  saveSessionSnapshot,
  loadSessionSnapshot,
  clearSessionSnapshot,
  type SessionSnapshot,
} from "@/lib/persistence/session-snapshot";
import type { PersistResult } from "@/lib/validation/error-classification";
import type { Question, ClientResponse } from "@/lib/types/quest";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";

// Block definitions with question index ranges
interface BlockDef {
  name: string;
  key: string;
  startIndex: number;
  endIndex: number;
  canSkip: boolean;
  canUndo: boolean;
}

/**
 * Map reducer transition narration keys (e.g. "warmup_to_riasec") to
 * ClassDefinition narration keys used for block transition text.
 */
const TRANSITION_KEY_MAP: Record<string, keyof typeof classDefinitions[0]["narration"]> = {
  warmup_to_riasec: "riasec_intro",
  riasec_to_riasec_mi: "riasec_intro",
  riasec_mi_to_mbti_values: "mbti_intro",
};

export default function Session({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.JSX.Element {
  const { id } = use(params);
  
  const { state: questState, dispatch } = useQuestState();
  const {
    flowPhase,
    currentIndex,
    direction,
    transitionNarration,
    adaptiveQuestions,
    confirmIndex,
    avatarClass,
  } = questState;

  const { scoreState, processResponse, processResponseWithSignals, processIpsativeResponse, takeSnapshot, removeLastResponse, restoreScores } = useScores();

  // The primary class recovered from a mid-quest checkpoint, set when the
  // student chooses Resume. Held separately from questState.avatarClass --
  // which the hook itself drives -- so seeding the hook cannot feed back into
  // it. Null on a fresh start or after "Start over".
  const [restoredClass, setRestoredClass] = useState<string | null>(null);

  // The class crystallises from the student's answers at block boundaries
  // (never per answer, so it cannot flip like a slot machine). Replaces the
  // Supabase-fetched avatar_class as the source of truth for narration/theme.
  const { derived: emergentClass, namingEventId } = useEmergentClass({
    riasec: scoreState.riasec,
    blockKey: questState.current_block,
    restoredClass,
    interestResponses: countInterestResponses(scoreState.riasec_raw),
    interestBlockComplete:
      questState.current_block !== "warmup" && questState.current_block !== "riasec",
  });

  // Show the naming moment once, when useEmergentClass raises a fresh naming
  // event. namingEventId is a monotonic counter rather than a transient flag
  // precisely so it survives being compared here, a render or more after it
  // changed -- see useEmergentClass for why a boolean didn't. Ref, not state,
  // because it exists purely to remember what this effect last reacted to.
  const lastNamingSeen = useRef(0);
  useEffect(() => {
    if (namingEventId > lastNamingSeen.current) {
      lastNamingSeen.current = namingEventId;
      dispatch({ type: "SHOW_CLASS_NAMED" });
    }
  }, [namingEventId, dispatch]);

  useEffect(() => {
    // A provisional class (a Rogue lead shown before the interest block
    // finishes -- see useEmergentClass) must never reach quest state.
    // questState.avatarClass is checkpointed on every change and read back
    // by seedFromRestored on resume, which treats any non-wanderer id as
    // already named. Dispatching a provisional "rogue" here would let one
    // quit-and-resume permanently lock a lead that was never meant to be
    // final, defeating the whole point of leaving it unlocked. Wait for
    // isNamed before writing it anywhere -- until then avatarClass simply
    // keeps its previous value ("wanderer" on a fresh start), which is the
    // right fallback for narration and theme.
    if (!emergentClass.isNamed) return;
    dispatch({ type: "SET_AVATAR_CLASS", avatarClass: emergentClass.primary });
  }, [emergentClass.primary, emergentClass.isNamed, dispatch]);

  // Initialize from the tone cache (P2.5) so returning students never see a
  // flash of the wrong narration voice; the profile fetch corrects drift.
  const [studentTone, setStudentTone] = useState<"quest" | "explorer">(
    () => readCachedTone() ?? "quest"
  );

  // Mid-session checkpoint resume (P1.1):
  // "checking"  -- waiting for the student profile fetch + snapshot lookup
  // "prompt"    -- a resumable snapshot exists; ask Resume / Start over
  // "active"    -- normal flow (fresh start, resumed, or nothing to resume)
  const [resumeStatus, setResumeStatus] = useState<"checking" | "prompt" | "active">("checking");
  const [pendingSnapshot, setPendingSnapshot] = useState<SessionSnapshot | null>(null);
  // The resume decision is made exactly once per mount -- a re-run of the
  // profile effect must never flip an active session back to the prompt
  // (e.g. after the checkpoint effect has started writing snapshots).
  const resumeDecided = useRef(false);

  // Existing self_map from character creation (e.g. curiosities) so the
  // session's self-map answers can be merged in without clobbering it.
  const existingSelfMap = useRef<Record<string, unknown>>({});

  // Self-map reflection answers captured mid-session, written at final persist
  const selfMapData = useRef<SelfMapData | null>(null);

  // Fetch the student's avatar_class, tone and self_map from Supabase on mount
  // (FLOW-03), then check for a resumable mid-session checkpoint (P1.1).
  useEffect(() => {
    async function loadStudentProfile(): Promise<void> {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!resumeDecided.current) {
            resumeDecided.current = true;
            setResumeStatus("active");
          }
          return;
        }
        const { data } = await supabase
          .from("students")
          .select("tone, self_map, has_completed_session1")
          .eq("id", user.id)
          .single();
        if (data?.tone === "quest" || data?.tone === "explorer") {
          setStudentTone(data.tone);
          cacheTone(data.tone);
        }
        if (data?.self_map && typeof data.self_map === "object") {
          existingSelfMap.current = data.self_map as Record<string, unknown>;
        }

        // Offer resume only when Session 1 is not yet complete and the
        // snapshot actually contains progress worth restoring. Decide once.
        if (resumeDecided.current) return;
        resumeDecided.current = true;
        if (data?.has_completed_session1 !== true) {
          const snapshot = loadSessionSnapshot(user.id);
          if (
            snapshot &&
            (snapshot.questState.responses.length > 0 ||
              snapshot.questState.currentIndex > 0)
          ) {
            setPendingSnapshot(snapshot);
            setResumeStatus("prompt");
            return;
          }
        }
        setResumeStatus("active");
      } catch {
        // Silent catch per project conventions -- falls back to defaults
        if (!resumeDecided.current) {
          resumeDecided.current = true;
          setResumeStatus("active");
        }
      }
    }
    loadStudentProfile();
  }, [dispatch]);

  // Derive class definition from avatarClass (fetched from Supabase or default "wanderer")
  const classDef = useMemo(() => {
    return classDefinitions.find((c) => c.id === avatarClass)
      ?? classDefinitions.find((c) => c.id === "wanderer")!;
  }, [avatarClass]);

  const avatarClassName = classDef.name[studentTone];

  // Persistence state for completion flow
  const router = useRouter();
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  // Whether the auth lookup has finished, regardless of whether it found a
  // user. Gating the completion screen on a save means we must fire that save
  // even when there is no student id — otherwise an unauthenticated student
  // waits on a spinner forever instead of being told to sign in.
  const [authSettled, setAuthSettled] = useState(false);

  // Capture student ID from the avatar_class fetch (reuse auth user)
  useEffect(() => {
    async function loadStudentId(): Promise<void> {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setStudentId(user.id);
      } catch {
        // Silent catch per project conventions
      } finally {
        setAuthSettled(true);
      }
    }
    loadStudentId();
  }, []);

  /**
   * Run final persistence: scores, responses, completion flag.
   * Delegates to lib/persistence/final-persist (retry with backoff).
   * Returns a PersistResult without calling setState -- callers handle state.
   */
  const persistFinal = useCallback(async (): Promise<PersistResult> => {
    if (!studentId) {
      return { success: false, errorType: "auth", message: "No authenticated user" };
    }
    return runFinalPersist({
      studentId,
      // The full resolved class, dual included. Persisting only the primary
      // told a "Guardian-Mage" they were a "Guardian" ever after.
      characterClass: serializeCharacterClass(emergentClass),
      responses: questState.responses,
      scores: {
        riasec: scoreState.riasec,
        mi: scoreState.mi,
        mbti: scoreState.mbti,
        mbti_raw: scoreState.mbti_raw,
        values: scoreState.values,
        strengths: scoreState.strengths,
      },
      // Merge self-map reflections (clarity, sources, perceived strengths)
      // into the existing self_map without dropping character-creation data
      // such as curiosities.
      //
      // strength_counts is written unconditionally: relics are earned from
      // how many times a trait was demonstrated, and the persisted
      // `strengths` column is the deduped top five, which cannot express
      // that. Without this the dashboard's relic shelf is always empty.
      selfMap: {
        ...existingSelfMap.current,
        ...(selfMapData.current ?? {}),
        [STRENGTH_COUNTS_KEY]: accumulateStrengths(scoreState.strength_signals),
      },
    });
  }, [studentId, scoreState, questState.responses, emergentClass]);

  // Final-save state machine. The completion screen is gated on this, so a
  // failed save can never be mistaken for a finished quest.
  const {
    status: saveStatus,
    errorType: saveErrorType,
    errorMessage: saveErrorMessage,
    start: startPersist,
    retry: retryPersist,
  } = useFinalPersist(persistFinal);

  /** Navigate to landing for sign-in. */
  const handleSignIn = useCallback((): void => {
    router.push("/");
  }, [router]);

  /** Leave without saving; the checkpoint stays for a resume next visit. */
  const handleLeave = useCallback((): void => {
    router.push("/");
  }, [router]);

  /**
   * Save and exit. Only reachable from CompletionScreen, which renders only
   * once the save succeeded, so there is no failure branch to handle here.
   */
  const handleSaveExit = useCallback((): void => {
    setShowSaveToast(true);
    setTimeout(() => router.push("/"), 2200);
  }, [router]);

  // Fire persistence on entry to the complete phase. Waits for the auth lookup
  // to settle rather than for a non-null id: with the completion screen gated
  // on a successful save, never firing would strand a signed-out student on
  // the saving spinner. Firing with a null id returns an auth failure, which
  // routes to the sign-in variant of the failure screen. start() is one-shot.
  useEffect(() => {
    if (flowPhase === "complete" && authSettled) {
      startPersist();
    }
  }, [flowPhase, authSettled, startPersist]);

  // === Mid-session checkpoint (P1.1) ===

  /** Resume from the saved checkpoint: rehydrate scores first, then quest state. */
  const handleResume = useCallback((): void => {
    if (pendingSnapshot) {
      restoreScores(pendingSnapshot.scoreState);
      dispatch({ type: "RESTORE_STATE", state: pendingSnapshot.questState });
      // Hand the already-named class back to useEmergentClass. Without it the
      // hook restarts as a Wanderer and the next block boundary is free to
      // rename the student -- a Guardian-Bard came back as a Bard-Guardian.
      setRestoredClass(pendingSnapshot.questState.avatarClass ?? null);
      if (pendingSnapshot.selfMap) {
        selfMapData.current = pendingSnapshot.selfMap;
      }
    }
    setPendingSnapshot(null);
    setResumeStatus("active");
  }, [pendingSnapshot, dispatch, restoreScores]);

  /** Start over: discard the checkpoint and begin from question 1. */
  const handleStartOver = useCallback((): void => {
    if (studentId) {
      clearSessionSnapshot(studentId);
    }
    setPendingSnapshot(null);
    setResumeStatus("active");
  }, [studentId]);

  // Save a checkpoint after every state-changing dispatch (answers, block
  // transitions, self-map, confirmatory...). Skipped until the resume
  // decision is made so a fresh reducer state can't clobber the snapshot.
  useEffect(() => {
    if (resumeStatus !== "active" || !studentId) return;
    if (questState.responses.length === 0 && questState.currentIndex === 0) return;
    if (saveStatus === "saved") return;
    saveSessionSnapshot(studentId, questState, scoreState, selfMapData.current);
  }, [resumeStatus, studentId, questState, scoreState, saveStatus]);

  // Clear the checkpoint once final persistence has succeeded. Declared after
  // the effect above so a failed save keeps the snapshot the failure screen
  // promises is still there.
  useEffect(() => {
    if (saveStatus === "saved" && studentId) {
      clearSessionSnapshot(studentId);
    }
  }, [saveStatus, studentId]);

  // Badge celebration overlay shown before the completion screen
  const [showBadgeUnlock, setShowBadgeUnlock] = useState(true);

  /**
   * Resolve narration text for a block transition.
   * The reducer stores keys like "warmup_to_riasec"; we map them to
   * ClassDefinition narration keys and read the text for the student's tone.
   */
  const getNarration = useCallback(
    (key: string): string => {
      const narrationKey = TRANSITION_KEY_MAP[key];
      if (narrationKey) {
        return classDef.narration[narrationKey]?.[studentTone] ?? "";
      }
      // Fallback: return the raw string (for any unmapped transitions)
      return key;
    },
    [classDef, studentTone]
  );

  // Get questions for the current session
  const sessionQuestions = useMemo((): Question[] => {
    const sessionNum = Number(id);
    if (sessionNum === 1) return session1CoreQuestions;
    return [];
  }, [id]);

  const currentQuestion = useMemo((): Question | null => {
    if (flowPhase === "confirmatory") {
      return adaptiveQuestions[confirmIndex] ?? null;
    }
    return sessionQuestions[currentIndex] ?? null;
  }, [flowPhase, sessionQuestions, currentIndex, adaptiveQuestions, confirmIndex]);

  // Build block definitions from question data
  const blocks = useMemo((): BlockDef[] => {
    const blockMap = new Map<string, BlockDef>();
    sessionQuestions.forEach((q, i) => {
      const existing = blockMap.get(q.block);
      if (existing) {
        existing.endIndex = i;
      } else {
        const canSkip = q.block === "riasec" || q.block === "riasec_mi";
        const canUndo = q.block !== "warmup";
        blockMap.set(q.block, {
          name: q.block.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          key: q.block,
          startIndex: i,
          endIndex: i,
          canSkip,
          canUndo,
        });
      }
    });
    return Array.from(blockMap.values());
  }, [sessionQuestions]);

  const currentBlock = useMemo((): BlockDef | undefined => {
    return blocks.find(
      (b) => currentIndex >= b.startIndex && currentIndex <= b.endIndex
    );
  }, [blocks, currentIndex]);

  // Time estimate based on remaining questions * 25s
  const timeEstimate = useMemo((): string => {
    const remaining = sessionQuestions.length - currentIndex;
    const seconds = remaining * 25;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min`;
  }, [sessionQuestions.length, currentIndex]);

  // Handle answer submission -- dispatches to reducer for atomic state transition
  const handleAnswer = useCallback(
    (value: number | string, label?: string): void => {
      if (!currentQuestion) return;
      const numericValue = typeof value === "string" ? 0 : value;
      const responseLabel = label ?? String(value);

      const response: ClientResponse = {
        question_id: currentQuestion.id,
        response_value: numericValue,
        response_label: responseLabel,
        framework: currentQuestion.framework,
        framework_target: currentQuestion.framework_target,
        answered_at: Date.now(),
        // Carried so the scoring layer can flip reverse-worded items; the
        // stored response_value stays exactly what the student picked.
        reverse_scored: currentQuestion.reverse_scored,
      };

      // Dispatch to reducer (ATOMIC state transition -- FLOW-01 fix)
      dispatch({
        type: "ANSWER_QUESTION",
        response,
        question: currentQuestion,
        sessionQuestions,
      });

      // Scoring side effect (kept OUTSIDE reducer per research pitfall #2)
      const selectedOption = currentQuestion.options.find(
        (o) => String(o.value) === String(value) || o.label === label
      );
      if (selectedOption?.framework_signals) {
        processResponseWithSignals(response, selectedOption.framework_signals, selectedOption.strength_signal);
      } else {
        processResponse(response);
      }
    },
    [currentQuestion, sessionQuestions, dispatch, processResponse, processResponseWithSignals]
  );

  // Handle ipsative ranking completion
  const handleIpsativeComplete = useCallback(
    (ranked: { value: string; rank: number }[]): void => {
      if (!currentQuestion) return;
      processIpsativeResponse(ranked.map((r) => ({ type: r.value, rank: r.rank })));

      const response: ClientResponse = {
        question_id: currentQuestion.id,
        response_value: 0,
        response_label: ranked.map((r) => `${r.rank}:${r.value}`).join(","),
        framework: currentQuestion.framework,
        framework_target: "ipsative",
        answered_at: Date.now(),
      };

      dispatch({ type: "ANSWER_IPSATIVE", response, sessionQuestions });
    },
    [currentQuestion, sessionQuestions, dispatch, processIpsativeResponse]
  );

  // Handle undo — reverse score state FIRST, then quest state
  const handleUndo = useCallback((): void => {
    removeLastResponse();
    dispatch({ type: "UNDO" });
  }, [dispatch, removeLastResponse]);

  // Handle skip (advance without recording a response)
  const handleSkip = useCallback((): void => {
    dispatch({ type: "SKIP", sessionQuestions });
  }, [dispatch, sessionQuestions]);

  // Handle block transition complete
  const handleTransitionComplete = useCallback((): void => {
    dispatch({ type: "DISMISS_BLOCK_TRANSITION" });
  }, [dispatch]);

  // Handle engagement continue
  const handleEngagementContinue = useCallback((): void => {
    dispatch({ type: "DISMISS_ENGAGEMENT" });
  }, [dispatch]);

  // Handle discovery mode activation
  const handleDiscoveryContinue = useCallback((): void => {
    dispatch({ type: "DISMISS_DISCOVERY" });
  }, [dispatch]);

  // Handle self-map completion -- keep the reflection data for final persist
  const handleSelfMapComplete = useCallback(
    (data: SelfMapData): void => {
      selfMapData.current = data;
      dispatch({ type: "ENTER_REVEAL" });
    },
    [dispatch]
  );

  // Handle reveal sequence completion (moves to confirmatory).
  // Snapshot RIASEC scores first so the CompletionScreen can show a
  // before/after "profile sharpened" delta for the confirmatory round (P1.3).
  const handleRevealComplete = useCallback((): void => {
    takeSnapshot();
    const adaptive = selectAdaptiveQuestions({
      riasecScores: scoreState.riasec,
      riasecRaw: scoreState.riasec_raw,
      miScores: scoreState.mi,
      miRaw: scoreState.mi_raw,
      mbtiScores: scoreState.mbti,
      mbtiRaw: scoreState.mbti_raw,
      pool: session1AdaptivePool,
    });
    dispatch({ type: "ENTER_CONFIRMATORY", adaptiveQuestions: adaptive });
  }, [scoreState, dispatch, takeSnapshot]);

  // Handle confirmatory answer
  const handleConfirmatoryAnswer = useCallback(
    (value: number | string, label?: string): void => {
      const q = adaptiveQuestions[confirmIndex];
      if (!q) return;
      const numericValue = typeof value === "string" ? 0 : value;
      const response: ClientResponse = {
        question_id: q.id,
        response_value: numericValue,
        response_label: label ?? String(value),
        framework: q.framework,
        framework_target: q.framework_target,
        answered_at: Date.now(),
        reverse_scored: q.reverse_scored,
      };

      dispatch({ type: "ANSWER_CONFIRMATORY", response });
      processResponse(response);
    },
    [adaptiveQuestions, confirmIndex, dispatch, processResponse]
  );

  // Render the correct input component based on question_type
  const renderInput = useCallback(
    (
      question: Question,
      onSubmit: (value: number | string, label?: string) => void
    ): React.ReactNode => {
      switch (question.question_type) {
        case "likert":
          return (
            <LikertSlider
              value={null}
              onChange={(v) => onSubmit(v)}
            />
          );

        case "spectrum":
          return (
            <SpectrumSlider
              value={null}
              onChange={(v) => onSubmit(v)}
              leftLabel={question.options[0]?.label ?? ""}
              rightLabel={question.options[1]?.label ?? ""}
            />
          );

        case "ipsative":
          return (
            <IpsativePicker
              options={question.options.map((o) => ({
                label: o.label,
                value: o.value as string,
                emoji: o.emoji,
                framework_signals: o.framework_signals,
              }))}
              onComplete={handleIpsativeComplete}
            />
          );

        case "multiple_choice":
          return (
            <OptionGrid
              options={question.options.map((o) => ({
                label: o.label,
                value: o.value as string,
                emoji: o.emoji,
              }))}
              value={null}
              onChange={(v) => {
                const selectedOption = question.options.find(
                  (o) => o.value === v
                );
                onSubmit(v, selectedOption?.label);
              }}
            />
          );

        case "forced_choice":
          return (
            <div className="flex flex-col gap-3 w-full">
              {question.options.map((option) => (
                <button
                  key={String(option.value)}
                  onClick={() => onSubmit(option.value, option.label)}
                  className="w-full rounded-xl border-2 border-white/10 bg-white/5 p-4 text-left text-white/80 font-medium transition-colors hover:bg-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
                  aria-label={option.label}
                  tabIndex={0}
                >
                  {option.emoji && (
                    <span className="mr-2">{option.emoji}</span>
                  )}
                  {option.label}
                </button>
              ))}
            </div>
          );

        default:
          return null;
      }
    },
    [handleIpsativeComplete]
  );

  // === RENDER ===

  // Resume gate (P1.1): hold rendering until the snapshot check resolves,
  // then offer Resume / Start over when a checkpoint exists.
  if (sessionQuestions.length > 0 && resumeStatus === "checking") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-white/50">Loading your quest...</p>
      </div>
    );
  }

  if (sessionQuestions.length > 0 && resumeStatus === "prompt") {
    return (
      <ResumePrompt
        tone={studentTone}
        questionsAnswered={pendingSnapshot?.questState.responses.length ?? 0}
        onResume={handleResume}
        onStartOver={handleStartOver}
      />
    );
  }

  // Block transition interstitial
  if (flowPhase === "block_transition") {
    return (
      <BlockTransition
        narrationText={getNarration(transitionNarration)}
        onComplete={handleTransitionComplete}
      />
    );
  }

  // The naming moment: fires once, when the class first crystallises.
  if (flowPhase === "class_named") {
    return (
      <ClassNamedScreen
        derived={emergentClass}
        tone={studentTone}
        onContinue={() => dispatch({ type: "DISMISS_CLASS_NAMED" })}
      />
    );
  }

  // Engagement checkpoint
  if (flowPhase === "engagement") {
    return (
      <EngagementCheckpoint
        characterName={emergentClass.isNamed ? avatarClassName : null}
        tone={studentTone}
        onContinue={handleEngagementContinue}
      />
    );
  }

  // Discovery mode prompt
  if (flowPhase === "discovery_prompt") {
    return (
      <DiscoveryModePrompt
        characterName={emergentClass.isNamed ? avatarClassName : null}
        tone={studentTone}
        onContinue={handleDiscoveryContinue}
      />
    );
  }

  // Self-map capture
  if (flowPhase === "selfmap") {
    return <SelfMapCapture onComplete={handleSelfMapComplete} />;
  }

  // Reveal sequence
  if (flowPhase === "reveal") {
    return (
      <SectionErrorBoundary name="Profile Reveal">
        <RevealSequence
          scoreState={scoreState}
          className={avatarClassName}
          resolvedClass={emergentClass}
          tone={studentTone}
          onRevealComplete={handleRevealComplete}
        />
      </SectionErrorBoundary>
    );
  }

  // Confirmatory round
  if (flowPhase === "confirmatory" && currentQuestion) {
    return (
      <div>
        <div className="absolute top-16 left-4 right-4 z-20">
          <ProgressBar
            currentBlock="Confirmatory"
            questionsAnsweredInBlock={confirmIndex}
            totalQuestionsInBlock={adaptiveQuestions.length}
            totalQuestionsAnswered={sessionQuestions.length + confirmIndex}
            totalQuestions={sessionQuestions.length + adaptiveQuestions.length}
            timeEstimate="2 min"
          />
        </div>
        <QuestionCard
          questionText={currentQuestion.question_text}
          questionIndex={confirmIndex}
          totalQuestions={adaptiveQuestions.length}
          blockName=""
          timeEstimate=""
          direction={direction}
          canUndo={false}
          onUndo={() => {}}
          canSkip={false}
          onSkip={() => {}}
        >
          {renderInput(currentQuestion, handleConfirmatoryAnswer)}
        </QuestionCard>
      </div>
    );
  }

  // Session complete: badge celebration, then -- only once the save is
  // confirmed -- the real completion screen. Persistence fires exactly once via
  // the flowPhase effect above, in parallel with the badge overlay, so a quick
  // save is already done by the time the badge finishes.
  if (flowPhase === "complete") {
    return (
      <>
        {showBadgeUnlock ? (
          <BadgeUnlock
            badgeName="Self-Discoverer"
            badgeIcon="magnifying-glass"
            onComplete={() => setShowBadgeUnlock(false)}
          />
        ) : (
          <SectionErrorBoundary name="Completion">
            {saveStatus === "failed" ? (
              <SaveFailedScreen
                errorType={saveErrorType ?? "unknown"}
                detail={saveErrorMessage}
                onRetry={retryPersist}
                onSignIn={handleSignIn}
                onLeave={handleLeave}
              />
            ) : saveStatus === "saved" ? (
              <CompletionScreen
                tone={studentTone}
                // The resolved class, same as the reveal and the dashboard --
                // this card used to show the raw "HELPER-INVESTIGATOR" label.
                classLabel={characterClassDisplayName(emergentClass, studentTone)}
                scoreState={{
                  riasec: scoreState.riasec,
                  strengths: scoreState.strengths,
                }}
                riasecSnapshot={scoreState.riasec_snapshot}
                onViewDashboard={() => router.push("/quest/dashboard")}
                onSaveExit={handleSaveExit}
              />
            ) : (
              <SavingResults tone={studentTone} />
            )}
          </SectionErrorBoundary>
        )}
        <ConfirmationToast
          message="Your progress is saved!"
          visible={showSaveToast}
          onDismiss={() => setShowSaveToast(false)}
        />
      </>
    );
  }

  // Unknown or locked session (only Session 1 has questions in v1)
  if (sessionQuestions.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <span className="text-5xl mb-4">{"\u{1F512}"}</span>
        <h1 className="text-xl font-semibold text-white mb-2">
          This chapter isn&apos;t unlocked yet
        </h1>
        <p className="text-sm text-white/50 mb-6">
          Your quest continues in {chapterLabel(1, studentTone)} for now &mdash; more chapters are
          coming soon.
        </p>
        <Link
          href="/"
          className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-white font-medium min-h-[44px]"
        >
          Back to home
        </Link>
      </div>
    );
  }

  // Main question flow
  if (!currentQuestion) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-white/50">Loading questions...</p>
      </div>
    );
  }

  const canUndo =
    questState.last_response_undoable &&
    currentBlock?.canUndo === true &&
    currentIndex > (currentBlock?.startIndex ?? 0);

  const canSkip = currentBlock?.canSkip === true;

  return (
    <div>
      <div className="absolute top-16 left-4 right-4 z-20">
        <ProgressBar
          currentBlock={currentBlock?.name ?? ""}
          questionsAnsweredInBlock={
            currentIndex - (currentBlock?.startIndex ?? 0)
          }
          totalQuestionsInBlock={
            (currentBlock?.endIndex ?? 0) - (currentBlock?.startIndex ?? 0) + 1
          }
          totalQuestionsAnswered={currentIndex}
          totalQuestions={sessionQuestions.length}
          timeEstimate={timeEstimate}
        />
      </div>
      <SectionErrorBoundary name="Question">
        <QuestionCard
          questionText={currentQuestion.question_text}
          questionIndex={currentIndex}
          totalQuestions={sessionQuestions.length}
          blockName=""
          timeEstimate=""
          direction={direction}
          canUndo={canUndo}
          onUndo={handleUndo}
          canSkip={canSkip}
          onSkip={handleSkip}
        >
          {renderInput(currentQuestion, handleAnswer)}
        </QuestionCard>
      </SectionErrorBoundary>
    </div>
  );
}
