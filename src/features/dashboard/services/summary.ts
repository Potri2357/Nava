import { hasGeminiConfig, hasSupabaseAdminConfig, hasSupabaseServerConfig } from "@/lib/env";
import { ensureLocalRoleCatalog, listLocalCandidates, listLocalScores } from "@/lib/local-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRecoverableSupabaseSetupError } from "@/lib/supabase/errors";

export type DashboardSummary = {
  source: "live" | "setup";
  counts: {
    activeJobs: number;
    totalCandidates: number;
    rankedCandidates: number;
    antiGamingFlags: number;
    feedbackItems: number;
  };
  health: {
    supabase: boolean;
    supabaseAdmin: boolean;
    gemini: boolean;
    github: boolean;
  };
  biasAudit: {
    status: "Passing" | "Review";
    spread: number;
  };
  recentJobs: {
    id: string;
    title: string;
    company: string | null;
    status: string;
    created_at: string | null;
  }[];
  recentShortlist: {
    score_id: string;
    job_id: string;
    job_title: string;
    candidate_id: string;
    candidate_name: string;
    rank: number | null;
    composite_score: number;
    created_at: string | null;
  }[];
};

export function getEmptyDashboardSummary(): DashboardSummary {
  return {
    source: hasSupabaseAdminConfig() ? "live" : "setup",
    counts: {
      activeJobs: 0,
      totalCandidates: 0,
      rankedCandidates: 0,
      antiGamingFlags: 0,
      feedbackItems: 0,
    },
    health: {
      supabase: hasSupabaseServerConfig(),
      supabaseAdmin: hasSupabaseAdminConfig(),
      gemini: hasGeminiConfig(),
      github: Boolean(process.env.GITHUB_PAT),
    },
    biasAudit: {
      status: "Passing",
      spread: 0,
    },
    recentJobs: [],
    recentShortlist: [],
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (!hasSupabaseAdminConfig()) {
    return getLocalDashboardSummary();
  }

  const summary = getEmptyDashboardSummary();
  const supabase = createAdminClient();

  const [
    activeJobsResult,
    totalCandidatesResult,
    rankedCandidatesResult,
    antiGamingFlagsResult,
    feedbackItemsResult,
    recentJobsResult,
    recentScoresResult,
  ] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("candidates").select("id", { count: "exact", head: true }),
    supabase.from("scores").select("id", { count: "exact", head: true }),
    supabase.from("candidates").select("id", { count: "exact", head: true }).eq("anti_gaming_flag", true),
    supabase.from("feedback").select("id", { count: "exact", head: true }),
    supabase
      .from("jobs")
      .select("id, title, company, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("scores")
      .select(`
        id,
        job_id,
        candidate_id,
        rank,
        composite_score,
        created_at,
        jobs ( id, title ),
        candidates ( id, full_name )
      `)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const firstError = [
    activeJobsResult.error,
    totalCandidatesResult.error,
    rankedCandidatesResult.error,
    antiGamingFlagsResult.error,
    feedbackItemsResult.error,
    recentJobsResult.error,
    recentScoresResult.error,
  ].find(Boolean);

  if (firstError) {
    if (isRecoverableSupabaseSetupError(firstError)) return getLocalDashboardSummary();
    throw firstError;
  }

  summary.counts = {
    activeJobs: activeJobsResult.count ?? 0,
    totalCandidates: totalCandidatesResult.count ?? 0,
    rankedCandidates: rankedCandidatesResult.count ?? 0,
    antiGamingFlags: antiGamingFlagsResult.count ?? 0,
    feedbackItems: feedbackItemsResult.count ?? 0,
  };
  summary.recentJobs = (recentJobsResult.data ?? []).map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    status: job.status,
    created_at: job.created_at,
  }));
  summary.recentShortlist = (recentScoresResult.data ?? []).map((score) => {
    const job = Array.isArray(score.jobs) ? score.jobs[0] : score.jobs;
    const candidate = Array.isArray(score.candidates) ? score.candidates[0] : score.candidates;

    return {
      score_id: score.id,
      job_id: score.job_id,
      job_title: job?.title ?? "Untitled role",
      candidate_id: score.candidate_id,
      candidate_name: candidate?.full_name ?? "Unnamed candidate",
      rank: score.rank,
      composite_score: Number(score.composite_score),
      created_at: score.created_at,
    };
  });

  return summary;
}

async function getLocalDashboardSummary(): Promise<DashboardSummary> {
  const [jobs, candidates] = await Promise.all([ensureLocalRoleCatalog(), listLocalCandidates()]);
  const scoreGroups = await Promise.all(jobs.map((job) => listLocalScores(job.id)));
  const scores = scoreGroups.flat();

  return {
    ...getEmptyDashboardSummary(),
    source: "setup",
    counts: {
      activeJobs: jobs.filter((job) => job.status === "active").length,
      totalCandidates: candidates.length,
      rankedCandidates: scores.length,
      antiGamingFlags: candidates.filter((candidate) => candidate.anti_gaming_flag).length,
      feedbackItems: 0,
    },
    recentJobs: jobs.slice(0, 5).map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      status: job.status,
      created_at: job.created_at,
    })),
    recentShortlist: scores.slice(0, 8).map((score) => ({
      score_id: score.id,
      job_id: score.job_id,
      job_title: jobs.find((job) => job.id === score.job_id)?.title ?? "Local role",
      candidate_id: score.candidate_id,
      candidate_name: candidates.find((candidate) => candidate.id === score.candidate_id)?.full_name ?? "Unnamed candidate",
      rank: score.rank,
      composite_score: score.composite_score,
      created_at: score.created_at,
    })),
  };
}
