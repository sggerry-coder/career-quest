export type QuestionType =
  | "multiple_choice"
  | "likert"
  | "forced_choice"
  | "ipsative"
  | "spectrum"
  | "free_text"
  | "scenario";

export type QuestionBlock =
  | "warmup"
  | "riasec"
  | "riasec_mi"
  | "mbti_values"
  | "selfmap"
  | "reveal"
  | "confirmatory";

export type Framework = "none" | "riasec" | "mi" | "mbti" | "values" | "multi";

export interface QuestionOption {
  label: string;
  value: string | number;
  emoji?: string;
  framework_signals?: Record<string, number>;
  strength_signal?: string;
}

export interface Question {
  id: string;
  session_number: number;
  block: QuestionBlock;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOption[];
  reverse_scored: boolean;
  framework: Framework;
  framework_target: string;
  is_adaptive: boolean;
  age_range?: "13-14" | "15-16" | "17-18" | "all";
}

export interface ClientResponse {
  question_id: string;
  response_value: number;
  response_label: string;
  framework: string;
  framework_target: string;
  answered_at: number;
}

export interface SessionResponse {
  id: string;
  student_id: string;
  session_number: number;
  question_id: string;
  question_text: string;
  response_text: string;
  framework_signals: Record<string, number>;
  created_at: string;
}

export interface Scenario {
  id: string;
  career_field: string;
  title: string;
  description: string;
  morning_activities: string;
  afternoon_activities: string;
  riasec_mapping: Record<string, number>;
}
