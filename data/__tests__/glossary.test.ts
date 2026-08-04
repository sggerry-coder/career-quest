/**
 * The writing is the feature, so the writing is what is tested.
 *
 * These definitions are about to become the most-read sentences in the app --
 * every student who does not know what "Naturalistic" or "Prestige" means will
 * open one -- and the two ways they can go wrong are both invisible to a
 * compiler:
 *
 *   1. drifting back into the vocabulary of the questionnaires they came from
 *      ("dimension", "trait", "construct"), which is the exact language a
 *      fifteen-year-old cannot read and the reason this feature exists;
 *   2. making one end of a two-ended line sound like the right end to be on.
 *      A student reads themselves into these. "Some people care most about
 *      earning well, and some care most about the difference the work makes"
 *      is symmetric on purpose; "some just want money" is the failure, and it
 *      is one sloppy edit away at any time.
 *
 * So the "Some people ..., and some ..." frame is asserted rather than merely
 * intended, on all nine two-ended lines.
 */
import { describe, it, expect } from "vitest";
import { GLOSSARY, strengthTermId, type GlossaryTermId } from "@/data/glossary";
import { strengthCategories } from "@/data/strength-categories";

const ENTRIES = Object.entries(GLOSSARY) as Array<
  [GlossaryTermId, (typeof GLOSSARY)[GlossaryTermId]]
>;

/** Sentences, by the only definition a reader uses. */
function sentences(body: string): string[] {
  return body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

describe("every definition", () => {
  it.each(ENTRIES)("%s is two sentences at most", (_id, entry) => {
    expect(sentences(entry.body).length).toBeLessThanOrEqual(2);
  });

  it.each(ENTRIES)("%s stays short enough to read in one go", (_id, entry) => {
    // Not a style rule. A popup a student has to scroll on a phone is a popup
    // they close before finishing, and then the word is still unexplained.
    expect(entry.body.length).toBeLessThanOrEqual(200);
  });

  it.each(ENTRIES)("%s uses none of the words it is here to replace", (_id, entry) => {
    // Titles are exempt and are not checked: they mirror the heading on the
    // screen ("Character Traits"), and renaming the dashboard is not this
    // feature's job.
    const banned = [
      "dimension",
      "trait",
      "construct",
      "instrument",
      "psychometric",
      "ipsative",
      "normative",
      "percentile",
      "subscale",
      "riasec",
      "mbti",
      "holland",
      "gardner",
    ];
    const found = banned.filter((word) =>
      new RegExp(`\\b${word}s?\\b`, "i").test(entry.body)
    );
    expect(found, `${entry.title}: ${found.join(", ")}`).toEqual([]);
  });

  it.each(ENTRIES)("%s explains the topic, not the student's reading", (_id, entry) => {
    // "You scored 40, which means you lean Fulfilment" is the thing this
    // feature is explicitly not. The student's own number is already on the
    // screen beside the word; what is missing is what the word asks about.
    //
    // Deliberately narrow. "You are good at" and "you would rather" are how
    // you explain a topic to a teenager and must stay allowed -- only the
    // phrasings that quote a reading back are barred.
    expect(entry.body).not.toMatch(/\byou (scored|rank|lean)\b/i);
    expect(entry.body).not.toMatch(/\byour (score|result|number|reading)\b/i);
    expect(entry.body).not.toMatch(/\bmeans you\b/i);
  });

  it.each(ENTRIES)("%s quotes no figure at all", (_id, entry) => {
    // A definition of a word never needs a numeral, and a numeral is the
    // clearest signal that a definition has started describing this student
    // rather than the topic. The crispest proxy available for the rule above.
    expect(entry.body).not.toMatch(/\d/);
  });
});

/**
 * The five values lines and the four personality lines. Every one of these is
 * a line a student will place themselves on.
 */
const TWO_ENDED: GlossaryTermId[] = [
  "values-security-adventure",
  "values-income-impact",
  "values-solo-team",
  "values-prestige-fulfilment",
  "values-structure-flexibility",
  "traits-ei",
  "traits-sn",
  "traits-tf",
  "traits-jp",
];

describe("a two-ended line", () => {
  it.each(TWO_ENDED)("%s gives both ends the same sentence", (id) => {
    // One shape, both halves: "Some people <X>, and some <Y>". Symmetry in the
    // grammar is the cheapest available guarantee of symmetry in the meaning.
    expect(GLOSSARY[id].body).toMatch(/Some people .+, and some .+\./);
  });

  it.each(TWO_ENDED)("%s never calls one end better", (id) => {
    // Comparatives, not the word "best". "Some people do their best work on
    // their own" is the plainest way to say it and ranks nothing; "the better
    // one", "worse", "the right answer" all rank an end and none of them
    // belong on a line a student is placing themselves on.
    expect(GLOSSARY[id].body).not.toMatch(
      /\b(the better|is better|better than|the best|worse|worst|the right (way|answer|end)|healthier|smarter|more mature)\b/i
    );
  });

  it.each(TWO_ENDED)("%s names both ends in its title", (id) => {
    // "Income or Impact", not "Income". A popup headed with one end reads as
    // a verdict before the body has said anything.
    expect(GLOSSARY[id].title).toMatch(/ or /);
  });
});

describe("the cards that hold those lines", () => {
  it.each(["values-compass", "character-traits"] as GlossaryTermId[])(
    "%s says up front that there is no right answer",
    (id) => {
      expect(GLOSSARY[id].body).toMatch(/neither end|in between/i);
    }
  );
});

describe("strengthTermId", () => {
  it("resolves every strength the scoring can currently produce", () => {
    // The guard that makes a ninth category impossible to add silently: it
    // would land on the dashboard as a chip with no definition behind it.
    for (const category of strengthCategories) {
      expect(
        strengthTermId(category.name),
        `no definition for the strength "${category.name}"`
      ).not.toBeNull();
    }
  });

  it("returns null rather than guessing for a name it does not know", () => {
    // assessment_scores.strengths is a text column and older rows hold names
    // from earlier scoring runs -- "Creative Thinking" is one that is in the
    // fixtures today. Those must render as plain text, not as a button that
    // opens nothing.
    expect(strengthTermId("Creative Thinking")).toBeNull();
    expect(strengthTermId("")).toBeNull();
  });

  it("is not fooled by casing or stray spaces", () => {
    expect(strengthTermId("  ideation ")).toBe("strength-ideation");
  });
});
