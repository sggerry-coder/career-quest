/**
 * "Session" reads like counselling; this is meant to read like an adventure.
 *
 * Display text only. Route paths (/quest/session/1), database columns
 * (has_completed_session1, current_session), type names and variable names
 * keep the word "session" — renaming those would mean a migration for no
 * user-visible gain.
 */
export function chapterWord(tone: "quest" | "explorer"): string {
  return tone === "quest" ? "Chapter" : "Part";
}

export function chapterLabel(n: number, tone: "quest" | "explorer"): string {
  return `${chapterWord(tone)} ${n}`;
}
