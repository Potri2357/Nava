import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MetricTile, PageHeader } from "@/components/layout/PageScaffold";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSummary, getEmptyDashboardSummary } from "@/features/dashboard/services/summary";

export const dynamic = "force-dynamic";

async function loadSummary() {
  try {
    return await getDashboardSummary();
  } catch {
    return getEmptyDashboardSummary();
  }
}

export default async function InsightsPage() {
  const summary = await loadSummary();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Recruiting Analytics"
        title="Insights"
        description="Monitor hiring volume, score coverage, recruiter workload, and shortlist quality across roles."
      />

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <MetricTile label="Active roles" value={summary.counts.activeJobs} detail="Currently open" />
        <MetricTile label="Candidates" value={summary.counts.totalCandidates} detail="Uploaded pool" />
        <MetricTile label="Scores" value={summary.counts.rankedCandidates} detail="Generated evaluations" />
        <MetricTile label="Flags" value={summary.counts.antiGamingFlags} detail="Need review" />
        <MetricTile label="Feedback" value={summary.counts.feedbackItems} detail="Human calibration" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Recent Shortlist Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.recentShortlist.length === 0 ? (
              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="text-sm font-semibold">Analytics intake checklist</div>
                <div className="mt-2 grid gap-2 text-sm text-slate-600">
                  <div>1. Upload candidate profiles from ATS.</div>
                  <div>2. Rank a role in Intelligence.</div>
                  <div>3. Review score distribution and shortlist activity here.</div>
                </div>
                <Link href="/intelligence" className="mt-4 inline-flex">
                  <Button>Open intelligence</Button>
                </Link>
              </div>
            ) : (
              summary.recentShortlist.map((item) => (
                <div key={item.score_id} className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">
                      #{item.rank ?? "-"} {item.candidate_name}
                    </div>
                    <div className="text-xs text-slate-500">{item.job_title}</div>
                  </div>
                  <div className="text-sm font-semibold">{Math.round(item.composite_score * 100)}%</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Operating Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ["Supabase", summary.health.supabaseAdmin ? "Live" : "Local fallback"],
              ["Gemini", summary.health.gemini ? "Configured" : "Fallback parser"],
              ["GitHub", summary.health.github ? "Configured" : "Manual signals"],
              ["Bias audit", summary.biasAudit.status],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2">
                <span className="text-slate-600">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
