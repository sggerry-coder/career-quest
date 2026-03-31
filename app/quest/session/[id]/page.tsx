"use client";

import { use, useState, useCallback, useEffect, useMemo } from "react";
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

// Block definitions with question index ranges
interface BlockDef {
  name: string;
  key: string;
  startIndex: number;
  endIndex: number;
  canSkip: boolean;
  canUndo: boolean;
}

type FlowPhase =
  | "questions"
  | "block_transition"
  | "engagement"
  | "discovery_prompt"
  | "selfmap"
  | "reveal"
  | "confirmatory"
  | "complete";

export default function Session({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    questState,
    submitResponse,
    undoResponse,
    skipQuestion,
    setDiscoveryMode,
    setSelfMap,
    setPhaseComplete,
    persistCheckpoint,
    getQuestionsForSession,
    getAdaptiveQuestions,
    getClassName,
    getNarration,
    getTone,
  } = useQuestState();

  const { scoreState, processResponse, recalculateAll } = useScores();

  const sessionQuestions = useMemo(
    () => getQuestionsForSession(Number(id)),
    [id, getQuestionsForSession]
  );

  const [flowPhase, setFlowPhase] = useState<FlowPhase>("questions");
  const [currentIndex, setCurrentIndex] = useState(
    questState.current_question_index
  );
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [transitionNarration, setTransitionNarration] = useState("");
  const [adaptiveQuestions, setAdaptiveQuestions] = useState<typeof sessionQuestions>([]);
  const [confirmIndex, setConfirmIndex] = useState(0);

  // Track consecutive neutral Likert responses for discovery mode trigger
  const [consecutiveNeutrals, setConsecutiveNeutrals] = useState(0);

  const currentQuestion = useMemo(() => {
    if (flowPhase === "confirmatory") {
      return adaptiveQuestions[confirmIndex] ?? null;
    }
    return sessionQuestions[currentIndex] ?? null;
  }, [flowPhase, sessionQuestions, currentIndex, adaptiveQuestions, confirmIndex]);

  // Build block definitions from question data
  const blocks = useMemo(() => {
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

  const currentBlock = useMemo(() => {
    return blocks.find(
      (b) => currentIndex >= b.startIndex && currentIndex <= b.endIndex
    );
  }, [blocks, currentIndex]);

  // Time estimate based on remaining questions * 25s
  const timeEstimate = useMemo(() => {
    const remaining = sessionQuestions.length - currentIndex;
    const seconds = remaining * 25;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min`;
  }, [sessionQuestions.length, currentIndex]);

  // Check for block transitions
  const checkBlockTransition = useCallback(
    (nextIndex: number) => {
      const currentBlockKey = sessionQuestions[currentIndex]?.block;
      const nextBlockKey = sessionQuestions[nextIndex]?.block;

      if (!nextBlockKey || currentBlockKey === nextBlockKey) return false;

      const tone = getTone();
      const transitions: Record<string, string> = {
        warmup_riasec: getNarration("riasec_intro"),
        warmup_riasec_mi: getNarration("riasec_intro"),
        riasec_mbti: getNarration("mbti_intro"),
        riasec_mi_mbti: getNarration("mbti_intro"),
        riasec_mbti_values: getNarration("mbti_intro"),
        mbti_values: tone === "quest"
          ? "One more thing \u2014 what drives you?"
          : "Almost done \u2014 a few questions about what matters to you.",
        values_selfmap: "Almost there... one moment of reflection.",
      };

      const key = `${currentBlockKey}_${nextBlockKey}`;
      const narration = transitions[key];
      if (narration) {
        setTransitionNarration(narration);
        setFlowPhase("block_transition");
        return true;
      }
      return false;
    },
    [currentIndex, sessionQuestions, getTone, getNarration]
  );

  // Check for engagement checkpoint (question 7 in RIASEC block)
  const checkEngagement = useCallback(
    (nextIndex: number) => {
      const q = sessionQuestions[nextIndex];
      if (q && q.block === "riasec" && nextIndex === (currentBlock?.startIndex ?? 0) + 7) {
        setFlowPhase("engagement");
        return true;
      }
      return false;
    },
    [sessionQuestions, currentBlock]
  );

  // Check for discovery mode trigger
  const checkDiscoveryMode = useCallback(
    (responseValue: number, questionType: string) => {
      if (questState.discovery_mode_active) return false;
      if (questionType !== "likert") return false;

      const newCount = responseValue === 3 ? consecutiveNeutrals + 1 : 0;
      setConsecutiveNeutrals(newCount);

      if (newCount >= 3) {
        setFlowPhase("discovery_prompt");
        return true;
      }
      return false;
    },
    [questState.discovery_mode_active, consecutiveNeutrals]
  );

  // Handle answer submission
  const handleAnswer = useCallback(
    (value: number | string, label?: string) => {
      if (!currentQuestion) return;

      const numericValue = typeof value === "string" ? 0 : value;
      const responseLabel = label ?? String(value);

      // Submit to quest state
      submitResponse({
        question_id: currentQuestion.id,
        response_value: numericValue,
        response_label: responseLabel,
        framework: currentQuestion.framework,
        framework_target: currentQuestion.framework_target,
        answered_at: Date.now(),
      });

      // Process scoring
      processResponse(currentQuestion, numericValue);

      // Check discovery mode trigger (only for Likert in RIASEC block)
      if (
        currentQuestion.question_type === "likert" &&
        currentQuestion.block === "riasec"
      ) {
        if (checkDiscoveryMode(numericValue, "likert")) return;
      }

      // Advance to next question
      const nextIndex = currentIndex + 1;
      setDirection("right");

      // Check if we've reached the end of all core questions
      if (nextIndex >= sessionQuestions.length) {
        // Move to self-map capture
        setFlowPhase("selfmap");
        return;
      }

      // Persistence checkpoints
      const currentBlockKey = sessionQuestions[currentIndex]?.block;
      const nextBlockKey = sessionQuestions[nextIndex]?.block;
      if (
        currentBlockKey === "riasec" &&
        nextBlockKey !== "riasec" &&
        nextBlockKey !== "riasec_mi"
      ) {
        persistCheckpoint("riasec");
      }
      if (
        (currentBlockKey === "values" || currentBlockKey === "mbti_values") &&
        nextBlockKey !== currentBlockKey
      ) {
        persistCheckpoint("full");
      }

      // Check block transition
      if (checkBlockTransition(nextIndex)) {
        setCurrentIndex(nextIndex);
        return;
      }

      // Check engagement checkpoint
      if (checkEngagement(nextIndex)) {
        setCurrentIndex(nextIndex);
        return;
      }

      setCurrentIndex(nextIndex);
    },
    [
      currentQuestion,
      currentIndex,
      sessionQuestions,
      submitResponse,
      processResponse,
      checkDiscoveryMode,
      checkBlockTransition,
      checkEngagement,
      persistCheckpoint,
    ]
  );

  // Handle ipsative ranking completion
  const handleIpsativeComplete = useCallback(
    (ranked: { value: string; rank: number }[]) => {
      if (!currentQuestion) return;

      const rankToScore: Record<number, number> = { 1: 5, 2: 3, 3: 1 };
      ranked.forEach((r) => {
        processResponse(
          {
            ...currentQuestion,
            framework_target: r.value,
          },
          rankToScore[r.rank]
        );
      });

      submitResponse({
        question_id: currentQuestion.id,
        response_value: 0,
        response_label: ranked.map((r) => `${r.rank}:${r.value}`).join(","),
        framework: currentQuestion.framework,
        framework_target: "ipsative",
        answered_at: Date.now(),
      });

      // Advance
      const nextIndex = currentIndex + 1;
      setDirection("right");
      if (nextIndex >= sessionQuestions.length) {
        setFlowPhase("selfmap");
        return;
      }
      if (checkBlockTransition(nextIndex)) {
        setCurrentIndex(nextIndex);
        return;
      }
      setCurrentIndex(nextIndex);
    },
    [
      currentQuestion,
      currentIndex,
      sessionQuestions,
      processResponse,
      submitResponse,
      checkBlockTransition,
    ]
  );

  // Handle undo
  const handleUndo = useCallback(() => {
    if (currentIndex <= 0) return;
    setDirection("left");
    undoResponse();
    setCurrentIndex(currentIndex - 1);
  }, [currentIndex, undoResponse]);

  // Handle skip
  const handleSkip = useCallback(() => {
    skipQuestion(currentQuestion?.id ?? "");
    const nextIndex = currentIndex + 1;
    setDirection("right");
    if (nextIndex >= sessionQuestions.length) {
      setFlowPhase("selfmap");
      return;
    }
    if (checkBlockTransition(nextIndex)) {
      setCurrentIndex(nextIndex);
      return;
    }
    setCurrentIndex(nextIndex);
  }, [
    currentQuestion,
    currentIndex,
    sessionQuestions,
    skipQuestion,
    checkBlockTransition,
  ]);

  // Handle block transition complete
  const handleTransitionComplete = useCallback(() => {
    setFlowPhase("questions");
  }, []);

  // Handle engagement continue
  const handleEngagementContinue = useCallback(() => {
    setFlowPhase("questions");
  }, []);

  // Handle discovery mode activation
  const handleDiscoveryContinue = useCallback(() => {
    setDiscoveryMode(true);
    setFlowPhase("questions");
  }, [setDiscoveryMode]);

  // Handle self-map completion
  const handleSelfMapComplete = useCallback(
    (data: { clarity: number; sources: string[]; perceived_strengths: string[] }) => {
      setSelfMap(data);
      setFlowPhase("reveal");
    },
    [setSelfMap]
  );

  // Handle reveal sequence completion (moves to confirmatory)
  const handleRevealComplete = useCallback(() => {
    const adaptive = getAdaptiveQuestions(scoreState);
    setAdaptiveQuestions(adaptive);
    setConfirmIndex(0);
    setFlowPhase("confirmatory");
  }, [getAdaptiveQuestions, scoreState]);

  // Handle confirmatory answer
  const handleConfirmatoryAnswer = useCallback(
    (value: number | string, label?: string) => {
      const q = adaptiveQuestions[confirmIndex];
      if (!q) return;

      const numericValue = typeof value === "string" ? 0 : value;
      submitResponse({
        question_id: q.id,
        response_value: numericValue,
        response_label: label ?? String(value),
        framework: q.framework,
        framework_target: q.framework_target,
        answered_at: Date.now(),
      });
      processResponse(q, numericValue);

      if (confirmIndex + 1 >= adaptiveQuestions.length) {
        // Final persistence + complete
        persistCheckpoint("final");
        setPhaseComplete();
        setFlowPhase("complete");
      } else {
        setDirection("right");
        setConfirmIndex(confirmIndex + 1);
      }
    },
    [
      adaptiveQuestions,
      confirmIndex,
      submitResponse,
      processResponse,
      persistCheckpoint,
      setPhaseComplete,
    ]
  );

  // Render the correct input component based on question_type
  const renderInput = useCallback(
    (
      question: (typeof sessionQuestions)[0],
      onSubmit: (value: number | string, label?: string) => void
    ) => {
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
        narrationText={transitionNarration}
        onComplete={handleTransitionComplete}
      />
    );
  }

  // Engagement checkpoint
  if (flowPhase === "engagement") {
    return (
      <EngagementCheckpoint
        className={getClassName()}
        onContinue={handleEngagementContinue}
      />
    );
  }

  // Discovery mode prompt
  if (flowPhase === "discovery_prompt") {
    return (
      <DiscoveryModePrompt
        className={getClassName()}
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
        className={getClassName()}
        tone={getTone()}
        onRevealComplete={handleRevealComplete}
        onSessionComplete={() => setFlowPhase("complete")}
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
