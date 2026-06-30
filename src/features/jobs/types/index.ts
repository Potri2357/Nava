export interface Job {
  id: string;
  title: string;
  company: string | null;
  raw_description: string;
  parsed_requirements: ParsedJD | null;
  scoring_weights: ScoringWeights;
  embedding: number[] | null;
  status: 'draft' | 'active' | 'paused' | 'closed';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParsedJD {
  required_skills: string[];
  nice_to_have_skills: string[];
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'director' | 'vp';
  min_years_exp: number;
  max_years_exp: number | null;
  domain: string;
  key_responsibilities: string[];
  education: string | null;
  role_summary: string;
}

export interface ScoringWeights {
  technical_fit: number;
  trajectory: number;
  behavioral: number;
  domain: number;
  platform_activity: number;
}
