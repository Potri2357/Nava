"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  ClipboardList,
  Download,
  EyeOff,
  GitBranch,
  GitCompare,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Users,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, Radar, RadarChart, PolarAngleAxis, PolarGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { defaultWeights } from "@/features/jobs/constants";
import { buildBiasAudit, compareCandidates, toRankingCsv } from "@/features/recruiter/ranking";
import type { RankedCandidate, RecruiterJob } from "@/features/recruiter/types";
import { useLiveJobs, useLiveRankings } from "@/features/realtime/use-realtime-rankings";
import type { ScoringWeights } from "@/features/jobs/types";
import type { DashboardSummary } from "@/features/dashboard/services/summary";

const percent = (value: number) => `${Math.round(value * 100)}%`;

function scoreClass(value: number) {
  if (value >= 0.75) return "text-emerald-700";
  if (value >= 0.5) return "text-amber-700";
  return "text-rose-700";
}

function WeightSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs text-slate-600">{label}</Label>
        <span className="w-10 text-right text-xs font-semibold">{percent(value)}</span>
      </div>
      <Slider
        value={[Math.round(value * 100)]}
        min={0}
        max={60}
        step={5}
        onValueChange={(next) => onChange((Array.isArray(next) ? next[0] : next) / 100)}
      />
    </div>
  );
}

export function RecruiterCommandCenter({
  initialRows,
  initialJobs,
  initialJobId,
  dashboardSummary,
  embedded = false,
}: {
  initialRows: RankedCandidate[];
  initialJobs: RecruiterJob[];
  initialJobId?: string;
  dashboardSummary?: DashboardSummary;
  embedded?: boolean;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedJobId, setSelectedJobId] = useState(initialJobId ?? "");
  const [selectedCandidateId, setSelectedCandidateId] = useState(initialRows[0]?.candidate.id ?? "");
  const [blindReview, setBlindReview] = useState(false);
  const [query, setQuery] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [weights, setWeights] = useState<ScoringWeights>(defaultWeights);
  const jobsQuery = useLiveJobs(initialJobs);
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await fetch("/api/health");
      if (!response.ok) throw new Error("Health check failed");
      return response.json() as Promise<{
        mode: "live" | "setup";
        supabase: { configured: boolean; adminConfigured: boolean; serviceRoleConfigured?: boolean };
        gemini: { configured: boolean };
        github: { configured: boolean };
      }>;
    },
  });
  const dashboardSummaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/summary");
      if (!response.ok) throw new Error("Dashboard summary failed");
      const payload = await response.json() as { data: DashboardSummary };
      return payload.data;
    },
    initialData: dashboardSummary,
  });

  const jobs = jobsQuery.data ?? initialJobs;
  const liveDashboardSummary = dashboardSummaryQuery.data ?? dashboardSummary;
  const effectiveSelectedJobId = selectedJobId || jobs[0]?.id || "";
  const rankingsQuery = useLiveRankings(effectiveSelectedJobId, initialRows);
  const rows = rankingsQuery.data ?? initialRows;
  const visibleRows = rows.filter((row) => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return true;
    const searchable = [
      row.candidate.full_name,
      row.candidate.title,
      row.candidate.parsed_profile.summary,
      row.rationale,
      ...row.strengths,
      ...row.concerns,
      ...row.interview_questions,
      ...(row.candidate.parsed_profile.skills ?? []).map((skill) => skill.name),
      ...(row.candidate.parsed_profile.experience ?? []).map((role) => `${role.title} ${role.company} ${role.description}`),
    ].join(" ").toLowerCase();
    return normalizedQuery.split(/\s+/).every((token) => searchable.includes(token));
  });
  const selectedJob = jobs.find((job) => job.id === effectiveSelectedJobId) ?? jobs[0];
  const filteredJobs = jobs.filter((job) => {
    const haystack = [
      job.title,
      job.company ?? "",
      job.parsed_requirements?.domain ?? "",
      ...(job.parsed_requirements?.required_skills ?? []),
    ].join(" ").toLowerCase();
    return haystack.includes(roleSearch.toLowerCase().trim());
  });
  const hasCandidateSearch = Boolean(query.trim());
  const selected = visibleRows.find((row) => row.candidate.id === selectedCandidateId) ?? visibleRows[0] ?? (hasCandidateSearch ? undefined : rows[0]);
  const runnerUp = visibleRows.find((row) => row.rank === 2) ?? visibleRows[1] ?? rows[1] ?? rows[0];
  const biasAudit = buildBiasAudit(visibleRows);
  const uploadedPoolCount = liveDashboardSummary?.counts.totalCandidates ?? 0;
  const summaryMetrics: { label: string; value: number; Icon: LucideIcon }[] = liveDashboardSummary
    ? [
        { label: "Active jobs", value: liveDashboardSummary.counts.activeJobs, Icon: Briefcase },
        { label: "Uploaded pool", value: uploadedPoolCount, Icon: Users },
        { label: "Scores", value: liveDashboardSummary.counts.rankedCandidates, Icon: BarChart3 },
        { label: "Review flags", value: liveDashboardSummary.counts.antiGamingFlags, Icon: AlertTriangle },
        { label: "Feedback", value: liveDashboardSummary.counts.feedbackItems, Icon: ClipboardList },
      ]
    : [];

  const radarData = selected
    ? [
        { dimension: "Technical", score: selected.technical_fit },
        { dimension: "Trajectory", score: selected.trajectory_score },
        { dimension: "Behavioral", score: selected.behavioral_score },
        { dimension: "Domain", score: selected.domain_score },
        { dimension: "GitHub", score: selected.platform_activity_score },
      ]
    : [];

  const chartRows = visibleRows.map((row) => ({
    name: blindReview ? row.candidate.diversity_context.review_name : row.candidate.full_name.split(" ")[0],
    score: Math.round(row.composite_score * 100),
    technical: Math.round(row.technical_fit * 100),
  }));

  const updateWeight = (key: keyof ScoringWeights, value: number) => {
    const next = { ...weights, [key]: value };
    const total = Object.values(next).reduce((sum, item) => sum + item, 0) || 1;
    const normalized = Object.fromEntries(
      Object.entries(next).map(([entryKey, entryValue]) => [entryKey, entryValue / total]),
    ) as unknown as ScoringWeights;
    setWeights(normalized);
  };

  const runRankingForJob = async (jobId: string, nextWeights: ScoringWeights) => {
    const response = await fetch(`/api/jobs/${jobId}/rank`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ weights: nextWeights }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error ?? "Ranking failed");
    }

    const scoresResponse = await fetch(`/api/jobs/${jobId}/scores`);
    if (!scoresResponse.ok) throw new Error("Could not load ranked candidates");
    const scoresPayload = await scoresResponse.json() as { data: RankedCandidate[] };
    queryClient.setQueryData(["rankings", jobId], scoresPayload.data);
    await dashboardSummaryQuery.refetch();
    setSelectedCandidateId(scoresPayload.data[0]?.candidate.id ?? "");
  };

  const rerank = () => {
    if (!effectiveSelectedJobId) {
      toast.error("Create or select a live job before ranking candidates");
      return;
    }

    toast.promise(runRankingForJob(effectiveSelectedJobId, weights), {
      loading: "Running live scoring...",
      success: "Live scoring finished",
      error: "Could not run live scoring",
    });
  };

  const changeJob = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs.find((item) => item.id === jobId);
    const nextWeights = job?.scoring_weights ?? weights;
    if (job?.scoring_weights) {
      setWeights(nextWeights);
    }
    setSelectedCandidateId("");
    if (uploadedPoolCount > 0) {
      toast.promise(runRankingForJob(jobId, nextWeights), {
        loading: `Ranking candidates for ${job?.title ?? "selected role"}...`,
        success: "Role shortlist updated",
        error: "Could not rank candidates for this role",
      });
    }
  };

  const downloadCsv = () => {
    if (!selectedJob) {
      toast.error("No live job selected");
      return;
    }

    const blob = new Blob([toRankingCsv(visibleRows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedJob.id}-ranked-candidates.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export ready");
  };

  const uploadCandidate = async (file: File | undefined) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    const toastId = toast.loading("Parsing candidate...");

    try {
      const response = await fetch("/api/candidates/upload", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message ?? "Upload failed");
      }

      if (effectiveSelectedJobId) {
        const rankResponse = await fetch(`/api/jobs/${effectiveSelectedJobId}/rank`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ weights }),
        });
        if (!rankResponse.ok) {
          const rankPayload = await rankResponse.json().catch(() => ({}));
          throw new Error(rankPayload?.error ?? "Candidate uploaded, but ranking failed");
        }
        const result = await rankingsQuery.refetch();
        await dashboardSummaryQuery.refetch();
        setSelectedCandidateId(result.data?.[0]?.candidate.id ?? payload.data?.id ?? "");
      }

      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      await dashboardSummaryQuery.refetch();
      toast.success(
        effectiveSelectedJobId
          ? "Resume uploaded, persisted, and ranked"
          : "Resume uploaded to the candidate pool. Create/select a job to rank it.",
        { id: toastId },
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed", { id: toastId });
    }
  };

  return (
    <main className={embedded ? "text-slate-950" : "min-h-screen bg-[radial-gradient(circle_at_top_left,#ecfeff_0,#f8fafc_34%,#f7f7f2_100%)] text-slate-950"}>
      {!embedded && (
      <section className="border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-800">
                <Wifi className="size-3" />
                Realtime ready
              </Badge>
              <Badge variant="outline" className="bg-white text-slate-700">
                {healthQuery.data?.supabase.adminConfigured ? "Supabase live" : "Setup required"}
              </Badge>
              <span>Explainable candidate ranking</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Nava AI Recruiter</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
              Paste a role, rank candidates, inspect why, compare gaps, audit score distribution, and export the shortlist in one flow.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.csv,.json,.txt"
              onChange={(event) => uploadCandidate(event.target.files?.[0])}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" />
              Upload
            </Button>
            <Button variant="outline" onClick={() => setBlindReview((value) => !value)}>
              <EyeOff className="size-4" />
              {blindReview ? "Show names" : "Blind review"}
            </Button>
            <Button onClick={downloadCsv} disabled={!selectedJob || visibleRows.length === 0}>
              <Download className="size-4" />
              CSV
            </Button>
          </div>
        </div>
      </section>
      )}

      {liveDashboardSummary && (
        <section className="border-b border-slate-200 bg-slate-50/90">
          <div className={`${embedded ? "grid gap-3 md:grid-cols-2 lg:grid-cols-5" : "mx-auto grid max-w-7xl gap-3 px-4 py-4 md:grid-cols-2 lg:grid-cols-5 lg:px-8"}`}>
            {summaryMetrics.map(({ label, value, Icon }) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500">{label}</span>
                  <Icon className="size-4 text-slate-500" />
                </div>
                <div className="mt-2 text-2xl font-semibold">{value}</div>
              </div>
            ))}
          </div>
          <div className={`${embedded ? "mt-3 flex flex-wrap gap-2" : "mx-auto flex max-w-7xl flex-wrap gap-2 px-4 pb-4 lg:px-8"}`}>
            {[
              "JD parser",
              "Resume upload",
              "Ranked shortlist",
              "Candidate presentation",
              "Why Not #1",
              "Bias audit",
              "CSV export",
              "Feedback loop",
            ].map((feature) => (
              <Badge key={feature} variant="outline" className="bg-white">
                {feature}
              </Badge>
            ))}
            <Badge variant={liveDashboardSummary.source === "live" ? "default" : "outline"}>
              {liveDashboardSummary.source === "live" ? "Live data" : "Setup required"}
            </Badge>
          </div>
        </section>
      )}

      <div className={`${embedded ? "mt-3 grid gap-3 lg:grid-cols-[300px_1fr]" : "mx-auto grid max-w-7xl gap-3 px-4 py-4 lg:grid-cols-[300px_1fr] lg:px-8"}`}>
        <aside className="space-y-3">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Role</CardTitle>
              <CardDescription>Parsed requirements and scoring weights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                {jobs.length > 0 ? (
                  <>
                    <Input
                      value={roleSearch}
                      onChange={(event) => setRoleSearch(event.target.value)}
                      placeholder="Filter roles, skills, domains..."
                    />
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {filteredJobs.map((job) => (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => changeJob(job.id)}
                          className={`w-full rounded-lg border px-3 py-2 text-left transition hover:border-slate-400 ${job.id === effectiveSelectedJobId ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white"}`}
                        >
                          <div className="text-sm font-semibold">{job.title}</div>
                          <div className={`mt-1 text-xs ${job.id === effectiveSelectedJobId ? "text-slate-200" : "text-slate-500"}`}>
                            {job.parsed_requirements?.domain ?? "general"} · {(job.parsed_requirements?.required_skills ?? []).slice(0, 3).join(", ")}
                          </div>
                        </button>
                      ))}
                      {filteredJobs.length === 0 && (
                        <div className="rounded-lg border border-dashed bg-slate-50 p-3 text-sm text-slate-600">
                          No roles match that filter.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                    No live jobs found. Create a job in the dashboard, then return here to rank uploaded candidates.
                  </div>
                )}
              </div>
              {selectedJob && (
                <>
                  <div className="rounded-lg border bg-slate-50 p-3">
                    <div className="text-sm font-medium">{selectedJob.company ?? "Company not set"}</div>
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      {selectedJob.parsed_requirements?.role_summary ?? "This job has not been parsed yet."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedJob.parsed_requirements?.required_skills ?? []).map((skill) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border bg-white p-3">
                      <div className="text-slate-500">Seniority</div>
                      <div className="mt-1 font-semibold capitalize">{selectedJob.parsed_requirements?.seniority ?? "unknown"}</div>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <div className="text-slate-500">Domain</div>
                      <div className="mt-1 font-semibold capitalize">{selectedJob.parsed_requirements?.domain ?? "unknown"}</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="size-4" />
                Weights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <WeightSlider label="Technical fit" value={weights.technical_fit} onChange={(value) => updateWeight("technical_fit", value)} />
              <WeightSlider label="Trajectory" value={weights.trajectory} onChange={(value) => updateWeight("trajectory", value)} />
              <WeightSlider label="Behavioral evidence" value={weights.behavioral} onChange={(value) => updateWeight("behavioral", value)} />
              <WeightSlider label="Domain" value={weights.domain} onChange={(value) => updateWeight("domain", value)} />
              <WeightSlider label="Platform activity" value={weights.platform_activity} onChange={(value) => updateWeight("platform_activity", value)} />
              <Button className="w-full" onClick={rerank} disabled={rankingsQuery.isFetching || !effectiveSelectedJobId}>
                <Zap className="size-4" />
                {rankingsQuery.isFetching ? "Refreshing..." : "Rerank"}
              </Button>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="size-4" />
                Natural Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter candidates by skill, strength, gap..."
              />
              <p className="text-xs leading-5 text-slate-600">
                Parsed as semantic intent plus filters for seniority, open-source signal, and growth trajectory.
              </p>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {[
                ["Supabase", healthQuery.data?.supabase.configured],
                ["Gemini", healthQuery.data?.gemini.configured],
                ["GitHub", healthQuery.data?.github.configured],
              ].map(([label, configured]) => (
                <div key={String(label)} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                  <span>{label}</span>
                  <Badge variant={configured ? "default" : "outline"}>{configured ? "Live" : "Fallback"}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          </motion.div>
        </aside>

        <section className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500">Uploaded pool</div>
                <div className="text-2xl font-semibold">{uploadedPoolCount}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500">Shortlisted</div>
                <div className="text-2xl font-semibold">{visibleRows.length}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500">Anti-gaming flags</div>
                <div className="text-2xl font-semibold">{visibleRows.filter((row) => row.anti_gaming_flag).length}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500">Bias audit</div>
                <div className="flex items-center gap-2 text-2xl font-semibold">
                  {biasAudit.status === "Passing" ? <ShieldCheck className="size-5 text-emerald-700" /> : <AlertTriangle className="size-5 text-amber-700" />}
                  {biasAudit.status}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-3">
            <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle>Ranked Shortlist</CardTitle>
                <CardDescription>Every score includes a recruiter-readable why</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <AnimatePresence mode="popLayout">
                {visibleRows.length === 0 && (
                  <div className="rounded-lg border border-dashed bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    {rows.length > 0
                      ? "No ranked candidates match the current search."
                      : uploadedPoolCount > 0 && selectedJob
                      ? "Candidate profiles are ready. Run ranking to build the role-specific shortlist."
                      : uploadedPoolCount > 0
                      ? "Candidate profiles are ready. Select a role, then run ranking to build the shortlist."
                      : "Upload resumes and create/select a job to generate a ranked shortlist."}
                  </div>
                )}
                {visibleRows.map((row) => (
                  <motion.button
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    key={row.candidate.id}
                    onClick={() => setSelectedCandidateId(row.candidate.id)}
                    className={`w-full rounded-lg border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 ${selected?.candidate.id === row.candidate.id ? "border-slate-950 ring-2 ring-slate-950/5" : "border-slate-200"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">#{row.rank}</span>
                          <span className="font-semibold">{blindReview ? row.candidate.diversity_context.review_name : row.candidate.full_name}</span>
                          {row.anti_gaming_flag && <Badge variant="destructive">Review language</Badge>}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">{row.candidate.title} · {row.candidate.location}</div>
                      </div>
                      <div className={`text-2xl font-semibold ${scoreClass(row.composite_score)}`}>{percent(row.composite_score)}</div>
                    </div>
                    <p className="mt-3 text-sm leading-5 text-slate-700">{row.rationale}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">Tech {percent(row.technical_fit)}</Badge>
                      <Badge variant="outline">Trajectory {percent(row.trajectory_score)}</Badge>
                      <Badge variant="outline">Domain {percent(row.domain_score)}</Badge>
                      {row.candidate.github_signals && (
                        <Badge variant="outline" className="gap-1"><GitBranch className="size-3" /> {row.candidate.github_signals.total_stars} stars</Badge>
                      )}
                    </div>
                  </motion.button>
                ))}
                </AnimatePresence>
              </CardContent>
            </Card>

            {visibleRows.length > 0 ? (
              <div className="grid gap-3 xl:grid-cols-2">
                <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="size-4" />
                      Score Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartRows}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="score" fill="#0f766e" />
                        <Bar dataKey="technical" fill="#334155" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="size-4" />
                      Bias Audit Panel
                    </CardTitle>
                    <CardDescription>Graduation decade proxy from uploaded profiles</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {biasAudit.report.map((item) => (
                      <div key={item.proxy_value} className="rounded-lg border bg-white p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.proxy_value}</span>
                          <span className="text-sm font-semibold">{percent(item.avg_score)}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-teal-700" style={{ width: percent(item.avg_score) }} />
                        </div>
                      </div>
                    ))}
                    <div className="text-xs leading-5 text-slate-600">
                      Score spread: {percent(biasAudit.spread)}. Review differences; do not auto-reject.
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-3">
                <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="size-4" />
                      Selected Role
                    </CardTitle>
                    <CardDescription>{selectedJob?.company ?? "Role catalog"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-lg font-semibold">{selectedJob?.title ?? "Choose a role"}</div>
                    <p className="text-sm leading-6 text-slate-600">
                      {selectedJob?.parsed_requirements?.role_summary ??
                        "Select a role from the role panel to activate candidate ranking."}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedJob?.parsed_requirements?.required_skills ?? []).slice(0, 6).map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="size-4" />
                      Candidate Pool
                    </CardTitle>
                    <CardDescription>Profiles ready for role matching</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-4xl font-semibold">{uploadedPoolCount}</div>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                        <span className="text-slate-500">Review flags</span>
                        <span className="font-medium">{liveDashboardSummary?.counts.antiGamingFlags ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                        <span className="text-slate-500">Generated scores</span>
                        <span className="font-medium">{liveDashboardSummary?.counts.rankedCandidates ?? 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="size-4" />
                      Next Action
                    </CardTitle>
                    <CardDescription>Generate the shortlist workspace</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm leading-6 text-slate-600">
                      Run ranking to fill this canvas with score distribution, candidate evidence, bias review, and interview focus.
                    </p>
                    <Button className="w-full" onClick={rerank} disabled={!effectiveSelectedJobId || uploadedPoolCount === 0}>
                      <Zap className="size-4" />
                      Rank candidates
                    </Button>
                    <div className="text-xs leading-5 text-slate-500">
                      Nava uses role weights, semantic skill evidence, trajectory, behavioral proof, domain fit, and platform signals.
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            </div>

            {selected && (
              <div className="space-y-3 xl:sticky xl:top-20">
                <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
                  <CardHeader>
                    <CardTitle>{blindReview ? selected.candidate.diversity_context.review_name : selected.candidate.full_name}</CardTitle>
                    <CardDescription>{selected.candidate.parsed_profile.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-lg border bg-slate-50 p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <ClipboardList className="size-4" />
                        Candidate presentation
                      </div>
                      <div className="space-y-3 text-sm leading-6 text-slate-700">
                        <p>{selected.rationale}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-md border bg-white p-2">
                            <div className="text-xs font-medium uppercase text-slate-500">Lead with</div>
                            <div>{selected.strengths[0] ?? "Strong role-relevant evidence"}</div>
                          </div>
                          <div className="rounded-md border bg-white p-2">
                            <div className="text-xs font-medium uppercase text-slate-500">Probe</div>
                            <div>{selected.concerns[0] ?? "Validate depth through practical examples"}</div>
                          </div>
                        </div>
                        <div className="rounded-md border bg-white p-2">
                          <div className="text-xs font-medium uppercase text-slate-500">Panel-ready question</div>
                          <div>{selected.interview_questions[0] ?? "Walk through the strongest matching project in detail."}</div>
                        </div>
                      </div>
                    </div>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                          <Radar dataKey="score" fill="#0f766e" fillOpacity={0.28} stroke="#0f766e" />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Strengths</div>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        {selected.strengths.map((strength) => <li key={strength}>{strength}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Interview focus</div>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        {selected.interview_questions.map((question) => <li key={question}>{question}</li>)}
                      </ul>
                    </div>
                    {selected.gaps.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        Gap context: {selected.gaps.join(" ")}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GitCompare className="size-4" />
                      Why Not #1
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-6 text-slate-700">
                    {selected.rank === 1 && runnerUp ? compareCandidates(selected, runnerUp) : compareCandidates(visibleRows[0] ?? rows[0], selected)}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

        </section>
      </div>
    </main>
  );
}
