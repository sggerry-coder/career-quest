export interface RiasecScores {
  R: number;
  I: number;
  A: number;
  S: number;
  E: number;
  C: number;
}

export interface MiScores {
  linguistic: number;
  logical: number;
  spatial: number;
  musical: number;
  bodily: number;
  interpersonal: number;
  intrapersonal: number;
  naturalistic: number;
}

export interface MbtiIndicators {
  EI: number;
  SN: number;
  TF: number;
  JP: number;
}

export interface ValuesCompass {
  security_adventure: number;
  income_impact: number;
  prestige_fulfilment: number;
  structure_flexibility: number;
  solo_team: number;
}

export interface AssessmentScores {
  id: string;
  student_id: string;
  riasec_scores: RiasecScores;
  mi_scores: MiScores;
  mbti_indicators: MbtiIndicators;
  strengths: string[];
  values_compass: ValuesCompass;
  updated_at: string;
}
