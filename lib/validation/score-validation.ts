export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface ScoreInputs {
  riasec: Record<string, number>;
  mi: Record<string, number>;
  mbti: Record<string, number>;
  values: Record<string, number>;
}

const EXPECTED_RIASEC = ["R", "I", "A", "S", "E", "C"];
const EXPECTED_MI = [
  "linguistic",
  "logical",
  "spatial",
  "musical",
  "bodily",
  "interpersonal",
  "intrapersonal",
  "naturalistic",
];
const EXPECTED_MBTI = ["EI", "SN", "TF", "JP"];
const EXPECTED_VALUES = [
  "security_adventure",
  "income_impact",
  "prestige_fulfilment",
  "structure_flexibility",
  "solo_team",
];
const MIN_RESPONSE_COUNT = 10;

/**
 * Validate score data before persisting to Supabase.
 * Catches NaN values, missing framework keys, and suspiciously low response counts.
 * @param scores - The four framework score records to validate
 * @param responseCount - Total number of responses collected
 * @returns ValidationResult with valid flag and error descriptions
 */
export function validateScoresBeforePersist(
  scores: ScoreInputs,
  responseCount: number
): ValidationResult {
  const errors: string[] = [];

  // Check NaN in all frameworks
  for (const [framework, record] of Object.entries(scores)) {
    for (const [key, value] of Object.entries(record)) {
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors.push(`${framework}.${key} is NaN or not a number`);
      }
    }
  }

  // Check expected keys present in each framework
  const checks: [string, string[], Record<string, number>][] = [
    ["riasec", EXPECTED_RIASEC, scores.riasec],
    ["mi", EXPECTED_MI, scores.mi],
    ["mbti", EXPECTED_MBTI, scores.mbti],
    ["values", EXPECTED_VALUES, scores.values],
  ];
  for (const [name, expected, record] of checks) {
    const missing = expected.filter((k) => !(k in record));
    if (missing.length > 0) {
      errors.push(`${name} missing keys: ${missing.join(", ")}`);
    }
  }

  // Check response count threshold
  if (responseCount < MIN_RESPONSE_COUNT) {
    errors.push(`Response count ${responseCount} is suspiciously low`);
  }

  return { valid: errors.length === 0, errors };
}
