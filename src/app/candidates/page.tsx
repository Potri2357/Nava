import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MetricTile, PageHeader } from "@/components/layout/PageScaffold";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hasSupabaseAdminConfig } from "@/lib/env";
import { listLocalCandidates } from "@/lib/local-store";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CandidateRow = {
  id: string;
  full_name: string | null;
  email?: string | null;
  github_username: string | null;
  github_signals: unknown | null;
  anti_gaming_flag: boolean | null;
  source: string | null;
  parsed_profile: {
    summary?: string;
    total_years_experience?: number;
    skills?: { name: string }[];
    experience?: { is_gap?: boolean; title?: string; company?: string }[];
  } | null;
};

async function getCandidates(): Promise<CandidateRow[]> {
  if (!hasSupabaseAdminConfig()) return listLocalCandidates();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("candidates")
    .select("id, full_name, email, github_username, github_signals, anti_gaming_flag, source, parsed_profile")
    .order("created_at", { ascending: false });

  if (error) return listLocalCandidates();
  return data ?? [];
}

export default async function CandidatesPage() {
  const candidates = await getCandidates();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Candidate Intelligence"
        title="Candidates"
        description="Review uploaded profiles, parsed skills, experience evidence, trust signals, and ranking readiness."
        actions={
          <Link href="/ats">
            <Button>Upload candidate</Button>
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <MetricTile label="Candidates" value={candidates.length} detail="Uploaded profile pool" />
        <MetricTile
          label="With GitHub"
          value={candidates.filter((candidate) => candidate.github_signals || candidate.github_username).length}
          detail="Public technical signal"
        />
        <MetricTile
          label="Gap context"
          value={candidates.filter((candidate) => candidate.parsed_profile?.experience?.some((role) => role.is_gap)).length}
          detail="Surfaced for review"
        />
        <MetricTile
          label="Review flags"
          value={candidates.filter((candidate) => candidate.anti_gaming_flag).length}
          detail="Never auto-rejected"
        />
      </div>

      <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Candidate Pool</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Current signal</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Trust signals</TableHead>
                <TableHead>Top skills</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <Link href={`/candidates/${candidate.id}`} className="font-medium hover:underline">
                      {candidate.full_name ?? "Unnamed candidate"}
                    </Link>
                    <div className="text-xs text-slate-500">{candidate.email ?? candidate.source ?? "upload"}</div>
                  </TableCell>
                  <TableCell>{candidate.parsed_profile?.experience?.[0]?.title ?? "Not parsed"}</TableCell>
                  <TableCell>{candidate.parsed_profile?.total_years_experience ?? 0} yrs</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(candidate.github_signals || candidate.github_username) && <Badge variant="outline">GitHub</Badge>}
                      {candidate.parsed_profile?.experience?.some((role) => role.is_gap) && <Badge variant="outline">Gap</Badge>}
                      {candidate.anti_gaming_flag && <Badge variant="destructive">Review</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-md flex-wrap gap-1">
                      {(candidate.parsed_profile?.skills ?? []).slice(0, 5).map((skill) => (
                        <Badge key={skill.name} variant="secondary">
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
