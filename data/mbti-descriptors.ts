export interface MbtiDescriptor {
  type: string;
  title: string;
  description: string;
}

export const mbtiDescriptors: Record<string, MbtiDescriptor> = {
  ISTJ: {
    type: "ISTJ",
    title: "The Responsible Realist",
    description:
      "Dependable, thorough, and systematic. You value tradition and work hard to fulfil your duties.",
  },
  ISFJ: {
    type: "ISFJ",
    title: "The Nurturing Protector",
    description:
      "Caring, loyal, and detail-oriented. You quietly support the people and causes you believe in.",
  },
  INFJ: {
    type: "INFJ",
    title: "The Insightful Visionary",
    description:
      "Idealistic, perceptive, and determined. You seek meaning and want to make a positive difference.",
  },
  INTJ: {
    type: "INTJ",
    title: "The Strategic Mastermind",
    description:
      "Independent, analytical, and driven. You see the big picture and create plans to achieve ambitious goals.",
  },
  ISTP: {
    type: "ISTP",
    title: "The Practical Analyser",
    description:
      "Logical, adaptable, and hands-on. You enjoy understanding how things work and solving real problems.",
  },
  ISFP: {
    type: "ISFP",
    title: "The Gentle Creator",
    description:
      "Quiet, sensitive, and expressive. You live by your values and find beauty in the world around you.",
  },
  INFP: {
    type: "INFP",
    title: "The Thoughtful Idealist",
    description:
      "Empathetic, creative, and passionate. You care deeply about authenticity and making the world better.",
  },
  INTP: {
    type: "INTP",
    title: "The Curious Thinker",
    description:
      "Inventive, analytical, and independent. You love exploring ideas and finding logical solutions to complex problems.",
  },
  ESTP: {
    type: "ESTP",
    title: "The Energetic Problem-Solver",
    description:
      "Bold, practical, and spontaneous. You dive into action and think on your feet.",
  },
  ESFP: {
    type: "ESFP",
    title: "The Enthusiastic Performer",
    description:
      "Playful, energetic, and people-loving. You bring fun to everything and live fully in the moment.",
  },
  ENFP: {
    type: "ENFP",
    title: "The Inspired Champion",
    description:
      "Imaginative, enthusiastic, and warm. You see possibilities everywhere and inspire others to act.",
  },
  ENTP: {
    type: "ENTP",
    title: "The Inventive Debater",
    description:
      "Quick-witted, curious, and challenge-loving. You enjoy exploring new ideas and questioning assumptions.",
  },
  ESTJ: {
    type: "ESTJ",
    title: "The Organised Leader",
    description:
      "Decisive, organised, and results-driven. You take charge and create order from chaos.",
  },
  ESFJ: {
    type: "ESFJ",
    title: "The Supportive Connector",
    description:
      "Warm, loyal, and community-minded. You bring people together and make sure everyone is looked after.",
  },
  ENFJ: {
    type: "ENFJ",
    title: "The Inspiring Mentor",
    description:
      "Charismatic, empathetic, and driven to help. You see potential in people and help them grow.",
  },
  ENTJ: {
    type: "ENTJ",
    title: "The Bold Commander",
    description:
      "Strategic, confident, and ambitious. You lead with vision and make things happen at scale.",
  },
};

/**
 * Get descriptor for a potentially partial MBTI type.
 * Partial types use "_" for emerging dichotomies (e.g., "I_FJ").
 * Returns the descriptor for full types, or a generated partial descriptor.
 */
export function getMbtiDescriptor(type: string): MbtiDescriptor {
  // Full type lookup
  if (mbtiDescriptors[type]) {
    return mbtiDescriptors[type];
  }

  // Partial type — generate a label
  return {
    type,
    title: "Emerging Type",
    description:
      "Your personality profile is still taking shape. More questions will sharpen the picture.",
  };
}
