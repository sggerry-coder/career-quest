/**
 * Plain-English definitions for every word the dashboard uses about a student.
 *
 * The dashboard tells a fifteen-year-old they are a Mage with a Truthseeker's
 * Lens, an Investigator, Still Emerging on two letters, and sitting somewhere
 * between Prestige and Fulfilment -- and until now the app defined none of it
 * anywhere. A student had no way to tell whether "Naturalistic" was a
 * compliment.
 *
 * Two rules hold this file together, and both are load-bearing:
 *
 * 1. **Explain the topic, never the reading.** "Prestige or Fulfilment is
 *    about what makes a job feel worth it" -- not "you scored 40, so you lean
 *    Fulfilment". The student's own number is already on the screen next to
 *    the word; what is missing is what the word is asking about. A definition
 *    that repeats the reading would also go stale the moment the scoring
 *    changes, and would have to be written twice for the "Not asked" state.
 *
 * 2. **Neither end of a two-ended line is the better end.** Every one of the
 *    five values lines and the four personality lines is phrased with the same
 *    "Some people ... and some ..." frame, deliberately, so no student can
 *    read a verdict into the sentence. "Some people care most about earning
 *    well, and some care most about the difference the work makes" is the
 *    shape; "some just want money" is the failure.
 *
 * One neutral voice, not two. The rest of the app's copy varies by tone
 * (`quest` / `explorer`, see lib/copy/chapter.ts) because it narrates the
 * student's story and the story should sound like theirs. These sentences are
 * not narration -- they are the definition of a word that is on the screen in
 * both tones, identically. A quest-flavoured definition would put a second
 * layer of unfamiliar language on top of the word the student already could
 * not read, which is the opposite of the point, and it would double the volume
 * of the writing that most needs to be exactly right. Where a heading itself
 * differs by tone ("Relics" / "What you showed"), the popup takes its heading
 * from what is actually on screen -- see the `label` prop on GlossaryTerm --
 * so the definition stays single and the framing stays the student's.
 *
 * Bodies are two sentences at most and avoid the vocabulary of the tests they
 * come from: no "dimension", no "trait", no "construct", no "instrument". A
 * definition that needs a technical word to stay accurate is a definition that
 * needs rewriting. data/__tests__/glossary.test.ts enforces both.
 *
 * Titles are exempt from that word ban: they mirror the heading the student
 * tapped ("Character Traits"), and renaming the screen is not this feature's
 * job.
 */

export interface GlossaryEntry {
  /** Heading shown at the top of the popup. Mirrors the on-screen wording. */
  title: string;
  /** The definition. Two sentences, maximum. */
  body: string;
}

export const GLOSSARY = {
  // === The interest chart, and the class read off it ======================
  "ability-scores": {
    title: "Ability Scores",
    body: "These six are about the kind of work that pulls you in, not what you are good at. A high number is not a better number — it only means more of your answers pointed that way.",
  },
  class: {
    title: "Your class",
    body: "Your class is a nickname built from the two kinds of work you leaned towards most. It is a short way of saying what you are drawn to, not a decision about your future.",
  },
  "interest-maker": {
    title: "Maker",
    body: "Maker is about work you do with your hands, tools or machines. Building, fixing and making things that exist in the real world.",
  },
  "interest-investigator": {
    title: "Investigator",
    body: "Investigator is about questions that take some digging to answer. Working things out, testing ideas, and finding out why something happens.",
  },
  "interest-creator": {
    title: "Creator",
    body: "Creator is about making something that is yours. Art, music, writing, design — anything where there is no single right answer.",
  },
  "interest-helper": {
    title: "Helper",
    body: "Helper is about work where you are with people and they are better off for it. Teaching, caring, coaching, listening.",
  },
  "interest-leader": {
    title: "Leader",
    body: "Leader is about getting people moving towards something. Persuading, running a team, starting things, selling an idea.",
  },
  "interest-organizer": {
    title: "Organizer",
    body: "Organizer is about work with clear steps and a tidy result. Records, plans, numbers, and the systems other people rely on.",
  },

  // === The personality card ==============================================
  "character-traits": {
    title: "Character Traits",
    body: "This card is about how you tend to work and decide, not how good you are at anything. Each line has two ends and most people sit somewhere in between.",
  },
  "traits-ei": {
    title: "Extraversion or Introversion",
    body: "This is about where your energy comes from. Some people feel recharged by being around other people, and some feel recharged by time on their own.",
  },
  "traits-sn": {
    title: "Sensing or Intuition",
    body: "This is about what you notice first. Some people go straight to the facts in front of them, and some go to the pattern or the idea behind them.",
  },
  "traits-tf": {
    title: "Thinking or Feeling",
    body: "This is about how you make up your mind. Some people weigh the logic first, and some weigh how people will be affected first.",
  },
  "traits-jp": {
    title: "Judging or Perceiving",
    body: "This is about how you like to handle plans. Some people like things settled early, and some like to keep their options open.",
  },
  "still-emerging": {
    title: "Still Emerging",
    body: "It means there were not enough answers yet to say which end of a line you sit closer to. It is a gap waiting to be filled in, not a result about you.",
  },

  // === The learning styles card ==========================================
  "learning-styles": {
    title: "Learning Styles",
    body: "This card is about the ways you find it easiest to take something in. Everyone uses all of them, and most people find a few come more naturally.",
  },
  "mi-linguistic": {
    title: "Linguistic",
    body: "Linguistic is about working with words. Reading, writing, explaining things, and picking up languages.",
  },
  "mi-logical": {
    title: "Logical-Mathematical",
    body: "This one is about numbers and reasons. Spotting patterns, solving problems step by step, and asking what proves it.",
  },
  "mi-spatial": {
    title: "Spatial",
    body: "Spatial is about picturing things in your head. Maps, diagrams, drawing, and imagining how something looks from another angle.",
  },
  "mi-musical": {
    title: "Musical",
    body: "Musical is about sound, rhythm and tune. Noticing them, remembering them, and making them yourself.",
  },
  "mi-bodily": {
    title: "Bodily-Kinesthetic",
    body: "This one is about learning by moving and doing. Sport, dance, making things by hand, and getting the feel of something by trying it.",
  },
  "mi-interpersonal": {
    title: "Interpersonal",
    body: "Interpersonal is about reading other people. Noticing how someone feels, and working well alongside them.",
  },
  "mi-intrapersonal": {
    title: "Intrapersonal",
    body: "Intrapersonal is about knowing yourself. Noticing what you want, what you feel, and why you react the way you do.",
  },
  "mi-naturalistic": {
    title: "Naturalistic",
    body: "Naturalistic is about noticing the living world and how it fits together. Animals, plants, weather, and sorting things into groups.",
  },

  // === The values compass ================================================
  //
  // All five share one sentence shape on purpose. It is the cheapest possible
  // guarantee that no end of any line reads as the right one to be on.
  "values-compass": {
    title: "Values Compass",
    body: "This card is about what you want work to be like, rather than what you are good at. Each line has two ends and neither end is the better one.",
  },
  "values-security-adventure": {
    title: "Security or Adventure",
    body: "This is about the kind of path you would rather be on. Some people want to know what is coming next, and some would rather be surprised.",
  },
  "values-income-impact": {
    title: "Income or Impact",
    body: "This is about what you want most out of a job. Some people care most about earning well, and some care most about the difference the work makes.",
  },
  "values-solo-team": {
    title: "Solo or Team",
    body: "This is about who you would rather be working with. Some people do their best work on their own, and some do it in a group.",
  },
  "values-prestige-fulfilment": {
    title: "Prestige or Fulfilment",
    body: "This is about what makes a job feel worth it. Some people want work that other people respect, and some want work that feels meaningful to them.",
  },
  "values-structure-flexibility": {
    title: "Structure or Flexibility",
    body: "This is about how you like your days set up. Some people work best with a clear plan and set hours, and some work best when they can change things as they go.",
  },

  // === Relics and strengths ==============================================
  relics: {
    title: "Relics",
    body: "These are keepsakes for the things you showed more than once while you were answering. They are a record of what you did, not a prize you can win or lose.",
  },
  strengths: {
    title: "Detected Strengths",
    body: "These are habits the quest noticed in the way you answered, not marks out of ten. They come from the answers you gave, so they can change as you answer more.",
  },
  "strength-achiever": {
    title: "Achiever",
    body: "Achiever is about finishing what you start. Getting to the end of a task and being able to point at the result.",
  },
  "strength-ideation": {
    title: "Ideation",
    body: "Ideation is about coming up with ideas. Lots of them, quickly, including the odd ones worth a try.",
  },
  "strength-empathy": {
    title: "Empathy",
    body: "Empathy is about picking up how someone else is feeling. Often before they have said it out loud.",
  },
  "strength-command": {
    title: "Command",
    body: "Command is about being willing to take charge. Saying what should happen next when a group is not sure.",
  },
  "strength-creativity": {
    title: "Creativity",
    body: "Creativity is about making something that was not there before. Putting your own stamp on it instead of following a template.",
  },
  "strength-analytical": {
    title: "Analytical",
    body: "Analytical is about wanting to see the reasons behind something. Checking, comparing, and asking how we know.",
  },
  "strength-communication": {
    title: "Communication",
    body: "Communication is about getting an idea across so other people follow it. In writing, out loud, or both.",
  },
  "strength-adaptability": {
    title: "Adaptability",
    body: "Adaptability is about coping when the plan changes. Staying steady and finding another way through.",
  },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryTermId = keyof typeof GLOSSARY;

/**
 * The term for a detected strength name, or null.
 *
 * assessment_scores.strengths is a text column: it holds whatever
 * lib/scoring/strengths produced when the row was written, which for older
 * rows is not necessarily one of today's eight categories. A name with no
 * definition renders as plain text rather than a trigger that opens nothing --
 * a button that explains a word it does not know would be worse than no
 * button. data/__tests__/glossary.test.ts checks that every *current*
 * category resolves, so adding a ninth without a definition fails there.
 */
export function strengthTermId(name: string): GlossaryTermId | null {
  const id = `strength-${name.trim().toLowerCase()}`;
  return Object.hasOwn(GLOSSARY, id) ? (id as GlossaryTermId) : null;
}
