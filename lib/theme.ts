import { CLASS_THEME, themeForCharacterClass } from "@/lib/character/theme-map";
import {
  isCharacterClassId,
  type CharacterClassId,
} from "@/lib/character/classes";

export type ThemeName =
  | "purple-teal"
  | "magenta-violet"
  | "blue-indigo"
  | "wanderer-slate"
  | "guardian-jade"
  | "paladin-steel"
  | "vanguard-gold"
  | "bard-magenta"
  | "warsmith-copper"
  | "rogue-teal";

export interface ThemeConfig {
  name: ThemeName;
  primary: string;
  accent: string;
  glow: string;
  borderRadius: string;
}

export interface ClassDefinition {
  /**
   * Typed as CharacterClassId, not string: it is the only compile-time
   * guard against classDefinitions and CHARACTER_CLASSES drifting apart.
   */
  id: CharacterClassId;
  name: { quest: string; explorer: string };
  icon: string;
  theme: ThemeName;
  group: string;
  tagline: { quest: string; explorer: string };
  narration: {
    warmup_intro: { quest: string; explorer: string };
    riasec_intro: { quest: string; explorer: string };
    mbti_intro: { quest: string; explorer: string };
    reveal_intro: { quest: string; explorer: string };
    badge_unlock: { quest: string; explorer: string };
  };
}

export const themes: Record<ThemeName, ThemeConfig> = {
  "purple-teal": {
    name: "purple-teal",
    primary: "#7c3aed",
    accent: "#2dd4bf",
    glow: "rgba(124,58,237,0.5)",
    borderRadius: "6px",
  },
  "magenta-violet": {
    name: "magenta-violet",
    primary: "#be185d",
    accent: "#f0abfc",
    glow: "rgba(190,24,93,0.4)",
    borderRadius: "16px",
  },
  "blue-indigo": {
    name: "blue-indigo",
    primary: "#2563eb",
    accent: "#38bdf8",
    glow: "rgba(37,99,235,0.4)",
    borderRadius: "12px",
  },
  "wanderer-slate": { name: "wanderer-slate", primary: "#475569", accent: "#94a3b8", glow: "rgba(71,85,105,0.4)", borderRadius: "10px" },
  "guardian-jade": { name: "guardian-jade", primary: "#047857", accent: "#6ee7b7", glow: "rgba(4,120,87,0.45)", borderRadius: "16px" },
  "paladin-steel": { name: "paladin-steel", primary: "#1d4ed8", accent: "#38bdf8", glow: "rgba(29,78,216,0.4)", borderRadius: "4px" },
  "vanguard-gold": { name: "vanguard-gold", primary: "#b45309", accent: "#fbbf24", glow: "rgba(180,83,9,0.45)", borderRadius: "12px" },
  "bard-magenta": { name: "bard-magenta", primary: "#db2777", accent: "#f0abfc", glow: "rgba(219,39,119,0.45)", borderRadius: "20px" },
  "warsmith-copper": { name: "warsmith-copper", primary: "#c2410c", accent: "#fb923c", glow: "rgba(194,65,12,0.45)", borderRadius: "8px" },
  "rogue-teal": { name: "rogue-teal", primary: "#0f766e", accent: "#5eead4", glow: "rgba(15,118,110,0.45)", borderRadius: "14px" },
};

/**
 * The palette for a class. Routed through themeForCharacterClass so
 * lib/character/theme-map is the single source of the class -> theme
 * mapping; classDefinitions[].theme is filled from the same map rather than
 * being a second, parallel table that agreed only by luck.
 *
 * An unrecognised id is a Wanderer, not an Azure Path: not knowing which
 * class a student is means they have no colour yet.
 */
export function getThemeForClass(classId: string): ThemeConfig {
  const id: CharacterClassId = isCharacterClassId(classId)
    ? classId
    : "wanderer";
  return themes[themeForCharacterClass(id)];
}

// ---------------------------------------------------------------------------
// Instant-theme cache (P2.5)
//
// The theme name and tone are cached in localStorage so an inline script in
// the root layout can set data-theme synchronously before first paint,
// killing the default-purple flash. The Supabase profile fetch remains the
// source of truth and corrects any drift (re-caching as it does).
// ---------------------------------------------------------------------------

export const THEME_CACHE_KEY = "cq-theme";
export const TONE_CACHE_KEY = "cq-tone";

/** Cache the active theme name for pre-paint restoration. */
export function cacheThemeName(name: ThemeName): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_CACHE_KEY, name);
  } catch {
    // Silent catch -- caching is best-effort
  }
}

/** Read the cached theme name, or null when absent/invalid. */
export function readCachedThemeName(): ThemeName | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(THEME_CACHE_KEY);
    return value && value in themes ? (value as ThemeName) : null;
  } catch {
    return null;
  }
}

/** Cache the student's tone alongside the theme. */
export function cacheTone(tone: "quest" | "explorer"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TONE_CACHE_KEY, tone);
  } catch {
    // Silent catch
  }
}

/** Read the cached tone, or null when absent/invalid. */
export function readCachedTone(): "quest" | "explorer" | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(TONE_CACHE_KEY);
    return value === "quest" || value === "explorer" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Apply the visual theme for a student's chosen class to the document and
 * cache it for instant restoration on the next page load.
 * Used to restore the class theme for returning students, since the root
 * ThemeProvider only knows the default theme.
 */
export function applyClassTheme(classId: string): void {
  if (typeof document === "undefined") return;
  const theme = getThemeForClass(classId);
  document.documentElement.setAttribute("data-theme", theme.name);
  cacheThemeName(theme.name);
}

export function getClassName(
  classId: string,
  tone: "quest" | "explorer"
): string {
  const classDef = classDefinitions.find((c) => c.id === classId);
  if (!classDef) return classId;
  return classDef.name[tone];
}

/** Beats that play before the class is named. Identical for every class. */
const PRE_NAMING = {
  warmup_intro: {
    quest: "Your story starts here. Let's see who you are...",
    explorer: "Let's begin with a few quick questions...",
  },
  riasec_intro: {
    quest: "Something is taking shape. What pulls you forward?",
    explorer: "Now let's explore what interests you...",
  },
};

export const classDefinitions: ClassDefinition[] = [
  {
    id: "wanderer",
    name: { quest: "Wanderer", explorer: "Still forming" },
    icon: "\u{1F9ED}",
    theme: CLASS_THEME.wanderer,
    group: "Unclaimed",
    tagline: {
      quest: "No path chosen yet. Every road is still open.",
      explorer: "Your profile is still forming.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "Interests mapped, though the picture is faint. Let's look closer...",
        explorer: "Interests mapped. Let's explore how you work...",
      },
      reveal_intro: {
        quest: "The road is still unfolding...",
        explorer: "Here's what we have so far...",
      },
      badge_unlock: {
        quest: "A first mark on an unwritten story!",
        explorer: "Achievement unlocked!",
      },
    },
  },
  {
    id: "warsmith",
    name: { quest: "Warsmith", explorer: "Maker" },
    icon: "\u{1F528}",
    theme: CLASS_THEME.warsmith,
    group: "Forge",
    tagline: {
      quest: "What is broken can be made stronger than before.",
      explorer: "You learn by building and fixing.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "The forge knows your hands, Warsmith. Now let's learn your temper...",
        explorer: "Interests mapped. Let's explore how you work, Maker...",
      },
      reveal_intro: {
        quest: "The Warsmith's work is revealed...",
        explorer: "Your profile is taking shape, Maker...",
      },
      badge_unlock: {
        quest: "The Warsmith has forged a new mark!",
        explorer: "Achievement unlocked, Maker!",
      },
    },
  },
  {
    id: "mage",
    name: { quest: "Mage", explorer: "Investigator" },
    icon: "\u{1F52E}",
    theme: CLASS_THEME.mage,
    group: "Arcanum",
    tagline: {
      quest: "Every question is a door. You keep opening them.",
      explorer: "You want to know how things actually work.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "The tomes are open, Mage. Now let's read you...",
        explorer: "Interests mapped. Let's explore how you work, Investigator...",
      },
      reveal_intro: {
        quest: "The Mage's reading takes form...",
        explorer: "Your profile is taking shape, Investigator...",
      },
      badge_unlock: {
        quest: "The Mage has inscribed a new sigil!",
        explorer: "Achievement unlocked, Investigator!",
      },
    },
  },
  {
    id: "bard",
    name: { quest: "Bard", explorer: "Creator" },
    icon: "\u{1F3AD}",
    theme: CLASS_THEME.bard,
    group: "Chorus",
    tagline: {
      quest: "You make the thing that makes people feel something.",
      explorer: "You think by making.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "The song is yours, Bard. Now let's find its key...",
        explorer: "Interests mapped. Let's explore how you work, Creator...",
      },
      reveal_intro: {
        quest: "The Bard's verse comes together...",
        explorer: "Your profile is taking shape, Creator...",
      },
      badge_unlock: {
        quest: "The Bard has struck a new chord!",
        explorer: "Achievement unlocked, Creator!",
      },
    },
  },
  {
    id: "guardian",
    name: { quest: "Guardian", explorer: "Helper" },
    icon: "\u{1F6E1}\u{FE0F}",
    theme: CLASS_THEME.guardian,
    group: "Covenant",
    tagline: {
      quest: "You stand where someone else would have fallen.",
      explorer: "You're drawn to work that helps people directly.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "You keep watch over others, Guardian. Now let's look at you...",
        explorer: "Interests mapped. Let's explore how you work, Helper...",
      },
      reveal_intro: {
        quest: "The Guardian's shield bears its markings...",
        explorer: "Your profile is taking shape, Helper...",
      },
      badge_unlock: {
        quest: "The Guardian has earned a new emblem!",
        explorer: "Achievement unlocked, Helper!",
      },
    },
  },
  {
    id: "vanguard",
    name: { quest: "Vanguard", explorer: "Leader" },
    icon: "\u{1F6A9}",
    theme: CLASS_THEME.vanguard,
    group: "Charge",
    tagline: {
      quest: "Someone has to go first. You already have.",
      explorer: "You move things forward and bring people with you.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "The line follows you, Vanguard. Now let's learn your nature...",
        explorer: "Interests mapped. Let's explore how you work, Leader...",
      },
      reveal_intro: {
        quest: "The Vanguard's banner unfurls...",
        explorer: "Your profile is taking shape, Leader...",
      },
      badge_unlock: {
        quest: "The Vanguard has claimed a new honour!",
        explorer: "Achievement unlocked, Leader!",
      },
    },
  },
  {
    id: "paladin",
    name: { quest: "Paladin", explorer: "Organizer" },
    icon: "\u{2696}\u{FE0F}",
    theme: CLASS_THEME.paladin,
    group: "Order",
    tagline: {
      quest: "Order is not dull. Order is what holds when things break.",
      explorer: "You bring structure to things that lack it.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "Your oath is kept, Paladin. Now let's learn your nature...",
        explorer: "Interests mapped. Let's explore how you work, Organizer...",
      },
      reveal_intro: {
        quest: "The Paladin's oath is set down...",
        explorer: "Your profile is taking shape, Organizer...",
      },
      badge_unlock: {
        quest: "The Paladin has earned a new seal!",
        explorer: "Achievement unlocked, Organizer!",
      },
    },
  },
  {
    id: "rogue",
    name: { quest: "Rogue", explorer: "Explorer" },
    icon: "\u{1F5DD}\u{FE0F}",
    theme: CLASS_THEME.rogue,
    group: "Free Company",
    tagline: {
      quest: "You keep every door unlocked, including the ones nobody uses.",
      explorer: "You're interested in a lot of things, and that's real.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "You keep your options open, Rogue. Now let's learn your nature...",
        explorer: "Interests mapped. Let's explore how you work, Explorer...",
      },
      reveal_intro: {
        quest: "The Rogue's many paths lay out...",
        explorer: "Your profile is taking shape, Explorer...",
      },
      badge_unlock: {
        quest: "The Rogue has pocketed a new token!",
        explorer: "Achievement unlocked, Explorer!",
      },
    },
  },
];
