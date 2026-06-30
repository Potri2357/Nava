import { detectGaming } from "@/features/anti-gaming/services/gaming-detector";
import type { ScoringWeights } from "@/features/jobs/types";
import { computeTOPSIS, type CandidateScores } from "@/features/ranking/services/topsis-engine";
import { analyzeTrajectory } from "@/features/trajectory/services/trajectory-scorer";
import { defaultWeights, demoCandidates, demoJobs, type DemoCandidate, type DemoJob } from "./data";

export interface DemoRankedCandidate {
  candidate: DemoCandidate;
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

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();

const skillAliases: Record<string, string[]> = {
  "people management": ["managed a team", "led engineers", "mentored", "team leadership"],
  "distributed systems": ["event driven", "kafka", "payments infrastructure", "service ownership"],
  observability: ["tracing", "incident response", "reliability", "operational maturity"],
  "llm apis": ["ai workflows", "model", "prompt", "evaluation"],
  evaluation: ["eval", "quality harness", "model quality"],
  fintech: ["payments", "ledger", "reconciliation", "settlement", "risk", "fraud"],
};

function hasSemanticMatch(candidate: DemoCandidate, skill: string) {
  const wanted = normalize(skill);
  const resume = normalize(candidate.raw_resume_text);
  const parsedSkills = candidate.parsed_profile.skills.map((s) => normalize(s.name));
  const aliases = skillAliases[wanted] ?? [];

  return (
    parsedSkills.some((skillName) => skillName === wanted || skillName.includes(wanted) || wanted.includes(skillName)) ||
    resume.includes(wanted) ||
    aliases.some((alias) => resume.includes(normalize(alias)))
  );
}

function scoreTechnicalFit(candidate: DemoCandidate, job: DemoJob) {
  const requiredMatches = job.parsed_requirements.required_skills.filter((skill) => hasSemanticMatch(candidate, skill)).length;
  const niceMatches = job.parsed_requirements.nice_to_have_skills.filter((skill) => hasSemanticMatch(candidate, skill)).length;
  const requiredScore = requiredMatches / Math.max(job.parsed_requirements.required_skills.length, 1);
  const niceScore = niceMatches / Math.max(job.parsed_requirements.nice_to_have_skills.length, 1);
  const yearsScore = Math.min(candidate.parsed_profile.total_years_experience / job.parsed_requirements.min_years_exp, 1);

  return Math.min(0.78 * requiredScore + 0.12 * niceScore + 0.1 * yearsScore, 1);
}

function scoreBehavioral(candidate: DemoCandidate) {
  const text = normalize(candidate.raw_resume_text);
  let score = 0.35;

  if (/\d+/.test(candidate.raw_resume_text)) score += 0.18;
  if (text.includes("led") || text.includes("managed") || text.includes("mentored")) score += 0.2;
  if (text.includes("reduced") || text.includes("improved") || text.includes("cut")) score += 0.16;
  if (candidate.parsed_profile.experience.some((role) => role.seniority_level >= 5)) score += 0.11;

  return Math.min(score, 1);
}

function scoreDomain(candidate: DemoCandidate, job: DemoJob) {
  const domain = normalize(job.parsed_requirements.domain);
  const text = normalize(`${candidate.raw_resume_text} ${candidate.parsed_profile.summary}`);

  if (text.includes(domain) || (domain === "fintech" && hasSemanticMatch(candidate, "fintech"))) return 0.95;
  if (domain.includes("saas") && (text.includes("product") || text.includes("crm") || text.includes("support"))) return 0.82;
  if (text.includes("enterprise") || text.includes("platform") || text.includes("data")) return 0.58;
  return 0.35;
}

function scorePlatform(candidate: DemoCandidate) {
  if (!candidate.github_signals) return 0.5;
  const stars = Math.min(candidate.github_signals.total_stars / 400, 1);
  const repos = Math.min(candidate.github_signals.public_repos / 40, 1);
  const activity = candidate.github_signals.recent_activity_score;

  return Math.min(0.45 * activity + 0.35 * stars + 0.2 * repos, 1);
}

function makeRationale(result: Omit<DemoRankedCandidate, "rationale" | "rank" | "candidate" | "composite_score" | "topsisMetrics">, candidate: DemoCandidate, job: DemoJob) {
  const fit = result.technical_fit >= 0.78 ? "Strong" : result.technical_fit >= 0.5 ? "Moderate" : "Weak";
  const strongest = result.strengths[0]?.toLowerCase() ?? "relevant experience";
  const caveat = result.concerns[0]?.toLowerCase() ?? "the remaining uncertainty is scope depth";

  return `${fit} fit: ${candidate.title} has ${strongest} for ${job.title}. ${caveat}, so the interview plan focuses on evidence rather than keyword assumptions.`;
}

function buildStrengths(candidate: DemoCandidate, job: DemoJob) {
  const strengths: string[] = [];
  const matchedSkills = job.parsed_requirements.required_skills.filter((skill) => hasSemanticMatch(candidate, skill));

  if (matchedSkills.length > 0) strengths.push(`Direct match on ${matchedSkills.slice(0, 3).join(", ")}`);
  if (candidate.parsed_profile.experience.some((role) => role.seniority_level >= 5)) strengths.push("Leadership signal from manager, lead, or staff-level scope");
  if (candidate.github_signals && candidate.github_signals.total_stars > 75) strengths.push("Visible public engineering activity");
  if (candidate.parsed_profile.experience.some((role) => /\d/.test(role.description))) strengths.push("Quantified delivery impact");

  return strengths.slice(0, 3);
}

function buildConcerns(candidate: DemoCandidate, job: DemoJob, technicalFit: number, domainScore: number, antiGaming: ReturnType<typeof detectGaming>) {
  const concerns: string[] = [];

  if (technicalFit < 0.65) concerns.push("Some core requirements are not directly evidenced");
  if (domainScore < 0.65) concerns.push(`No strong ${job.parsed_requirements.domain} domain signal`);
  if (!candidate.github_signals) concerns.push("No public GitHub signal available");
  if (antiGaming.is_flagged) concerns.push("Resume has templated or buzzword-heavy language");

  return concerns.slice(0, 3);
}

function buildInterviewQuestions(candidate: DemoCandidate, job: DemoJob, concerns: string[]) {
  const primaryConcern = concerns[0] ?? "scope and depth";
  return [
    `Walk me through the most complex ${job.parsed_requirements.required_skills[0]} system you personally owned and how you measured success.`,
    `Where did you have the most leverage in your move toward ${candidate.title}, and what changed in your responsibilities?`,
    `The main uncertainty is ${primaryConcern.toLowerCase()}. What concrete project would you use to prove that signal?`,
  ];
}

export function rankDemoCandidates(jobId: string, weights: ScoringWeights): DemoRankedCandidate[] {
  const job = demoJobs.find((item) => item.id === jobId) ?? demoJobs[0];

  const candidateResults = demoCandidates.map((candidate) => {
    const trajectory = analyzeTrajectory(candidate.parsed_profile);
    const antiGaming = detectGaming(candidate.raw_resume_text);
    const technical_fit = scoreTechnicalFit(candidate, job);
    const trajectory_score = trajectory.trajectory_score;
    const behavioral_score = scoreBehavioral(candidate);
    const domain_score = scoreDomain(candidate, job);
    const platform_activity_score = scorePlatform(candidate);
    const strengths = buildStrengths(candidate, job);
    const concerns = buildConcerns(candidate, job, technical_fit, domain_score, antiGaming);
    const gaps = candidate.parsed_profile.experience
      .filter((role) => role.is_gap)
      .map((role) => `${role.title}: ${role.description}`);

    const result = {
      technical_fit,
      trajectory_score,
      behavioral_score,
      domain_score,
      platform_activity_score,
      strengths,
      concerns,
      gaps,
      interview_questions: buildInterviewQuestions(candidate, job, concerns),
      rationale: "",
    };

    result.rationale = makeRationale(
      {
        ...result,
        anti_gaming_flag: antiGaming.is_flagged,
        anti_gaming_reasons: antiGaming.reasons,
        gaps,
      },
      candidate,
      job,
    );

    return { id: candidate.id, result };
  });

  const candidateScores: CandidateScores[] = candidateResults.map((item) => ({
    candidateId: item.id,
    dimensions: [
      item.result.technical_fit,
      item.result.trajectory_score,
      item.result.behavioral_score,
      item.result.domain_score,
      item.result.platform_activity_score,
    ],
  }));
  const ranked = computeTOPSIS(
    candidateScores,
    [weights.technical_fit, weights.trajectory, weights.behavioral, weights.domain, weights.platform_activity],
    ["benefit", "benefit", "benefit", "benefit", "benefit"],
  ).rankings;

  return ranked.map((item) => {
    const candidate = demoCandidates.find((entry) => entry.id === item.candidateId)!;
    const antiGaming = detectGaming(candidate.raw_resume_text);
    const detailedResult = candidateResults.find((entry) => entry.id === item.candidateId)!.result;

    return {
      candidate,
      rank: item.rank,
      composite_score: item.closenessCoefficient,
      technical_fit: detailedResult.technical_fit,
      trajectory_score: detailedResult.trajectory_score,
      behavioral_score: detailedResult.behavioral_score,
      domain_score: detailedResult.domain_score,
      platform_activity_score: detailedResult.platform_activity_score,
      anti_gaming_flag: antiGaming.is_flagged,
      anti_gaming_reasons: antiGaming.reasons,
      rationale: detailedResult.rationale,
      strengths: detailedResult.strengths,
      concerns: detailedResult.concerns,
      gaps: detailedResult.gaps,
      interview_questions: detailedResult.interview_questions,
      topsisMetrics: {
        distanceToIdeal: item.distanceToIdeal,
        distanceToAntiIdeal: item.distanceToAntiIdeal,
      },
    };
  });
}

export function compareCandidates(a: DemoRankedCandidate, b: DemoRankedCandidate) {
  const dimensions = [
    ["technical fit", a.technical_fit, b.technical_fit],
    ["trajectory", a.trajectory_score, b.trajectory_score],
    ["behavioral evidence", a.behavioral_score, b.behavioral_score],
    ["domain match", a.domain_score, b.domain_score],
    ["platform activity", a.platform_activity_score, b.platform_activity_score],
  ] as const;
  const widestGap = dimensions
    .map(([label, left, right]) => ({ label, gap: left - right }))
    .sort((x, y) => Math.abs(y.gap) - Math.abs(x.gap))[0];
  const leader = widestGap.gap >= 0 ? a : b;

  return `${leader.candidate.full_name} separates most on ${widestGap.label}. ${a.candidate.full_name} is stronger when the role rewards ${a.strengths[0]?.toLowerCase() ?? "their profile"}, while ${b.candidate.full_name} stays competitive through ${b.strengths[0]?.toLowerCase() ?? "their profile"}.`;
}

export function buildBiasAudit(rows: DemoRankedCandidate[]) {
  const groups = new Map<string, { count: number; total: number }>();

  for (const row of rows) {
    const key = row.candidate.diversity_context.graduation_decade;
    const group = groups.get(key) ?? { count: 0, total: 0 };
    group.count += 1;
    group.total += row.composite_score;
    groups.set(key, group);
  }

  const report = Array.from(groups.entries()).map(([proxy_value, group]) => ({
    proxy_category: "graduation_decade",
    proxy_value,
    candidate_count: group.count,
    avg_score: group.total / group.count,
  }));

  const averages = report.map((item) => item.avg_score);
  const spread = averages.length > 1 ? Math.max(...averages) - Math.min(...averages) : 0;

  return {
    report,
    status: spread > 0.18 ? "Review needed" : "Passing",
    spread,
  };
}

export function toRankingCsv(rows: DemoRankedCandidate[]) {
  const escape = (value: string | number | boolean) => `"${String(value).replace(/"/g, '""')}"`;
  const header = [
    "rank",
    "candidate_id",
    "candidate_name",
    "composite_score",
    "technical_fit",
    "trajectory_score",
    "behavioral_score",
    "domain_score",
    "platform_activity_score",
    "anti_gaming_flag",
    "rationale",
    "top_strength_1",
    "top_strength_2",
    "top_strength_3",
    "primary_concern",
    "suggested_interview_question",
  ];

  return [
    header.join(","),
    ...rows.map((row) =>
      [
        row.rank,
        row.candidate.id,
        row.candidate.full_name,
        row.composite_score.toFixed(3),
        row.technical_fit.toFixed(3),
        row.trajectory_score.toFixed(3),
        row.behavioral_score.toFixed(3),
        row.domain_score.toFixed(3),
        row.platform_activity_score.toFixed(3),
        row.anti_gaming_flag,
        row.rationale,
        row.strengths[0] ?? "",
        row.strengths[1] ?? "",
        row.strengths[2] ?? "",
        row.concerns[0] ?? "",
        row.interview_questions[0] ?? "",
      ].map(escape).join(","),
    ),
  ].join("\n");
}

export function liveScoreToRankedCandidate(score: LiveScoreRow): DemoRankedCandidate {
  const candidateRow = score.candidates ?? {};
  const parsedProfile = candidateRow.parsed_profile ?? {
    skills: [],
    experience: [],
    education: [],
    total_years_experience: 0,
    certifications: [],
    summary: candidateRow.raw_resume_text?.slice(0, 180) ?? "Live candidate profile",
  };
  const candidate: DemoCandidate = {
    id: candidateRow.id ?? score.candidate_id,
    full_name: candidateRow.full_name ?? "Unnamed candidate",
    title: parsedProfile.experience?.[0]?.title ?? "Candidate",
    location: "Live pool",
    raw_resume_text: candidateRow.raw_resume_text ?? "",
    parsed_profile: parsedProfile,
    github_username: candidateRow.github_username ?? null,
    github_signals: candidateRow.github_signals ?? null,
    diversity_context: {
      review_name: `Candidate ${String(candidateRow.id ?? score.candidate_id).slice(0, 6)}`,
      graduation_decade: parsedProfile.education?.[0]?.graduation_year
        ? `${Math.floor(parsedProfile.education[0].graduation_year / 10) * 10}s`
        : "unknown",
      university_tier: "unknown",
    },
  };

  return {
    candidate,
    rank: score.rank ?? 0,
    composite_score: Number(score.composite_score ?? 0),
    technical_fit: Number(score.technical_fit ?? 0),
    trajectory_score: Number(score.trajectory_score ?? 0),
    behavioral_score: Number(score.behavioral_score ?? 0),
    domain_score: Number(score.domain_score ?? 0),
    platform_activity_score: Number(score.platform_activity_score ?? 0),
    anti_gaming_flag: Boolean(candidateRow.anti_gaming_flag),
    anti_gaming_reasons: candidateRow.anti_gaming_reasons ?? [],
    rationale: score.rationale ?? "Live score loaded from Supabase.",
    strengths: score.strengths ?? [],
    concerns: score.concerns ?? [],
    gaps: score.gaps ?? [],
    interview_questions: score.interview_questions ?? [],
    topsisMetrics: {
      distanceToIdeal: 0,
      distanceToAntiIdeal: 0,
    },
  };
}

export function demoRankingsForJob(jobId: string) {
  const job = demoJobs.find((item) => item.id === jobId) ?? demoJobs[0];
  return rankDemoCandidates(job.id, job.scoring_weights ?? defaultWeights);
}

interface LiveScoreRow {
  candidate_id: string;
  rank: number | null;
  composite_score: number | string | null;
  technical_fit: number | string | null;
  trajectory_score: number | string | null;
  behavioral_score: number | string | null;
  domain_score: number | string | null;
  platform_activity_score: number | string | null;
  rationale: string | null;
  strengths: string[] | null;
  concerns: string[] | null;
  gaps: string[] | null;
  interview_questions: string[] | null;
  candidates?: {
    id?: string;
    full_name?: string | null;
    raw_resume_text?: string | null;
    parsed_profile?: DemoCandidate["parsed_profile"] | null;
    github_username?: string | null;
    github_signals?: DemoCandidate["github_signals"] | null;
    anti_gaming_flag?: boolean | null;
    anti_gaming_reasons?: string[] | null;
  } | null;
}
