/**
 * How much of Chapter 1 a profile actually rests on, and how to say so.
 *
 * "I'm not sure" is a real answer with no cap on it, so a student can reach
 * the end having answered a fraction of what they were asked. The scoring
 * layer handles that correctly — a type nobody was asked about is dropped from
 * the ranking rather than ranked last, an unanswered values dimension reads
 * "Not answered yet", a class with too little behind it stays Wanderer. What
 * none of that does is tell the *student*: the completion screen's summary is
 * one archetype card and one strength card, and it looks identical whether it
 * came from forty answers or six.
 */

/**
 * How many unanswered questions make a profile a sketch rather than a reading.
 *
 * Only two of Chapter 1's four blocks offer "I'm not sure": riasec (14
 * questions) and riasec_mi (5). Warm-up (5), mbti_values (11) and the
 * confirmatory round (5) cannot be skipped, so every gap in a finished quest
 * comes out of those 19 — and 10 is the point where more of them are missing
 * than were answered. Past it, the interest chart the archetype is read off is
 * running on a minority of its own evidence, which is where a flat statement
 * of who the student is stops being something we can make.
 *
 * Below it the summary is left alone. A student who skipped two questions has
 * not been given a thin profile, and saying so on their celebration screen
 * would be noise.
 *
 * 10 is the number the persistence floor used to carry, where it meant "this
 * save is probably corrupt" and refused it. It is a real threshold here.
 */
export const SPARSE_SKIP_THRESHOLD = 10;

/**
 * Whether a finished quest left more behind than the summary can speak for.
 *
 * @param answered - Responses actually recorded, including the confirmatory round.
 * @param asked - Questions the student was offered, same scope.
 */
export function isSparseProfile(answered: number, asked: number): boolean {
  return asked - answered >= SPARSE_SKIP_THRESHOLD;
}

/**
 * What the completion screen says instead of its usual subheading when the
 * profile is mostly gaps. Null when there is nothing to qualify.
 *
 * Neither variant treats it as a mistake. The student used a button the app
 * offered them, so this says what the profile is built on and what would make
 * it sharper, and stops — no apology, and nothing that reads as a fault
 * report. Both counts are named because "a little information" is vaguer than
 * the student's own arithmetic.
 */
export function sparseProfileNote(
  tone: "quest" | "explorer",
  answered: number,
  asked: number
): string | null {
  if (!isSparseProfile(answered, asked)) return null;
  return tone === "quest"
    ? `Built from ${answered} of ${asked} answers — a first sketch of your legend rather than the full map. Answer more whenever you like and it sharpens.`
    : `Built from ${answered} of ${asked} answers — enough for a first look, not the whole picture. You can answer more whenever you like and it gets sharper.`;
}
