"use client";

import { use, useEffect, useCallback, useMemo } from "react";
import QuestionCard from "@/components/quest/question-card";
import LikertSlider from "@/components/quest/likert-slider";
import SpectrumSlider from "@/components/quest/spectrum-slider";
import IpsativePicker from "@/components/quest/ipsative-picker";
import OptionGrid from "@/components/quest/option-grid";
import ProgressBar from "@/components/quest/progress-bar";
import BlockTransition from "@/components/quest/block-transition";
import EngagementCheckpoint from "@/components/quest/engagement-checkpoint";
import DiscoveryModePrompt from "@/components/quest/discovery-mode-prompt";
import SelfMapCapture from "@/components/selfmap/self-map-capture";
import RevealSequence from "@/components/quest/reveal-sequence";
import { useQuestState } from "@/hooks/use-quest-state";
import { useScores } from "@/hooks/use-scores";
import { session1CoreQuestions } from "@/data/questions/session-1-core";
import { session1AdaptivePool } from "@/data/questions/session-1-adaptive";
import { selectAdaptiveQuestions } from "@/lib/scoring/adaptive";
import { classDefinitions } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import type { Question, ClientResponse } from "@/lib/types/quest";

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

  const { scoreState, processResponse, processResponseWithSignals, processIpsativeResponse } = useScores();

  // Fetch the student's avatar_class from Supabase on mount (FLOW-03)
  useEffect(() => {
    async function loadStudentClass(): Promise<void> {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("students")
          .select("avatar_class")
          .eq("id", user.id)
          .single();
        if (data?.avatar_class) {
          dispatch({ type: "SET_AVATAR_CLASS", avatarClass: data.avatar_class });
        }
      } catch {
        // Silent catch per project conventions -- falls back to "wanderer" default in reducer
      }
    }
    loadStudentClass();
  }, [dispatch]);

  // Derive class definition from avatarClass (fetched from Supabase or default "wanderer")
  const classDef = useMemo(() => {
    return classDefinitions.find((c) => c.id === avatarClass)
      ?? classDefinitions.find((c) => c.id === "wanderer")!;
  }, [avatarClass]);

  const avatarClassName = classDef.name.quest;

  /**
   * Resolve narration text for a block transition.
   * The reducer stores keys like "warmup_to_riasec"; we map them to
   * ClassDefinition narration keys and read the quest-tone text.
   */
  const getNarration = useCallback(
    (key: string): string => {
      const narrationKey = TRANSITION_KEY_MAP[key];
      if (narrationKey) {
        return classDef.narration[narrationKey]?.quest ?? "";
      }
      // Fallback: return the raw string (for any unmapped transitions)
      return key;
    },
    [classDef]
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

  // Handle undo
  const handleUndo = useCallback((): void => {
    dispatch({ type: "UNDO" });
  }, [dispatch]);

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

  // Handle self-map completion
  const handleSelfMapComplete = useCallback(
    (_data: { clarity: number; sources: string[]; perceived_strengths: string[] }): void => {
      dispatch({ type: "ENTER_REVEAL" });
    },
    [dispatch]
  );

  // Handle reveal sequence completion (moves to confirmatory)
  const handleRevealComplete = useCallback((): void => {
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
  }, [scoreState, dispatch]);

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

  // Block transition interstitial
  if (flowPhase === "block_transition") {
    return (
      <BlockTransition
        narrationText={getNarration(transitionNarration)}
        onComplete={handleTransitionComplete}
      />
    );
  }

  // Engagement checkpoint
  if (flowPhase === "engagement") {
    return (
      <EngagementCheckpoint
        className={avatarClassName}
        onContinue={handleEngagementContinue}
      />
    );
  }

  // Discovery mode prompt
  if (flowPhase === "discovery_prompt") {
    return (
      <DiscoveryModePrompt
        className={avatarClassName}
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
      <RevealSequence
        scoreState={scoreState}
        className={avatarClassName}
        tone="quest"
        onRevealComplete={handleRevealComplete}
        onSessionComplete={() => dispatch({ type: "COMPLETE_SESSION" })}
      />
    );
  }

  // Confirmatory round
  if (flowPhase === "confirmatory" && currentQuestion) {
    return (
      <div>
        <div className="absolute top-4 left-4 right-4">
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
          blockName="Confirmatory"
          timeEstimate="~2 min left"
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

  // Session complete
  if (flowPhase === "complete") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <span className="text-6xl mb-6">{"\u{1F389}"}</span>
        <h1 className="text-2xl font-bold text-white mb-2">
          Quest progress saved!
        </h1>
        <p className="text-white/60 mb-8">
          Session 1 complete. Your profile has been revealed.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <a
            href="/quest/dashboard"
            className="rounded-xl bg-[var(--color-primary)] px-8 py-3 font-medium text-white text-center shadow-[0_0_20px_var(--color-glow)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
          >
            View Dashboard
          </a>
          <div className="flex items-center gap-2 justify-center text-white/30 mt-4">
            <span className="text-lg">{"\u{1F512}"}</span>
            <span className="text-sm">Session 2 coming soon</span>
          </div>
        </div>
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
      <QuestionCard
        questionText={currentQuestion.question_text}
        questionIndex={currentIndex}
        totalQuestions={sessionQuestions.length}
        blockName={currentBlock?.name ?? ""}
        timeEstimate={`~${timeEstimate} left`}
        direction={direction}
        canUndo={canUndo}
        onUndo={handleUndo}
        canSkip={canSkip}
        onSkip={handleSkip}
      >
        {renderInput(currentQuestion, handleAnswer)}
      </QuestionCard>
    </div>
  );
}
