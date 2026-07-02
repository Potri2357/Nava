import type { ParsedProfile, GithubSignals } from "@/features/candidates/types";
import type { ParsedJD, ScoringWeights } from "@/features/jobs/types";

export interface RecruiterCandidate {
  id: string;
  full_name: string;
  title: string;
  location: string;
  raw_resume_text: string;
  parsed_profile: ParsedProfile;
  github_username: string | null;
  github_signals: GithubSignals | null;
  diversity_context: {
    review_name: string;
    graduation_decade: string;
    university_tier: "tier_1" | "tier_2" | "bootcamp" | "unknown";
  };
}

export interface RecruiterJob {
  id: string;
  title: string;
  company: string | null;
  raw_description: string;
  parsed_requirements: ParsedJD | null;
  scoring_weights: ScoringWeights;
}

export interface RankedCandidate {
  candidate: RecruiterCandidate;
  rank: number;
  composite_score: number;
  technical_fit: number;
  trajectory_score: number;
  behavioral_score: number;
  domain_score: number;
  platform_activity_score: number;
  anti_gaming_flag: boolean;
  anti_gaming_reasons: string[];
  rationale: string;
  strengths: string[];
  concerns: string[];
  gaps: string[];
  interview_questions: string[];
  topsisMetrics: {
    distanceToIdeal: number;
    distanceToAntiIdeal: number;
  };
}
