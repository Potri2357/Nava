export interface Candidate {
  id: string;
  full_name: string | null;
  email: string | null;
  raw_resume_text: string;
  file_hash: string | null;
  parsed_profile: ParsedProfile | null;
  github_username: string | null;
  github_signals: GithubSignals | null;
  embedding: number[] | null;
  anti_gaming_flag: boolean;
  anti_gaming_score: number | null;
  anti_gaming_reasons: string[] | null;
  source: 'upload' | 'bulk' | 'api';
  created_at: string;
  updated_at: string;
}

export interface ParsedProfile {
  full_name?: string | null;
  email?: string | null;
  skills: {
    name: string;
    canonical?: string;
    years: number | null;
  }[];
  experience: {
    company: string;
    title: string;
    seniority_level: number; // 1-8
    start_date: string; // YYYY-MM
    end_date: string | null; // null = current
    duration_months: number;
    description: string;
    is_gap: boolean;
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    graduation_year: number | null;
  }[];
  total_years_experience: number;
  certifications: string[];
  summary: string;
}

export interface GithubSignals {
  public_repos: number;
  total_stars: number;
  top_languages: { language: string; bytes: number }[];
  contribution_streak_days: number;
  recent_activity_score: number; // 0-1
  notable_repos: { name: string; stars: number; description: string }[];
  profile_created_at: string;
  followers: number;
}
