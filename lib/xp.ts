/**
 * Honest XP / reward model (P2.2).
 *
 * The bar is scaled to the current milestone (Chapter 1 = 450 XP total),
 * never to a future total the student cannot yet earn. Cosmetic unlocks
 * are real: each unlocked tier applies a visible accent to the dashboard
 * profile frame (derived client-side from XP, no storage needed).
 */

export const CHARACTER_CREATION_XP = 100;

/** XP awarded for completing each session (v1 ships Session 1 only). */
export const SESSION_COMPLETION_XP: Record<number, number> = {
  // warmup 50 + riasec 100 + mi 50 + mbti 100 + values 25 + confirmatory 25
  1: 350,
};

export interface XpMilestone {
  label: string;
  maxXp: number;
}

/**
 * Total XP earned. Uses currentSession to count completed sessions:
 * students who completed Session 1 have current_session >= 1.
 */
export function calculateXp(
  currentSession: number,
  hasCompletedSession1: boolean
): number {
  let xp = CHARACTER_CREATION_XP;
  const completedSessions = hasCompletedSession1
    ? Math.max(currentSession, 1)
    : 0;
  for (let session = 1; session <= completedSessions; session++) {
    xp += SESSION_COMPLETION_XP[session] ?? 0;
  }
  return xp;
}

/**
 * The milestone the XP bar should be scaled to. v1 has one chapter;
 * later sessions extend SESSION_COMPLETION_XP and this table.
 */
export function getCurrentMilestone(currentSession: number): XpMilestone {
  // Sessions 2+ are locked in v1, so Chapter 1 is always the active milestone.
  void currentSession;
  return {
    label: "Chapter 1",
    maxXp: CHARACTER_CREATION_XP + (SESSION_COMPLETION_XP[1] ?? 0),
  };
}

export interface CosmeticUnlock {
  id: "background" | "accent" | "gold_trim";
  xp: number;
  label: string;
  emoji: string;
  description: string;
}

/** Cosmetic tiers, each applying a real accent to the dashboard frame. */
export const COSMETIC_UNLOCKS: CosmeticUnlock[] = [
  {
    id: "background",
    xp: 150,
    label: "Background",
    emoji: "\u{1F3A8}",
    description: "Tinted profile frame",
  },
  {
    id: "accent",
    xp: 300,
    label: "Accent",
    emoji: "\u{2728}",
    description: "Accent border on your profile frame",
  },
  {
    id: "gold_trim",
    xp: 450,
    label: "Gold Trim",
    emoji: "\u{1F451}",
    description: "Gold trim on your profile frame",
  },
];

/** Ids of the cosmetic tiers unlocked at the given XP. */
export function getUnlockedCosmetics(xp: number): CosmeticUnlock["id"][] {
  return COSMETIC_UNLOCKS.filter((c) => xp >= c.xp).map((c) => c.id);
}
