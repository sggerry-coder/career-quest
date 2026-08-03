import { isStillEmerging } from "@/lib/scoring/mbti";
import {
  characterClassDisplayName,
  type DerivedClass,
} from "@/lib/character/classes";

/**
 * A sentence about the student, built from their own answers.
 *
 * Template-generated on the client: Chapters 1-2 make no API calls. It
 * degrades honestly — a personality trait below the still-emerging threshold
 * is left out of the sentence rather than asserted, because a description
 * that invents a character is worse than a short one.
 */

export interface DescribeInput {
  derived: DerivedClass;
  tone: "quest" | "explorer";
  mbti: Record<string, number>;
  values: Record<string, number>;
}

/** Below this a values lean is too close to centre to state. */
const VALUES_THRESHOLD = 20;

function personalityClause(mbti: Record<string, number>): string | null {
  const ei = mbti.EI ?? 0;
  if (isStillEmerging(ei)) return null;
  return ei < 0
    ? "thinks things through alone before speaking"
    : "thinks out loud and works things out with other people";
}

function valuesClause(values: Record<string, number>): string | null {
  const sa = values.security_adventure ?? 0;
  if (Math.abs(sa) < VALUES_THRESHOLD) return null;
  return sa < 0
    ? "would rather have steady ground than a big gamble"
    : "would rather take the gamble than play it safe";
}

export function describeCharacter(input: DescribeInput): string {
  const { derived, tone, mbti, values } = input;

  if (!derived.isNamed) {
    return tone === "quest"
      ? "Still taking shape. Keep going and your path will show itself."
      : "Your profile is still taking shape. A few more answers will sharpen it.";
  }

  const className = characterClassDisplayName(derived, tone);
  const clauses = [personalityClause(mbti), valuesClause(values)].filter(
    (c): c is string => c !== null
  );

  if (clauses.length === 0) {
    return `A ${className}.`;
  }
  return `A ${className} who ${clauses.join(", and ")}.`;
}
