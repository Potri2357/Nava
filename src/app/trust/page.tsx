import { AppShell } from "@/components/layout/AppShell";
import { MetricTile, PageHeader } from "@/components/layout/PageScaffold";
import { Badge } from "@/components/ui/badge";
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

export default async function TrustPage() {
  const summary = await loadSummary();

  return (
    <AppShell>
      <PageHeader
        eyebrow="AI Governance"
        title="Trust Center"
        description="Review fairness, anti-gaming signals, model readiness, human oversight, and auditability for enterprise hiring."
      />

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <MetricTile label="Bias audit" value={summary.biasAudit.status} detail={`${Math.round(summary.biasAudit.spread * 100)}% score spread`} />
        <MetricTile label="Review flags" value={summary.counts.antiGamingFlags} detail="Keyword stuffing / risk checks" />
        <MetricTile label="Human feedback" value={summary.counts.feedbackItems} detail="Overrides and calibration notes" />
        <MetricTile label="Scored records" value={summary.counts.rankedCandidates} detail="Auditable evaluations" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {[
          {
            title: "Explainability",
            status: "Active",
            items: ["Every score includes rationale", "Strengths and concerns are stored", "Interview focus is generated"],
          },
          {
            title: "Human Control",
            status: "Oversight active",
            items: ["No automatic rejection", "Recruiter decision remains final", "Hiring manager notes surface alongside AI output"],
          },
          {
            title: "Fraud & Authenticity",
            status: "Basic detector active",
            items: ["AI/templated resume indicators", "Keyword-stuffing review", "Interview integrity checklist visible in Interviews"],
          },
          {
            title: "Compliance Readiness",
            status: "Foundation",
            items: ["Weights used per score", "Model used per score", "Human-readable rationale stored with every score"],
          },
          {
            title: "Bias Review",
            status: summary.biasAudit.status,
            items: ["Proxy-group spread review", "Blind review mode", "Review language, not auto-reject language"],
          },
          {
            title: "System Readiness",
            status: summary.source === "live" ? "Live data" : "Setup mode",
            items: ["Supabase status visible", "Model fallback path", "GitHub integration status"],
          },
        ].map((section) => (
          <Card key={section.title} className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{section.title}</CardTitle>
                <Badge variant="outline">{section.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
