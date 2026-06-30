import { z } from 'zod';
import { llmClient } from '@/lib/llm/client';
import { ParsedJD, ScoringWeights } from '@/features/jobs/types';
import { ParsedProfile, GithubSignals } from '@/features/candidates/types';
import { computeTOPSIS, CandidateScores } from './topsis-engine';

export interface DimensionScores {
  technical_fit: number;
  trajectory_score: number;
  behavioral_score: number;
  domain_score: number;
  platform_activity_score: number;
}

export interface CandidateScoringResult extends DimensionScores {
  rationale: string;
  strengths: string[];
  concerns: string[];
  gaps: string[];
  interview_questions: string[];
}

const CandidateScoringSchema = z.object({
  technical_fit: z.number().min(0).max(1),
  trajectory_score: z.number().min(0).max(1),
  behavioral_score: z.number().min(0).max(1),
  domain_score: z.number().min(0).max(1),
  platform_activity_score: z.number().min(0).max(1),
  rationale: z.string().describe('Exactly 2-3 sentences explaining the overall fit. Start with Strong/Moderate/Weak fit.'),
  strengths: z.array(z.string()).max(3),
  concerns: z.array(z.string()).max(3),
  gaps: z.array(z.string()).describe('Employment gaps with context if any'),
  interview_questions: z.array(z.string()).max(3).describe('Targeted behavioral questions to probe uncertainties'),
});

const SCORING_SYSTEM_PROMPT = `
You are a senior technical recruiter scoring a candidate against a job description.
You MUST return a JSON object with exact numeric scores between 0.00 and 1.00 for each dimension.

SCORING DIMENSIONS:
1. TECHNICAL_FIT: Direct skill overlap, depth of experience, semantic equivalence.
   Score 0.9+ for >90% match, 0.5-0.7 for partial matches, <0.3 for fundamental gaps.
2. TRAJECTORY: Career progression acceleration, scope expansion.
   Score 0.9+ for clear upward trajectory, 0.5 for linear, <0.3 for stagnation/regression.
3. BEHAVIORAL: Leadership, collaboration, quantified achievements.
4. DOMAIN: Industry vertical match. Adjacent domains get partial credit.
5. PLATFORM_ACTIVITY: GitHub/open source relevance. If no data, score 0.5.

Provide a 2-3 sentence rationale, top 3 strengths, up to 3 concerns, employment gaps with context, and 2-3 targeted behavioral interview questions.
`;

export async function scoreCandidateLLM(
  parsedJd: ParsedJD,
  parsedProfile: ParsedProfile,
  githubSignals?: GithubSignals | null
): Promise<CandidateScoringResult> {
  if (!process.env.GEMINI_API_KEY) {
    return scoreCandidateHeuristic(parsedJd, parsedProfile, githubSignals);
  }

  const userPrompt = `
JOB DESCRIPTION:
${JSON.stringify(parsedJd, null, 2)}

CANDIDATE PROFILE:
${JSON.stringify(parsedProfile, null, 2)}

GITHUB SIGNALS:
${githubSignals ? JSON.stringify(githubSignals, null, 2) : 'No GitHub data available (Default platform_activity to 0.5)'}
  `;

  return await llmClient.generateStructured<CandidateScoringResult>({
    systemPrompt: SCORING_SYSTEM_PROMPT,
    userPrompt,
    schema: CandidateScoringSchema,
    schemaName: 'CandidateScoringResult',
    config: {
      model: 'gemini-2.0-flash',
      temperature: 0.1, // Low temp for consistent scores
    },
  });
}

function scoreCandidateHeuristic(
  parsedJd: ParsedJD,
  parsedProfile: ParsedProfile,
  githubSignals?: GithubSignals | null
): CandidateScoringResult {
  const profileSkills = parsedProfile.skills.map((skill) => skill.name.toLowerCase());
  const profileText = JSON.stringify(parsedProfile).toLowerCase();
  const requiredMatches = parsedJd.required_skills.filter((skill) => {
    const normalized = skill.toLowerCase();
    return profileSkills.some((candidateSkill) => candidateSkill.includes(normalized) || normalized.includes(candidateSkill)) ||
      profileText.includes(normalized);
  });
  const technical_fit = requiredMatches.length / Math.max(parsedJd.required_skills.length, 1);
  const newestRole = parsedProfile.experience[0];
  const oldestRole = parsedProfile.experience[parsedProfile.experience.length - 1];
  const seniorityDelta = newestRole && oldestRole ? newestRole.seniority_level - oldestRole.seniority_level : 0;
  const trajectory_score = Math.min(Math.max(0.45 + seniorityDelta * 0.14, 0.2), 0.95);
  const behavioral_score = Math.min(
    0.35 +
      (profileText.match(/\d+/g)?.length ? 0.2 : 0) +
      (/led|managed|mentored|owned|improved|reduced/.test(profileText) ? 0.25 : 0),
    1,
  );
  const domain_score = profileText.includes(parsedJd.domain.toLowerCase()) ? 0.9 : 0.45;
  const platform_activity_score = githubSignals ? githubSignals.recent_activity_score : 0.5;
  const strengths = [
    requiredMatches.length > 0 ? `Matches ${requiredMatches.slice(0, 3).join(', ')}` : 'General software background',
    seniorityDelta > 0 ? 'Shows career progression' : 'Has relevant role history',
    githubSignals ? 'Has public platform activity' : 'Profile can be assessed without GitHub dependency',
  ];
  const concerns = [
    ...(technical_fit < 0.6 ? ['Some required skills need validation'] : []),
    ...(domain_score < 0.6 ? [`Limited direct ${parsedJd.domain} evidence`] : []),
  ];
  const gaps = parsedProfile.experience
    .filter((role) => role.is_gap)
    .map((role) => `${role.title}: ${role.description}`);

  return {
    technical_fit,
    trajectory_score,
    behavioral_score,
    domain_score,
    platform_activity_score,
    rationale: `${technical_fit >= 0.75 ? 'Strong' : technical_fit >= 0.5 ? 'Moderate' : 'Weak'} fit: heuristic scoring found ${requiredMatches.length} direct required-skill matches for this role. Review ${concerns[0]?.toLowerCase() ?? 'scope depth'} in interviews before making a final decision.`,
    strengths: strengths.slice(0, 3),
    concerns: concerns.slice(0, 3),
    gaps,
    interview_questions: [
      `Which project best demonstrates your depth in ${parsedJd.required_skills[0] ?? 'the core role requirements'}?`,
      'How has your scope grown across your last two roles?',
      concerns[0] ? `Can you give concrete evidence around this concern: ${concerns[0]}?` : 'What tradeoff in this role would you want to discuss with the hiring manager?',
    ],
  };
}

// Full ranking pipeline logic
export async function rankCandidates(
  jobWeights: ScoringWeights,
  candidates: { id: string; result: CandidateScoringResult }[]
) {
  const candidateScores: CandidateScores[] = candidates.map(c => ({
    candidateId: c.id,
    dimensions: [
      c.result.technical_fit,
      c.result.trajectory_score,
      c.result.behavioral_score,
      c.result.domain_score,
      c.result.platform_activity_score
    ]
  }));

  const weightsArray = [
    jobWeights.technical_fit,
    jobWeights.trajectory,
    jobWeights.behavioral,
    jobWeights.domain,
    jobWeights.platform_activity
  ];

  const criteriaTypes: ('benefit' | 'cost')[] = ['benefit', 'benefit', 'benefit', 'benefit', 'benefit'];

  const topsisResult = computeTOPSIS(candidateScores, weightsArray, criteriaTypes);

  // Map rankings back to detailed results
  return topsisResult.rankings.map(rankInfo => {
    const candidateData = candidates.find(c => c.id === rankInfo.candidateId)!;
    return {
      candidateId: rankInfo.candidateId,
      rank: rankInfo.rank,
      compositeScore: rankInfo.closenessCoefficient,
      detailedResult: candidateData.result,
      topsisMetrics: {
        distanceToIdeal: rankInfo.distanceToIdeal,
        distanceToAntiIdeal: rankInfo.distanceToAntiIdeal
      }
    };
  });
}
