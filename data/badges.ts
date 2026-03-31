export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const badges: BadgeDefinition[] = [
  {
    id: "quest_started",
    name: "Quest Started",
    description: "Completed character creation",
    icon: "rocket",
  },
  {
    id: "self_discoverer",
    name: "Self-Discoverer",
    description: "Finished Session 1",
    icon: "magnifying-glass",
  },
  {
    id: "direction_finder",
    name: "Direction Finder",
    description: "Narrowed to 2-3 career fields",
    icon: "compass",
  },
  {
    id: "career_explorer",
    name: "Career Explorer",
    description: "Completed career deep-dives",
    icon: "map",
  },
  {
    id: "game_plan_ready",
    name: "Game Plan Ready",
    description: "Completed preparation roadmap",
    icon: "clipboard",
  },
  {
    id: "report_card",
    name: "Report Card",
    description: "Generated final career report",
    icon: "scroll",
  },
];
