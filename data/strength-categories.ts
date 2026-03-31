export interface StrengthCategory {
  id: string;
  name: string;
  description: string;
  riasec_mapping: string[];
}

export const strengthCategories: StrengthCategory[] = [
  {
    id: "achiever",
    name: "Achiever",
    description: "You get things done and take pride in productivity.",
    riasec_mapping: ["R", "C"],
  },
  {
    id: "ideation",
    name: "Ideation",
    description: "You love generating new ideas and creative connections.",
    riasec_mapping: ["I", "A"],
  },
  {
    id: "empathy",
    name: "Empathy",
    description: "You naturally sense how others are feeling.",
    riasec_mapping: ["S"],
  },
  {
    id: "command",
    name: "Command",
    description: "You take charge and lead with confidence.",
    riasec_mapping: ["E"],
  },
  {
    id: "creativity",
    name: "Creativity",
    description: "You express yourself through original work and imagination.",
    riasec_mapping: ["A"],
  },
  {
    id: "analytical",
    name: "Analytical",
    description: "You search for reasons, evidence, and data before deciding.",
    riasec_mapping: ["I", "C"],
  },
  {
    id: "communication",
    name: "Communication",
    description: "You find it easy to put thoughts into words and connect with people.",
    riasec_mapping: ["E", "S"],
  },
  {
    id: "adaptability",
    name: "Adaptability",
    description: "You go with the flow and stay calm when plans change.",
    riasec_mapping: ["A", "S"],
  },
];
