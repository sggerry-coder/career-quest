export type QuestionType = "multiple_choice" | "free_text" | "scenario" | "spectrum";

export interface QuestionOption {
  label: string;
  value: string;
  framework_signals?: Record<string, number>;
}

export interface Question {
  id: string;
  session_number: number;
  phase: string;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOption[] | null;
  framework_mapping: Record<string, string[]>;
  age_range: "13-14" | "15-16" | "17-18" | "all";
  follow_up_triggers: Record<string, unknown> | null;
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
