export type CareerDirectionStatus = "candidate" | "selected" | "eliminated";

export interface CareerDirection {
  id: string;
  student_id: string;
  direction_name: string;
  status: CareerDirectionStatus;
  ai_analysis: CareerAnalysis | null;
  programmes: Programme[] | null;
  created_at: string;
}

export interface CareerAnalysis {
  summary: string;
  progression_timeline: string[];
  salary_range: { entry: string; mid: string; senior: string };
  growth_outlook: string;
  ai_risk: string;
  work_life_balance: number;
  stress_level: number;
  why_it_fits: string;
}

export interface Programme {
  university: string;
  programme_name: string;
  country: string;
  duration: string;
  entry_requirements: string;
  url: string | null;
}

export interface Achievement {
  id: string;
  student_id: string;
  badge_id: string;
  unlocked_at: string;
}
