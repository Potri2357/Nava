import type { ScoringWeights } from "@/features/jobs/types";

export const defaultWeights: ScoringWeights = {
  technical_fit: 0.35,
  trajectory: 0.25,
  behavioral: 0.2,
  domain: 0.15,
  platform_activity: 0.05,
};
