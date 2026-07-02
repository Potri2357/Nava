import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MetricTile, PageHeader } from "@/components/layout/PageScaffold";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSupabaseAdminConfig } from "@/lib/env";
import { getLocalCandidate } from "@/lib/local-store";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Candidate } from "@/features/candidates/types";

export const dynamic = "force-dynamic";

async function getCandidate(id: string): Promise<Candidate | null> {
  if (!hasSupabaseAdminConfig() || id.startsWith("local-candidate-")) return getLocalCandidate(id) as Promise<Candidate | null>;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return getLocalCandidate(id) as Promise<Candidate | null>;
  return data;
}

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await getCandidate(id);
  if (!candidate) notFound();

  const profile = candidate.parsed_profile;
  const currentRole = profile?.experience?.[0];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Candidate Profile"
        title={candidate.full_name ?? "Unnamed candidate"}
        description={profile?.summary ?? "Uploaded candidate profile awaiting richer parsing."}
        actions={
          <>
            <Link href="/intelligence">
              <Button>Rank for role</Button>
            </Link>
            <Link href="/candidates">
              <Button variant="outline">All candidates</Button>
            </Link>
          </>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <MetricTile label="Current signal" value={currentRole?.title ?? "Unknown"} detail={currentRole?.company ?? "Parsed profile"} />
        <MetricTile label="Experience" value={`${profile?.total_years_experience ?? 0} yrs`} detail="Estimated from resume" />
        <MetricTile label="Skills" value={profile?.skills?.length ?? 0} detail="Extracted signals" />
        <MetricTile label="Trust flags" value={candidate.anti_gaming_flag ? "Review" : "Clear"} detail="Anti-gaming detector" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Experience Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(profile?.experience ?? []).map((role) => (
                <div key={`${role.company}-${role.title}-${role.start_date}`} className="rounded-lg border bg-slate-50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{role.title}</div>
                      <div className="text-xs text-slate-500">{role.company}</div>
                    </div>
                    <Badge variant="outline">
                      {role.start_date} - {role.end_date ?? "Present"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{role.description}</p>
                  {role.is_gap && <Badge className="mt-2" variant="outline">Gap context</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Raw Resume Text</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                {candidate.raw_resume_text}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(profile?.skills ?? []).map((skill) => (
                <Badge key={skill.name} variant="secondary">
                  {skill.name}
                  {skill.years ? ` · ${skill.years}y` : ""}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Profile Links & Signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between rounded-md border bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Email</span>
                <span className="font-medium">{candidate.email ?? "Not found"}</span>
              </div>
              <div className="flex justify-between rounded-md border bg-slate-50 px-3 py-2">
                <span className="text-slate-500">GitHub</span>
                <span className="font-medium">{candidate.github_username ?? "Not found"}</span>
              </div>
              <div className="flex justify-between rounded-md border bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Source</span>
                <span className="font-medium">{candidate.source}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Education</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(profile?.education ?? []).map((education) => (
                <div key={`${education.institution}-${education.degree}`} className="rounded-md border bg-slate-50 p-3 text-sm">
                  <div className="font-medium">{education.degree}</div>
                  <div className="text-slate-500">{education.institution}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {education.field} {education.graduation_year ? `· ${education.graduation_year}` : ""}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
