import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageScaffold";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasGeminiConfig, hasSupabaseAdminConfig, hasSupabaseServerConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const settings = [
    {
      title: "Supabase client",
      description: "Browser/server configuration for app data access.",
      status: hasSupabaseServerConfig() ? "Configured" : "Missing",
    },
    {
      title: "Supabase admin",
      description: "Service role path for jobs, candidates, scores, and audit data.",
      status: hasSupabaseAdminConfig() ? "Configured" : "Local fallback",
    },
    {
      title: "Gemini",
      description: "Structured parsing and scoring model provider.",
      status: hasGeminiConfig() ? "Configured" : "Heuristic fallback",
    },
    {
      title: "GitHub",
      description: "Public technical signal enrichment for developer roles.",
      status: process.env.GITHUB_PAT ? "Configured" : "Manual/fallback",
    },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="System Configuration"
        title="Settings"
        description="Review integration readiness, model providers, and data-path status for Nava."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {settings.map((setting) => (
          <Card key={setting.title} className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{setting.title}</CardTitle>
                  <CardDescription>{setting.description}</CardDescription>
                </div>
                <Badge variant={setting.status === "Configured" ? "default" : "outline"}>{setting.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              {setting.status === "Configured"
                ? "Ready for live workflow."
                : "Nava will continue with local or heuristic fallback where available."}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
