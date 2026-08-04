"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import RiasecBars from "@/components/charts/riasec-bars";
import MiPreviewBars from "@/components/charts/mi-preview-bars";
import MbtiSliders from "@/components/charts/mbti-sliders";
import ValuesSliders from "@/components/charts/values-sliders";
import EmergingType from "@/components/charts/emerging-type";
import SelfVsMeasured from "@/components/charts/self-vs-measured";
import BadgeRow from "@/components/badges/badge-row";
import XpBar from "@/components/ui/xp-bar";
import { badges as allBadgeDefinitions } from "@/data/badges";
import { calculateXp, getCurrentMilestone, getUnlockedCosmetics } from "@/lib/xp";
import { deriveEmergingType } from "@/lib/scoring/mbti";
import { deriveClassLabel } from "@/lib/scoring/riasec";
import { applyClassTheme } from "@/lib/theme";
import { chapterLabel } from "@/lib/copy/chapter";
import { CHARACTER_CLASSES, type CharacterClassId } from "@/lib/character/classes";
import { relicsFromSelfMap } from "@/lib/character/relics";
import RelicShelf from "@/components/character/relic-shelf";
import { loadSessionSnapshot } from "@/lib/persistence/session-snapshot";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";

interface StudentData {
  name: string;
  age: number;
  avatar_class: string;
  tone: "quest" | "explorer";
  current_session: number;
  has_completed_session1: boolean;
  self_map: {
    clarity: number;
    sources: string[];
    perceived_strengths: string[];
    curiosities: string[];
    /** Per-strength demonstration counts; the relic shelf's only input. */
    strength_counts?: Record<string, number>;
  } | null;
}

interface ScoresData {
  riasec_scores: Record<string, number>;
  mi_scores: Record<string, number>;
  mbti_indicators: Record<string, number>;
  // Null for rows persisted before migration 00004 added the column;
  // deriveEmergingType then falls back to score-only detection.
  mbti_raw_counts: Record<string, number> | null;
  values_compass: Record<string, number>;
  strengths: string[];
}

interface AchievementRow {
  badge_id: string;
}

// Cosmetic unlock tiers (P2.2): each tier applies a real accent to the
// profile frame. Highest unlocked tier wins.
const COSMETIC_FRAME_CLASSES: Record<string, string> = {
  gold_trim:
    "rounded-2xl border-2 border-amber-400/60 bg-gradient-to-r from-amber-400/10 to-transparent shadow-[0_0_18px_rgba(251,191,36,0.25)] p-3",
  accent:
    "rounded-2xl border border-[var(--color-accent)]/50 bg-white/5 p-3",
  background: "rounded-2xl bg-white/5 border border-white/10 p-3",
};

function getFrameClass(unlocked: string[]): string {
  if (unlocked.includes("gold_trim")) return COSMETIC_FRAME_CLASSES.gold_trim;
  if (unlocked.includes("accent")) return COSMETIC_FRAME_CLASSES.accent;
  if (unlocked.includes("background")) return COSMETIC_FRAME_CLASSES.background;
  return "";
}

// Avatar class lookups go through CHARACTER_CLASSES (lib/character/classes.ts)
// -- the single source of truth for class name/icon -- rather than a local
// copy. An unrecognised or missing avatar_class resolves to "wanderer".
function resolveCharacterClass(avatarClass: string): CharacterClassId {
  return avatarClass in CHARACTER_CLASSES
    ? (avatarClass as CharacterClassId)
    : "wanderer";
}

export default function Dashboard() {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [scores, setScores] = useState<ScoresData | null>(null);
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // A finished quest whose results only ever reached this device. Computed in
  // the loader rather than at render so the prerendered HTML and the hydrated
  // client agree — localStorage does not exist at build time.
  const [hasUnsavedCheckpoint, setHasUnsavedCheckpoint] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const [studentRes, scoresRes, achievementsRes] = await Promise.all([
          supabase
            .from("students")
            .select("name, age, avatar_class, tone, current_session, has_completed_session1, self_map")
            .eq("id", user.id)
            .single(),
          supabase
            .from("assessment_scores")
            .select(
              "riasec_scores, mi_scores, mbti_indicators, mbti_raw_counts, values_compass, strengths"
            )
            .eq("student_id", user.id)
            .single(),
          supabase
            .from("achievements")
            .select("badge_id")
            .eq("student_id", user.id),
        ]);

        if (studentRes.data) {
          const studentData = studentRes.data as StudentData;
          setStudent(studentData);
          if (studentData.avatar_class) {
            applyClassTheme(studentData.avatar_class);
          }
        }
        if (scoresRes.data) {
          setScores(scoresRes.data as ScoresData);
        } else if (loadSessionSnapshot(user.id)) {
          // No scores row, but this device still holds the answers. The save
          // failed rather than the quest never happening, so offer recovery
          // instead of telling them to start over.
          setHasUnsavedCheckpoint(true);
        }
        if (achievementsRes.data) {
          setUnlockedBadgeIds(
            (achievementsRes.data as AchievementRow[]).map((a) => a.badge_id)
          );
        }
      } catch {
        // Silently handle — dashboard shows empty state
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
      </div>
    );
  }

  const tone = student?.tone ?? "quest";

  if (!student || !scores) {
    // Two very different situations shared one dead end before: never started,
    // and finished but the save failed. Only the second has answers to rescue.
    if (hasUnsavedCheckpoint) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">
            Your results haven&apos;t saved yet
          </h2>
          <p className="text-sm text-white/50 mb-6 max-w-xs">
            Your answers are still on this device. Finish saving them and your
            profile will appear here.
          </p>
          <Link
            href="/quest/session/1"
            className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-white font-medium min-h-[44px]"
          >
            Finish saving my results
          </Link>
        </div>
      );
    }

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <h2 className="text-xl font-semibold text-white mb-2">No results yet</h2>
        <p className="text-sm text-white/50 mb-6">Complete {chapterLabel(1, tone)} to see your profile. Start your quest!</p>
        <Link
          href="/"
          className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-white font-medium min-h-[44px]"
        >
          Start Your Quest
        </Link>
      </div>
    );
  }

  const classId = resolveCharacterClass(student.avatar_class);
  const className = CHARACTER_CLASSES[classId].name[student.tone];
  const classIcon = CHARACTER_CLASSES[classId].icon;
  const hasCompletedSession1 = student.has_completed_session1;
  const xp = calculateXp(student.current_session, hasCompletedSession1);
  const milestone = getCurrentMilestone(student.current_session);
  const frameClass = getFrameClass(getUnlockedCosmetics(xp));
  const classLabel = deriveClassLabel(scores.riasec_scores);
  const { display: emergingTypeCode, hasEmerging } = deriveEmergingType(
    scores.mbti_indicators,
    scores.mbti_raw_counts ?? undefined
  );

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#0f0a1e] to-[#1a1035] px-4 py-6 pb-20">
      <div className="mx-auto max-w-3xl">
        {/* === Top bar: avatar + class + level + XP ===
            Frame accent comes from unlocked cosmetic tiers (P2.2) */}
        <div className={`flex items-center gap-4 mb-6 ${frameClass}`}>
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 text-2xl flex-shrink-0">
            {classIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white truncate">
                {student.name}
              </h1>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50 flex-shrink-0">
                {className}
              </span>
            </div>
            <p className="text-xs text-white/40 mb-1">
              Level {student.age}
            </p>
            <XpBar
              currentXp={xp}
              maxXp={milestone.maxXp}
              milestoneLabel={milestone.label}
            />
          </div>
        </div>

        {/* === Quest Progress section (error boundary per D-02) === */}
        <SectionErrorBoundary name="Quest Progress">
          {/* === Badge inventory === */}
          <div className="mb-8">
            <BadgeRow
              allBadges={allBadgeDefinitions}
              unlockedIds={unlockedBadgeIds}
            />
          </div>

        {/* === Score Charts section (error boundary per D-02) === */}
        <SectionErrorBoundary name="Score Charts">
          {/* === Two-column grid === */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {/* Left: RIASEC + CLASS */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <RiasecBars
                scores={scores.riasec_scores}
                classLabel={classLabel}
              />
            </div>

            {/* Right: MBTI + Emerging type */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <MbtiSliders scores={scores.mbti_indicators} />
              <div className="mt-4 flex justify-center">
                <EmergingType
                  typeCode={emergingTypeCode}
                  descriptor=""
                  hasEmerging={hasEmerging}
                />
              </div>
            </div>
          </div>

          {/* === Second row === */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {/* Left: MI preview */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <MiPreviewBars scores={scores.mi_scores} tone={tone} />
            </div>

            {/* Right: Values preview */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <ValuesSliders scores={scores.values_compass} tone={tone} />
            </div>
          </div>

          {/* === Locked panels === */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="rounded-2xl bg-white/5 border border-white/5 p-5 opacity-40">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{"\u{1F512}"}</span>
                <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
                  Full Learning Styles
                </h3>
              </div>
              <p className="text-xs text-white/20">
                Deepens in {chapterLabel(2, tone)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/5 p-5 opacity-40">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{"\u{1F512}"}</span>
                <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
                  Full Values Compass
                </h3>
              </div>
              <p className="text-xs text-white/20">
                Deepens in {chapterLabel(2, tone)}
              </p>
            </div>
          </div>

          {/* === Strengths section === */}
          {scores.strengths && scores.strengths.length > 0 && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-6">
              <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">
                Detected Strengths
              </h3>
              <div className="flex flex-wrap gap-2">
                {scores.strengths.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs font-medium text-[var(--color-accent)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* === Self-perception vs measured profile (P2.1) === */}
          <div className="mb-6">
            <SelfVsMeasured
              selfMap={student.self_map}
              detectedStrengths={scores.strengths ?? []}
              tone={tone}
            />
          </div>

          {/* === Earned relics: traits shown during the quest, displayed only ===
              Built from the per-strength counts persisted in self_map, not
              from `strengths` -- that column is the deduped top five, so
              every entry appears once and the threshold of 2 is unreachable. */}
          <div className="mb-6">
            <RelicShelf
              relics={relicsFromSelfMap(student.self_map)}
              tone={student.tone}
            />
          </div>
        </SectionErrorBoundary>

        {/* === Quest Log === */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-6">
          <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">
            Quest Log
          </h3>
          <div className="flex flex-col gap-2">
            {/* Session 1 */}
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  hasCompletedSession1
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {hasCompletedSession1 ? "\u{2713}" : "\u{25CF}"}
              </span>
              <span className="text-sm text-white/70">
                {chapterLabel(1, tone)}: Discovery Quest
              </span>
              <span
                className={`ml-auto text-xs ${
                  hasCompletedSession1 ? "text-green-400" : "text-yellow-400"
                }`}
              >
                {hasCompletedSession1 ? "Complete" : "In progress"}
              </span>
            </div>
            {/* Sessions 2-4 locked */}
            {[
              { num: 2, name: "Deep Dive" },
              { num: 3, name: "Career Matching" },
              { num: 4, name: "Action Plan" },
            ].map((session) => (
              <div key={session.num} className="flex items-center gap-3 opacity-40">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-xs text-white/20">
                  {"\u{1F512}"}
                </span>
                <span className="text-sm text-white/30">
                  {chapterLabel(session.num, tone)}: {session.name}
                </span>
                <span className="ml-auto text-xs text-white/20">Locked</span>
              </div>
            ))}
          </div>
        </div>
        </SectionErrorBoundary>

        {/* === Action button === */}
        <div className="flex justify-center">
          <button
            disabled
            className="rounded-xl bg-white/10 px-8 py-3 font-medium text-white/30 cursor-not-allowed min-h-[44px]"
          >
            Begin {chapterLabel(2, tone)} — Coming soon
          </button>
        </div>
      </div>
    </div>
  );
}
