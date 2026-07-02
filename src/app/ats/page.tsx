import { AppShell } from "@/components/layout/AppShell";
import { RecruiterCommandCenter } from "@/components/features/recruiter-command-center";
import { PageHeader } from "@/components/layout/PageScaffold";
import { getDashboardSummary, getEmptyDashboardSummary } from "@/features/dashboard/services/summary";
import { liveScoreToRankedCandidate } from "@/features/recruiter/ranking";
import { hasSupabaseAdminConfig } from "@/lib/env";
import { ensureLocalRoleCatalog, listLocalScores } from "@/lib/local-store";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RankedCandidate, RecruiterJob } from "@/features/recruiter/types";

export const dynamic = "force-dynamic";

async function loadSummary() {
  try {
    return await getDashboardSummary();
  } catch {
    return getEmptyDashboardSummary();
  }
}

async function loadJobs(): Promise<RecruiterJob[]> {
  if (!hasSupabaseAdminConfig()) return ensureLocalRoleCatalog();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, company, raw_description, parsed_requirements, scoring_weights")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return ensureLocalRoleCatalog();
  return data;
}

async function loadRows(jobId: string): Promise<RankedCandidate[]> {
  if (!jobId) return [];
  if (!hasSupabaseAdminConfig() || jobId.startsWith("local-job-")) {
    return (await listLocalScores(jobId)).map(liveScoreToRankedCandidate);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scores")
    .select(`
      candidate_id,
      rank,
      composite_score,
      technical_fit,
      trajectory_score,
      behavioral_score,
      domain_score,
      platform_activity_score,
      rationale,
      strengths,
      concerns,
      gaps,
      interview_questions,
      candidates (
        id,
        full_name,
        raw_resume_text,
        parsed_profile,
        github_username,
        github_signals,
        anti_gaming_flag,
        anti_gaming_reasons
      )
    `)
    .eq("job_id", jobId)
    .order("rank", { ascending: true });

  if (error || !data || data.length === 0) return (await listLocalScores(jobId)).map(liveScoreToRankedCandidate);
  return data.map((score) =>
    liveScoreToRankedCandidate({
      ...score,
      candidates: Array.isArray(score.candidates) ? score.candidates[0] : score.candidates,
    }),
  );
}

export default async function AtsPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const params = await searchParams;
  const [dashboardSummary, jobs] = await Promise.all([loadSummary(), loadJobs()]);
  const selectedJobId = params.job ?? jobs[0]?.id ?? "";
  const rows = await loadRows(selectedJobId);

  return (
    <AppShell>
      <PageHeader
        eyebrow="ATS Workspace"
        title="Hiring Command Center"
        description="Manage active roles, upload candidates, run role-specific ranking, and move from shortlist to hiring action."
      />
      <RecruiterCommandCenter
        initialRows={rows}
        initialJobs={jobs}
        initialJobId={selectedJobId}
        dashboardSummary={dashboardSummary}
        embedded
      />
    </AppShell>
  );
}
