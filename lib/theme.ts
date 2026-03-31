export type ThemeName = "purple-teal" | "magenta-violet" | "blue-indigo";

export interface ThemeConfig {
  name: ThemeName;
  primary: string;
  accent: string;
  glow: string;
  borderRadius: string;
}

export interface ClassDefinition {
  id: string;
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
    primary: "#8b5cf6",
    accent: "#2dd4bf",
    glow: "rgba(139,92,246,0.5)",
    borderRadius: "6px",
  },
  "magenta-violet": {
    name: "magenta-violet",
    primary: "#ec4899",
    accent: "#f0abfc",
    glow: "rgba(236,72,153,0.4)",
    borderRadius: "16px",
  },
  "blue-indigo": {
    name: "blue-indigo",
    primary: "#3b82f6",
    accent: "#38bdf8",
    glow: "rgba(59,130,246,0.4)",
    borderRadius: "12px",
  },
};

export function getThemeForClass(classId: string): ThemeConfig {
  const classDef = classDefinitions.find((c) => c.id === classId);
  if (!classDef) return themes["blue-indigo"];
  return themes[classDef.theme];
}

export function getClassName(
  classId: string,
  tone: "quest" | "explorer"
): string {
  const classDef = classDefinitions.find((c) => c.id === classId);
  if (!classDef) return classId;
  return classDef.name[tone];
}

export const classDefinitions: ClassDefinition[] = [
  {
    id: "warrior",
    name: { quest: "Warrior", explorer: "Strategist" },
    icon: "⚔️",
    theme: "purple-teal",
    group: "Shadow Court",
    tagline: {
      quest: "Strength through strategy, victory through will.",
      explorer: "Strategic thinking meets decisive action.",
    },
    narration: {
      warmup_intro: {
        quest: "The Warrior steps into the arena. Let's see what drives you...",
        explorer:
          "Welcome, Strategist. Let's start with a few quick questions...",
      },
      riasec_intro: {
        quest: "The Warrior enters the Arena of Interests...",
        explorer: "Now let's explore your professional interests...",
      },
      mbti_intro: {
        quest: "Abilities mapped. Let's discover your nature, Warrior...",
        explorer:
          "Interests mapped. Let's explore your working style, Strategist...",
      },
      reveal_intro: {
        quest: "The prophecy takes shape for the Warrior...",
        explorer: "Your profile is taking shape, Strategist...",
      },
      badge_unlock: {
        quest: "The Warrior has earned a new emblem!",
        explorer: "Achievement unlocked, Strategist!",
      },
    },
  },
  {
    id: "mage",
    name: { quest: "Mage", explorer: "Analyst" },
    icon: "🧙‍♂️",
    theme: "purple-teal",
    group: "Shadow Court",
    tagline: {
      quest: "Knowledge is the greatest magic of all.",
      explorer: "Deep analysis reveals hidden patterns.",
    },
    narration: {
      warmup_intro: {
        quest: "The Mage opens the tome of self-discovery...",
        explorer: "Welcome, Analyst. Let's begin exploring...",
      },
      riasec_intro: {
        quest: "The Mage enters the Arena of Interests...",
        explorer: "Now let's explore your professional interests...",
      },
      mbti_intro: {
        quest: "Abilities mapped. Let's discover your nature, Mage...",
        explorer:
          "Interests mapped. Let's explore your working style, Analyst...",
      },
      reveal_intro: {
        quest: "The prophecy takes shape for the Mage...",
        explorer: "Your profile is taking shape, Analyst...",
      },
      badge_unlock: {
        quest: "The Mage has earned a new emblem!",
        explorer: "Achievement unlocked, Analyst!",
      },
    },
  },
  {
    id: "ranger",
    name: { quest: "Ranger", explorer: "Pathfinder" },
    icon: "🏹",
    theme: "purple-teal",
    group: "Shadow Court",
    tagline: {
      quest: "Every trail leads to a new discovery.",
      explorer: "Finding the right path through careful exploration.",
    },
    narration: {
      warmup_intro: {
        quest: "The Ranger sets out on the path of discovery...",
        explorer: "Welcome, Pathfinder. Let's chart your course...",
      },
      riasec_intro: {
        quest: "The Ranger enters the Arena of Interests...",
        explorer: "Now let's explore your professional interests...",
      },
      mbti_intro: {
        quest: "Abilities mapped. Let's discover your nature, Ranger...",
        explorer:
          "Interests mapped. Let's explore your working style, Pathfinder...",
      },
      reveal_intro: {
        quest: "The prophecy takes shape for the Ranger...",
        explorer: "Your profile is taking shape, Pathfinder...",
      },
      badge_unlock: {
        quest: "The Ranger has earned a new emblem!",
        explorer: "Achievement unlocked, Pathfinder!",
      },
    },
  },
  {
    id: "sorceress",
    name: { quest: "Sorceress", explorer: "Visionary" },
    icon: "🔮",
    theme: "magenta-violet",
    group: "Crimson Order",
    tagline: {
      quest: "See beyond what others see, shape what others cannot.",
      explorer: "Turning creative vision into reality.",
    },
    narration: {
      warmup_intro: {
        quest: "The Sorceress gazes into the crystal of possibility...",
        explorer: "Welcome, Visionary. Let's discover your potential...",
      },
      riasec_intro: {
        quest: "The Sorceress enters the Arena of Interests...",
        explorer: "Now let's explore your professional interests...",
      },
      mbti_intro: {
        quest: "Abilities mapped. Let's discover your nature, Sorceress...",
        explorer:
          "Interests mapped. Let's explore your working style, Visionary...",
      },
      reveal_intro: {
        quest: "The prophecy takes shape for the Sorceress...",
        explorer: "Your profile is taking shape, Visionary...",
      },
      badge_unlock: {
        quest: "The Sorceress has earned a new emblem!",
        explorer: "Achievement unlocked, Visionary!",
      },
    },
  },
  {
    id: "valkyrie",
    name: { quest: "Valkyrie", explorer: "Defender" },
    icon: "🛡️",
    theme: "magenta-violet",
    group: "Crimson Order",
    tagline: {
      quest: "Guardian of purpose, champion of the worthy.",
      explorer: "Standing firm for what matters most.",
    },
    narration: {
      warmup_intro: {
        quest: "The Valkyrie raises her shield and begins the quest...",
        explorer: "Welcome, Defender. Let's explore what drives you...",
      },
      riasec_intro: {
        quest: "The Valkyrie enters the Arena of Interests...",
        explorer: "Now let's explore your professional interests...",
      },
      mbti_intro: {
        quest: "Abilities mapped. Let's discover your nature, Valkyrie...",
        explorer:
          "Interests mapped. Let's explore your working style, Defender...",
      },
      reveal_intro: {
        quest: "The prophecy takes shape for the Valkyrie...",
        explorer: "Your profile is taking shape, Defender...",
      },
      badge_unlock: {
        quest: "The Valkyrie has earned a new emblem!",
        explorer: "Achievement unlocked, Defender!",
      },
    },
  },
  {
    id: "huntress",
    name: { quest: "Huntress", explorer: "Scout" },
    icon: "🌙",
    theme: "magenta-violet",
    group: "Crimson Order",
    tagline: {
      quest: "Silent steps, sharp instincts, unerring aim.",
      explorer: "Keen observation reveals the best opportunities.",
    },
    narration: {
      warmup_intro: {
        quest: "The Huntress tracks the trail of self-knowledge...",
        explorer: "Welcome, Scout. Let's map your strengths...",
      },
      riasec_intro: {
        quest: "The Huntress enters the Arena of Interests...",
        explorer: "Now let's explore your professional interests...",
      },
      mbti_intro: {
        quest: "Abilities mapped. Let's discover your nature, Huntress...",
        explorer:
          "Interests mapped. Let's explore your working style, Scout...",
      },
      reveal_intro: {
        quest: "The prophecy takes shape for the Huntress...",
        explorer: "Your profile is taking shape, Scout...",
      },
      badge_unlock: {
        quest: "The Huntress has earned a new emblem!",
        explorer: "Achievement unlocked, Scout!",
      },
    },
  },
  {
    id: "wanderer",
    name: { quest: "Wanderer", explorer: "Explorer" },
    icon: "✨",
    theme: "blue-indigo",
    group: "Azure Path",
    tagline: {
      quest: "Not all who wander are lost — some are just getting started.",
      explorer: "Every direction holds possibility.",
    },
    narration: {
      warmup_intro: {
        quest: "The Wanderer begins a journey into the unknown...",
        explorer: "Welcome, Explorer. Let's see what we discover...",
      },
      riasec_intro: {
        quest: "The Wanderer enters the Arena of Interests...",
        explorer: "Now let's explore your professional interests...",
      },
      mbti_intro: {
        quest: "Abilities mapped. Let's discover your nature, Wanderer...",
        explorer:
          "Interests mapped. Let's explore your working style, Explorer...",
      },
      reveal_intro: {
        quest: "The prophecy takes shape for the Wanderer...",
        explorer: "Your profile is taking shape, Explorer...",
      },
      badge_unlock: {
        quest: "The Wanderer has earned a new emblem!",
        explorer: "Achievement unlocked, Explorer!",
      },
    },
  },
];
