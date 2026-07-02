import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MetricTile, PageHeader } from "@/components/layout/PageScaffold";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ensureLocalRoleCatalog } from "@/lib/local-store";
import { hasSupabaseAdminConfig } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RecruiterJob } from "@/features/recruiter/types";

export const dynamic = "force-dynamic";

async function getRoles(): Promise<RecruiterJob[]> {
  if (!hasSupabaseAdminConfig()) return ensureLocalRoleCatalog();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, company, raw_description, parsed_requirements, scoring_weights")
    .order("created_at", { ascending: false });

  if (error) return ensureLocalRoleCatalog();
  return data ?? [];
}

export default async function RolesPage() {
  const roles = await getRoles();
  const domains = new Set(roles.map((role) => role.parsed_requirements?.domain ?? "unknown"));
  const skills = new Set(roles.flatMap((role) => role.parsed_requirements?.required_skills ?? []));

  return (
    <AppShell>
      <PageHeader
        eyebrow="Role Intelligence"
        title="Roles"
        description="Define hiring requirements, scoring priorities, semantic skill expectations, and interview plans for each role."
        actions={
          <Link href="/dashboard/jobs/new">
            <Button>Create role</Button>
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <MetricTile label="Active roles" value={roles.length} detail="Across all hiring teams" />
        <MetricTile label="Domains" value={domains.size} detail="Detected from parsed role data" />
        <MetricTile label="Required skills" value={skills.size} detail="Unique skill signals" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id} className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{role.title}</CardTitle>
                  <CardDescription>{role.company ?? "Company not set"}</CardDescription>
                </div>
                <Badge variant="outline" className="capitalize">
                  {role.parsed_requirements?.seniority ?? "role"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                {role.parsed_requirements?.role_summary ?? role.raw_description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(role.parsed_requirements?.required_skills ?? []).slice(0, 6).map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border bg-slate-50 p-2">
                  <div className="text-slate-500">Domain</div>
                  <div className="mt-1 font-semibold capitalize">{role.parsed_requirements?.domain ?? "unknown"}</div>
                </div>
                <div className="rounded-md border bg-slate-50 p-2">
                  <div className="text-slate-500">Min years</div>
                  <div className="mt-1 font-semibold">{role.parsed_requirements?.min_years_exp ?? 0}+</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/roles/${role.id}`}>
                  <Button variant="outline" className="w-full">
                    Inspect
                  </Button>
                </Link>
                <Link href={`/intelligence?job=${role.id}`}>
                  <Button className="w-full">
                    Rank
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
