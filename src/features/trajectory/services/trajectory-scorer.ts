import { ParsedProfile } from '@/features/candidates/types';

export interface TrajectoryAnalysis {
  progression_pattern: 'accelerating' | 'linear' | 'plateaued' | 'declining' | 'insufficient_data';
  acceleration_rate: number;
  seniority_curve: number[];
  avg_tenure_months: number;
  notable_transitions: string[];
  trajectory_score: number; // 0-1
}

export function analyzeTrajectory(profile: ParsedProfile): TrajectoryAnalysis {
  const experiences = profile.experience || [];
  
  if (experiences.length < 2) {
    return {
      progression_pattern: 'insufficient_data',
      acceleration_rate: 1.0,
      seniority_curve: experiences.map(e => e.seniority_level),
      avg_tenure_months: experiences.reduce((acc, exp) => acc + exp.duration_months, 0) / (experiences.length || 1),
      notable_transitions: [],
      trajectory_score: 0.5,
    };
  }

  // Sort chronological (oldest first)
  const sorted = [...experiences].reverse();
  
  let totalMonths = 0;
  const transitions: string[] = [];
  let accelerationRate = 1.0;
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    totalMonths += curr.duration_months;
    
    if (curr.seniority_level > prev.seniority_level) {
      transitions.push(`Promoted from ${prev.title} to ${curr.title} after ${prev.duration_months} months`);
    }
  }

  const firstRole = sorted[0];
  const lastRole = sorted[sorted.length - 1];
  const totalSeniorityDelta = lastRole.seniority_level - firstRole.seniority_level;
  
  const avgTenure = totalMonths / (sorted.length || 1);
  
  let score = 0.5;
  let pattern: TrajectoryAnalysis['progression_pattern'] = 'linear';

  if (totalSeniorityDelta > 0) {
    // Upward progression
    if (avgTenure < 24 && totalSeniorityDelta >= 2) {
      pattern = 'accelerating';
      accelerationRate = 1.5;
      score = 0.9;
    } else {
      pattern = 'linear';
      accelerationRate = 1.0;
      score = 0.7;
    }
  } else if (totalSeniorityDelta === 0) {
    pattern = 'plateaued';
    accelerationRate = 0.8;
    score = 0.4;
  } else {
    pattern = 'declining';
    accelerationRate = 0.5;
    score = 0.2;
  }

  return {
    progression_pattern: pattern,
    acceleration_rate: accelerationRate,
    seniority_curve: sorted.map(e => e.seniority_level),
    avg_tenure_months: avgTenure,
    notable_transitions: transitions,
    trajectory_score: score,
  };
}
