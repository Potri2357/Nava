import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MetricTile, PageHeader } from "@/components/layout/PageScaffold";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSupabaseAdminConfig } from "@/lib/env";
import { getLocalJob } from "@/lib/local-store";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RecruiterJob } from "@/features/recruiter/types";

export const dynamic = "force-dynamic";

async function getRole(id: string): Promise<RecruiterJob | null> {
  if (!hasSupabaseAdminConfig() || id.startsWith("local-job-")) return getLocalJob(id);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, company, raw_description, parsed_requirements, scoring_weights")
    .eq("id", id)
    .single();

  if (error) return getLocalJob(id);
  return data;
}

export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getRole(id);
  if (!role) notFound();

  const requirements = role.parsed_requirements;
  const weights = role.scoring_weights;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Role Detail"
        title={role.title}
        description={requirements?.role_summary ?? role.raw_description}
        actions={
          <>
            <Link href={`/intelligence?job=${role.id}`}>
              <Button>Rank candidates</Button>
            </Link>
            <Link href="/roles">
              <Button variant="outline">All roles</Button>
            </Link>
          </>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <MetricTile label="Seniority" value={requirements?.seniority ?? "Unknown"} detail="Parsed from role" />
        <MetricTile label="Domain" value={requirements?.domain ?? "Unknown"} detail="Role context" />
        <MetricTile label="Min years" value={`${requirements?.min_years_exp ?? 0}+`} detail="Experience threshold" />
        <MetricTile label="Required skills" value={requirements?.required_skills.length ?? 0} detail="Core signals" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(requirements?.required_skills ?? []).map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm leading-6 text-slate-700">
                {(requirements?.key_responsibilities ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Original Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{role.raw_description}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Scoring Weights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Technical fit", weights.technical_fit],
                ["Trajectory", weights.trajectory],
                ["Behavioral", weights.behavioral],
                ["Domain", weights.domain],
                ["Platform activity", weights.platform_activity],
              ].map(([label, value]) => (
                <div key={String(label)} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold">{Math.round(Number(value) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-slate-950" style={{ width: `${Math.round(Number(value) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Nice To Have</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(requirements?.nice_to_have_skills ?? []).map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
