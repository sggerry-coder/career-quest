"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RiasecBars from "@/components/charts/riasec-bars";
import MiPreviewBars from "@/components/charts/mi-preview-bars";
import MbtiSliders from "@/components/charts/mbti-sliders";
import ValuesSliders from "@/components/charts/values-sliders";
import ClassLabel from "@/components/charts/class-label";
import EmergingType from "@/components/charts/emerging-type";
import BadgeRow from "@/components/badges/badge-row";
import XpBar from "@/components/ui/xp-bar";
import { badges as allBadgeDefinitions } from "@/data/badges";

interface StudentData {
  name: string;
  age: number;
  avatar_class: string;
  tone: "quest" | "explorer";
  current_session: number;
  self_map: {
    clarity: number;
    sources: string[];
    perceived_strengths: string[];
    curiosities: string[];
  } | null;
}

interface ScoresData {
  riasec_scores: Record<string, number>;
  mi_scores: Record<string, number>;
  mbti_indicators: Record<string, number>;
  values_compass: Record<string, number>;
  strengths: string[];
}

interface AchievementRow {
  badge_id: string;
}

// XP calculation based on spec
function calculateXp(currentSession: number, hasCompletedSession1: boolean): number {
  let xp = 100; // character creation
  if (hasCompletedSession1) {
    xp += 50 + 100 + 50 + 100 + 25 + 25; // warmup + riasec + mi + mbti + values + confirmatory
  }
  return xp;
}

// CLASS label derivation
function deriveClassLabel(scores: Record<string, number>): string {
  const DISPLAY_NAMES: Record<string, string> = {
    R: "MAKER",
    I: "INVESTIGATOR",
    A: "CREATOR",
    S: "HELPER",
    E: "LEADER",
    C: "ORGANIZER",
  };

  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);

  if (sorted.length < 2) return "SEEKER";

  const [top, second, third] = sorted;
  const gap23 = third ? second[1] - third[1] : second[1];

  if (top[1] > 50 && second[1] > 50 && gap23 > 10) {
    return `${DISPLAY_NAMES[top[0]] ?? top[0]}-${DISPLAY_NAMES[second[0]] ?? second[0]}`;
  }
  if (top[1] > 50) {
    if (top[1] - second[1] > 15) {
      return DISPLAY_NAMES[top[0]] ?? top[0];
    }
    return "EXPLORER";
  }
  if (sorted.every(([, v]) => v < 40)) {
    return "SEEKER";
  }
  return "EXPLORER";
}

// Derive MBTI type string with underscore for emerging
function deriveEmergingTypeCode(mbti: Record<string, number>): string {
  const threshold = 35;
  const letters: string[] = [];

  const pairs: [string, string, string][] = [
    ["EI", "E", "I"],
    ["SN", "S", "N"],
    ["TF", "T", "F"],
    ["JP", "J", "P"],
  ];

  for (const [key, left, right] of pairs) {
    const score = mbti[key] ?? 0;
    if (Math.abs(score) < threshold) {
      letters.push("_");
    } else {
      letters.push(score < 0 ? left : right);
    }
  }

  return letters.join(" ");
}

// CLASS name mapping for avatar
const CLASS_NAMES: Record<string, { quest: string; explorer: string }> = {
  warrior: { quest: "Warrior", explorer: "Strategist" },
  mage: { quest: "Mage", explorer: "Analyst" },
  ranger: { quest: "Ranger", explorer: "Pathfinder" },
  sorceress: { quest: "Sorceress", explorer: "Visionary" },
  valkyrie: { quest: "Valkyrie", explorer: "Defender" },
  huntress: { quest: "Huntress", explorer: "Scout" },
  wanderer: { quest: "Wanderer", explorer: "Explorer" },
};

const CLASS_ICONS: Record<string, string> = {
  warrior: "\u{2694}\u{FE0F}",
  mage: "\u{1F9D9}",
  ranger: "\u{1F3F9}",
  sorceress: "\u{1F52E}",
  valkyrie: "\u{1F6E1}\u{FE0F}",
  huntress: "\u{1F319}",
  wanderer: "\u{2728}",
};

export default function Dashboard() {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [scores, setScores] = useState<ScoresData | null>(null);
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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
            .select("name, age, avatar_class, tone, current_session, self_map")
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("assessment_scores")
            .select(
              "riasec_scores, mi_scores, mbti_indicators, values_compass, strengths"
            )
            .eq("student_id", user.id)
            .single(),
          supabase
            .from("achievements")
            .select("badge_id")
            .eq("student_id", user.id),
        ]);

        if (studentRes.data) {
          setStudent(studentRes.data as StudentData);
        }
        if (scoresRes.data) {
          setScores(scoresRes.data as ScoresData);
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

  if (!student || !scores) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <p className="text-white/50 mb-4">No quest data found.</p>
        <a
          href="/"
          className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-white font-medium"
        >
          Start Your Quest
        </a>
      </div>
    );
  }

  const className =
    CLASS_NAMES[student.avatar_class]?.[student.tone] ?? student.avatar_class;
  const classIcon = CLASS_ICONS[student.avatar_class] ?? "\u{2728}";
  const hasCompletedSession1 = student.current_session >= 1;
  const xp = calculateXp(student.current_session, hasCompletedSession1);
  const classLabel = deriveClassLabel(scores.riasec_scores);
  const emergingTypeCode = deriveEmergingTypeCode(scores.mbti_indicators);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#0f0a1e] to-[#1a1035] px-4 py-6 pb-20">
      <div className="mx-auto max-w-3xl">
        {/* === Top bar: avatar + class + level + XP === */}
        <div className="flex items-center gap-4 mb-6">
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
            <XpBar currentXp={xp} maxXp={1000} />
          </div>
        </div>

        {/* === Badge inventory === */}
        <div className="mb-8">
          <BadgeRow
            allBadges={allBadgeDefinitions}
            unlockedIds={unlockedBadgeIds}
          />
        </div>

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
              />
            </div>
          </div>
        </div>

        {/* === Second row === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {/* Left: MI preview */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <MiPreviewBars scores={scores.mi_scores} />
          </div>

          {/* Right: Values preview */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <ValuesSliders scores={scores.values_compass} />
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
              Deepens in Session 2
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
              Deepens in Session 2
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
                Session 1: Discovery Quest
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
                  Session {session.num}: {session.name}
                </span>
                <span className="ml-auto text-xs text-white/20">Locked</span>
              </div>
            ))}
          </div>
        </div>

        {/* === Action button === */}
        <div className="flex justify-center">
          <button
            disabled
            className="rounded-xl bg-white/10 px-8 py-3 font-medium text-white/30 cursor-not-allowed min-h-[44px]"
          >
            Begin Session 2 — Coming soon
          </button>
        </div>
      </div>
    </div>
  );
}
