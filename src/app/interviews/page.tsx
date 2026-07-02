import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MetricTile, PageHeader } from "@/components/layout/PageScaffold";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ensureLocalRoleCatalog, listLocalScores } from "@/lib/local-store";

export const dynamic = "force-dynamic";

async function getInterviewQueue() {
  const jobs = await ensureLocalRoleCatalog();
  const scoreGroups = await Promise.all(
    jobs.map(async (job) => ({
      job,
      scores: await listLocalScores(job.id),
    })),
  );

  return scoreGroups
    .flatMap(({ job, scores }) =>
      scores.slice(0, 3).map((score) => ({
        job,
        score,
        candidate: score.candidates,
      })),
    )
    .filter((item) => item.candidate)
    .slice(0, 12);
}

export default async function InterviewsPage() {
  const queue = await getInterviewQueue();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Structured Hiring"
        title="Interviews"
        description="Convert ranked candidates into structured interviews with role-specific probes, scorecards, and hiring-manager feedback."
        actions={
          <Link href="/intelligence">
            <Button>Open shortlist</Button>
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <MetricTile label="Interview-ready" value={queue.length} detail="From ranked shortlists" />
        <MetricTile label="Scorecards" value="Role-based" detail="Structured criteria" />
        <MetricTile label="Integrity" value="Checklist" detail="AI/proxy risk review" />
        <MetricTile label="Packets" value="Ready" detail="Hiring manager brief inputs" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Interview Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {queue.length === 0 ? (
              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="text-sm font-semibold">Interview intake checklist</div>
                <div className="mt-2 grid gap-2 text-sm text-slate-600">
                  <div>1. Choose a role in Intelligence.</div>
                  <div>2. Run ranking for uploaded candidates.</div>
                  <div>3. Return here for candidate-specific interview focus.</div>
                </div>
                <Link href="/intelligence" className="mt-4 inline-flex">
                  <Button variant="outline">Prepare shortlist</Button>
                </Link>
              </div>
            ) : (
              queue.map(({ job, score, candidate }) => (
                <div key={`${job.id}-${score.id}`} className="rounded-lg border bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{candidate?.full_name ?? "Unnamed candidate"}</div>
                      <div className="mt-1 text-xs text-slate-500">{job.title} · Rank #{score.rank}</div>
                    </div>
                    <Badge variant="outline">{Math.round(score.composite_score * 100)}%</Badge>
                  </div>
                  <div className="mt-3 rounded-md border bg-white p-3 text-sm leading-6 text-slate-700">
                    {score.interview_questions[0] ?? "Walk through the strongest role-matching project in detail."}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(score.concerns ?? []).slice(0, 2).map((concern) => (
                      <Badge key={concern} variant="outline">
                        Probe: {concern}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {[
            ["Scorecards", "Role criteria, evidence, and human ratings", "Ready"],
            ["Interview focus", "Questions generated from candidate gaps", queue.length > 0 ? "Active" : "Needs ranking"],
            ["Integrity checklist", "AI-free interview and proxy-risk checks", "Checklist"],
            ["Decision packet", "Hiring-manager-ready summary", "Ready inputs"],
          ].map(([title, description, status]) => (
            <Card key={title} className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="mt-1 text-xs text-slate-500">{description}</div>
                </div>
                <Badge variant="outline">{status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
