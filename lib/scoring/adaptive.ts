import type { Question } from "@/lib/types/quest";

export interface AdaptiveInput {
  riasecScores: Record<string, number>;
  riasecRaw: Record<string, number[]>;
  miScores: Record<string, number>;
  miRaw: Record<string, number[]>;
  mbtiScores: Record<string, number>;
  mbtiRaw: Record<string, number[]>;
  pool: Question[];
}

interface AmbiguityEntry {
  framework: string;
  target: string;
  ambiguity: number;
}

const RIASEC_TYPES = ["R", "I", "A", "S", "E", "C"];
const MBTI_DICHOTOMIES = ["EI", "SN", "TF", "JP"];

const MAX_RIASEC_PER_TYPE = 2;
const MAX_MBTI_PER_DICHOTOMY = 2;
const MAX_MI_TOTAL = 1;
const TOTAL_QUESTIONS = 5;

/**
 * Calculate ambiguity for RIASEC: for adjacent pairs sorted by score,
 * ambiguity = gap / sqrt(response_count_for_lower_type).
 * Lower ambiguity = more ambiguous = higher priority.
 */
function calculateRiasecAmbiguities(
  scores: Record<string, number>,
  raw: Record<string, number[]>
): AmbiguityEntry[] {
  const sorted = RIASEC_TYPES.map((type) => ({
    type,
    score: scores[type] ?? 0,
    count: (raw[type] || []).length,
  })).sort((a, b) => b.score - a.score);

  const entries: AmbiguityEntry[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const higher = sorted[i];
    const lower = sorted[i + 1];
    const gap = higher.score - lower.score;
    const denominator = Math.sqrt(Math.max(lower.count, 1));
    const ambiguity = gap / denominator;

    // Add entry for the lower-scored type (needs more data to resolve)
    entries.push({
      framework: "riasec",
      target: lower.type,
      ambiguity,
    });
  }

  // Also add the top type with high ambiguity (it's already clear)
  entries.push({
    framework: "riasec",
    target: sorted[0].type,
    ambiguity: Infinity,
  });

  return entries;
}

/**
 * Calculate ambiguity for MBTI: ambiguity = abs(score) / sqrt(response_count).
 * Lower = more ambiguous.
 */
function calculateMbtiAmbiguities(
  scores: Record<string, number>,
  raw: Record<string, number[]>
): AmbiguityEntry[] {
  return MBTI_DICHOTOMIES.map((dich) => {
    const score = scores[dich] ?? 0;
    const count = (raw[dich] || []).length;
    const denominator = Math.sqrt(Math.max(count, 1));
    return {
      framework: "mbti",
      target: dich,
      ambiguity: Math.abs(score) / denominator,
    };
  });
}

/**
 * Calculate ambiguity for MI: for top 3 types, gap between adjacent / sqrt(count).
 * Lower = more ambiguous.
 */
function calculateMiAmbiguities(
  scores: Record<string, number>,
  raw: Record<string, number[]>
): AmbiguityEntry[] {
  const sorted = Object.entries(scores)
    .map(([dim, score]) => ({
      dim,
      score,
      count: (raw[dim] || []).length,
    }))
    .sort((a, b) => b.score - a.score);

  const entries: AmbiguityEntry[] = [];

  // Only consider top 3 MI dimensions for ambiguity
  for (let i = 0; i < Math.min(sorted.length - 1, 3); i++) {
    const higher = sorted[i];
    const lower = sorted[i + 1];
    const gap = higher.score - lower.score;
    const denominator = Math.sqrt(Math.max(lower.count, 1));
    entries.push({
      framework: "mi",
      target: lower.dim,
      ambiguity: gap / denominator,
    });
  }

  return entries;
}

/**
 * Select 5 adaptive questions from the pool, targeting the most ambiguous dimensions.
 *
 * Constraints:
 * - Max 2 per RIASEC type
 * - Max 2 per MBTI dichotomy
 * - Max 1 MI question total
 * - Exactly 5 questions returned
 */
export function selectAdaptiveQuestions(input: AdaptiveInput): Question[] {
  const {
    riasecScores,
    riasecRaw,
    miScores,
    miRaw,
    mbtiScores,
    mbtiRaw,
    pool,
  } = input;

  // Calculate ambiguity for all dimensions
  const allAmbiguities: AmbiguityEntry[] = [
    ...calculateRiasecAmbiguities(riasecScores, riasecRaw),
    ...calculateMbtiAmbiguities(mbtiScores, mbtiRaw),
    ...calculateMiAmbiguities(miScores, miRaw),
  ];

  // Sort by ambiguity ascending (most ambiguous first)
  allAmbiguities.sort((a, b) => a.ambiguity - b.ambiguity);

  const selected: Question[] = [];
  const usedIds = new Set<string>();
  const riasecCount: Record<string, number> = {};
  const mbtiCount: Record<string, number> = {};
  let miCount = 0;

  // Walk ranked list, pick 1 question per ambiguous dimension
  for (const entry of allAmbiguities) {
    if (selected.length >= TOTAL_QUESTIONS) break;

    // Check framework-specific caps
    if (entry.framework === "riasec") {
      if ((riasecCount[entry.target] || 0) >= MAX_RIASEC_PER_TYPE) continue;
    } else if (entry.framework === "mbti") {
      if ((mbtiCount[entry.target] || 0) >= MAX_MBTI_PER_DICHOTOMY) continue;
    } else if (entry.framework === "mi") {
      if (miCount >= MAX_MI_TOTAL) continue;
    }

    // Find an unused question from the pool matching this dimension
    const candidate = pool.find(
      (q) =>
        q.framework === entry.framework &&
        q.framework_target === entry.target &&
        !usedIds.has(q.id)
    );

    if (candidate) {
      selected.push(candidate);
      usedIds.add(candidate.id);

      if (entry.framework === "riasec") {
        riasecCount[entry.target] = (riasecCount[entry.target] || 0) + 1;
      } else if (entry.framework === "mbti") {
        mbtiCount[entry.target] = (mbtiCount[entry.target] || 0) + 1;
      } else if (entry.framework === "mi") {
        miCount++;
      }
    }
  }

  // If we still need more questions (unlikely but possible), fill from remaining pool
  if (selected.length < TOTAL_QUESTIONS) {
    for (const q of pool) {
      if (selected.length >= TOTAL_QUESTIONS) break;
      if (usedIds.has(q.id)) continue;

      // Respect caps
      if (q.framework === "riasec") {
        if ((riasecCount[q.framework_target] || 0) >= MAX_RIASEC_PER_TYPE)
          continue;
      } else if (q.framework === "mbti") {
        if ((mbtiCount[q.framework_target] || 0) >= MAX_MBTI_PER_DICHOTOMY)
          continue;
      } else if (q.framework === "mi") {
        if (miCount >= MAX_MI_TOTAL) continue;
      }

      selected.push(q);
      usedIds.add(q.id);

      if (q.framework === "riasec") {
        riasecCount[q.framework_target] =
          (riasecCount[q.framework_target] || 0) + 1;
      } else if (q.framework === "mbti") {
        mbtiCount[q.framework_target] =
          (mbtiCount[q.framework_target] || 0) + 1;
      } else if (q.framework === "mi") {
        miCount++;
      }
    }
  }

  return selected;
}
