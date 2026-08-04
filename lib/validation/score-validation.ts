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
/**
 * The smallest number of responses that can still *be* a student's answers.
 *
 * This was 10, and it meant "a save this thin is probably corrupt". That
 * stopped being true when skipping became a named choice: "I'm not sure" is
 * offered on the riasec and riasec_mi blocks -- 19 of Chapter 1's 35 questions
 * -- and there is no cap on it, so how many responses a save carries is now
 * something the student decided rather than a sign that anything went wrong.
 * The old floor turned that decision into "We couldn't save your results" and
 * threw away every answer they *had* given, which is the worse outcome by a
 * long way: the scoring layer now treats missing data as missing, so a sparse
 * profile is accurate, it just has to say it is sparse.
 *
 * What is left to defend against is a responses array that is not the
 * student's answers at all -- a checkpoint whose responses were lost
 * (isValidSnapshot only requires an array, and RESTORE_STATE defaults a
 * missing one to []), or any other route that reaches "complete" with nothing
 * recorded. Zero is the only count the quest itself cannot produce: warm-up
 * (5), mbti_values (11) and the confirmatory round (5) have no skip, so even a
 * student who skips everything skippable arrives at the save with 21. It is
 * also the only count that can never be a choice, which is why it stays right
 * if canSkip ever widens to every block.
 */
const MIN_RESPONSE_COUNT = 1;

/**
 * Validate score data before persisting to Supabase.
 * Catches NaN values, missing framework keys, and an empty response set.
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

  // Nothing to save is a broken save, not a quiet one
  if (responseCount < MIN_RESPONSE_COUNT) {
    errors.push(`No responses to save (count ${responseCount})`);
  }

  return { valid: errors.length === 0, errors };
}
