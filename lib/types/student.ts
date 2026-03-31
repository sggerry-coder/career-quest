export interface Student {
  id: string;
  name: string;
  age: number;
  education_system: string;
  preferred_country: string | null;
  preferred_universities: string[] | null;
  current_session: number;
  strong_subjects: string[] | null;
  weak_subjects: string[] | null;
  predicted_grades: Record<string, string> | null;
  study_confidence: number | null;
  grades_reflect_effort: boolean | null;
  facilitator_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyContext {
  id: string;
  student_id: string;
  family_career_expectations: string | null;
  support_level: "very_supportive" | "some_expectations" | "strong_expectations" | null;
  financial_constraints: string | null;
  created_at: string;
}

export interface Facilitator {
  id: string;
  name: string;
  email: string;
  organisation: string | null;
  created_at: string;
}
