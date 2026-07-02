import type { RankedCandidate, RecruiterCandidate } from "@/features/recruiter/types";

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
};

export function compareCandidates(a: RankedCandidate, b: RankedCandidate) {
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

export function buildBiasAudit(rows: RankedCandidate[]) {
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

export function toRankingCsv(rows: RankedCandidate[]) {
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

export function liveScoreToRankedCandidate(score: LiveScoreRow): RankedCandidate {
  const candidateRow = score.candidates ?? {};
  const parsedProfile = candidateRow.parsed_profile ?? {
    skills: [],
    experience: [],
    education: [],
    total_years_experience: 0,
    certifications: [],
    summary: candidateRow.raw_resume_text?.slice(0, 180) ?? "Live candidate profile",
  };
  const candidate: RecruiterCandidate = {
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
    anti_gaming_reasons: toArray(candidateRow.anti_gaming_reasons),
    rationale: score.rationale ?? "Live score loaded from Supabase.",
    strengths: toArray(score.strengths),
    concerns: toArray(score.concerns),
    gaps: toArray(score.gaps),
    interview_questions: toArray(score.interview_questions),
    topsisMetrics: {
      distanceToIdeal: 0,
      distanceToAntiIdeal: 0,
    },
  };
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
  strengths: unknown;
  concerns: unknown;
  gaps: unknown;
  interview_questions: unknown;
  candidates?: {
    id?: string;
    full_name?: string | null;
    raw_resume_text?: string | null;
    parsed_profile?: RecruiterCandidate["parsed_profile"] | null;
    github_username?: string | null;
    github_signals?: RecruiterCandidate["github_signals"] | null;
    anti_gaming_flag?: boolean | null;
    anti_gaming_reasons?: unknown;
  } | null;
}
