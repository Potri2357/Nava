"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Download,
  EyeOff,
  GitBranch,
  GitCompare,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Wifi,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, Radar, RadarChart, PolarAngleAxis, PolarGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { demoJobs, defaultWeights, type DemoJob } from "@/features/demo/data";
import { buildBiasAudit, compareCandidates, rankDemoCandidates, toRankingCsv, type DemoRankedCandidate } from "@/features/demo/ranking";
import { useLiveJobs, useLiveRankings } from "@/features/realtime/use-realtime-rankings";
import type { ScoringWeights } from "@/features/jobs/types";

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

export function DemoRecruiterApp({ initialRows, initialJobs }: { initialRows: DemoRankedCandidate[]; initialJobs: DemoJob[] }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedJobId, setSelectedJobId] = useState(demoJobs[0].id);
  const [selectedCandidateId, setSelectedCandidateId] = useState(initialRows[0]?.candidate.id ?? "");
  const [blindReview, setBlindReview] = useState(false);
  const [query, setQuery] = useState("senior backend engineer with open-source cred and strong trajectory");
  const [weights, setWeights] = useState<ScoringWeights>(defaultWeights);
  const jobsQuery = useLiveJobs(initialJobs);
  const rankingsQuery = useLiveRankings(selectedJobId, initialRows);
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await fetch("/api/health");
      if (!response.ok) throw new Error("Health check failed");
      return response.json() as Promise<{
        mode: "live" | "demo";
        supabase: { configured: boolean; adminConfigured: boolean };
        gemini: { configured: boolean };
        github: { configured: boolean };
      }>;
    },
  });

  const jobs = jobsQuery.data ?? demoJobs;
  const rows = rankingsQuery.data ?? initialRows;
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? demoJobs[0];
  const selected = rows.find((row) => row.candidate.id === selectedCandidateId) ?? rows[0];
  const runnerUp = rows.find((row) => row.rank === 2) ?? rows[1] ?? rows[0];
  const biasAudit = useMemo(() => buildBiasAudit(rows), [rows]);

  const radarData = selected
    ? [
        { dimension: "Technical", score: selected.technical_fit },
        { dimension: "Trajectory", score: selected.trajectory_score },
        { dimension: "Behavioral", score: selected.behavioral_score },
        { dimension: "Domain", score: selected.domain_score },
        { dimension: "GitHub", score: selected.platform_activity_score },
      ]
    : [];

  const chartRows = rows.map((row) => ({
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

  const rerank = () => {
    if (selectedJobId.startsWith("job-")) {
      const nextRows = rankDemoCandidates(selectedJobId, weights);
      queryClient.setQueryData(["rankings", selectedJobId], nextRows);
      setSelectedCandidateId(nextRows[0]?.candidate.id ?? "");
      toast.success("Demo shortlist reranked");
      return;
    }

    toast.promise(fetch(`/api/jobs/${selectedJobId}/rank`, { method: "POST" }).then((response) => {
      if (!response.ok) throw new Error("Ranking failed");
      queryClient.invalidateQueries({ queryKey: ["rankings", selectedJobId] });
    }), {
      loading: "Running live scoring...",
      success: "Live scoring finished",
      error: "Could not run live scoring",
    });
  };

  const changeJob = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs.find((item) => item.id === jobId) ?? demoJobs[0];
    setWeights(job.scoring_weights);
    if (jobId.startsWith("job-")) {
      const nextRows = rankDemoCandidates(jobId, job.scoring_weights);
      queryClient.setQueryData(["rankings", jobId], nextRows);
      setSelectedCandidateId(nextRows[0]?.candidate.id ?? "");
    }
  };

  const downloadCsv = () => {
    const blob = new Blob([toRankingCsv(rows)], { type: "text/csv;charset=utf-8" });
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

    toast.promise(fetch("/api/candidates/upload", { method: "POST", body: formData }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message ?? "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: ["rankings", selectedJobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    }), {
      loading: "Parsing candidate...",
      success: "Candidate uploaded",
      error: (error) => error.message,
    });
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ecfeff_0,#f8fafc_34%,#f7f7f2_100%)] text-slate-950">
      <section className="border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-800">
                <Wifi className="size-3" />
                Realtime ready
              </Badge>
              <Badge variant="outline" className="bg-white text-slate-700">
                {selectedJobId.startsWith("job-") ? "Demo data" : "Supabase live"}
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
            <Button onClick={downloadCsv}>
              <Download className="size-4" />
              CSV
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[340px_1fr] lg:px-8">
        <aside className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Role</CardTitle>
              <CardDescription>Parsed requirements and scoring weights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                {jobs.map((job) => (
                  <Button
                    key={job.id}
                    variant={job.id === selectedJobId ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => changeJob(job.id)}
                  >
                    {job.title}
                  </Button>
                ))}
              </div>
              <div className="rounded-lg border bg-slate-50 p-3">
                <div className="text-sm font-medium">{selectedJob.company}</div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{selectedJob.parsed_requirements.role_summary}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedJob.parsed_requirements.required_skills.map((skill) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border bg-white p-3">
                  <div className="text-slate-500">Seniority</div>
                  <div className="mt-1 font-semibold capitalize">{selectedJob.parsed_requirements.seniority}</div>
                </div>
                <div className="rounded-lg border bg-white p-3">
                  <div className="text-slate-500">Domain</div>
                  <div className="mt-1 font-semibold capitalize">{selectedJob.parsed_requirements.domain}</div>
                </div>
              </div>
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
            <CardContent className="space-y-4">
              <WeightSlider label="Technical fit" value={weights.technical_fit} onChange={(value) => updateWeight("technical_fit", value)} />
              <WeightSlider label="Trajectory" value={weights.trajectory} onChange={(value) => updateWeight("trajectory", value)} />
              <WeightSlider label="Behavioral evidence" value={weights.behavioral} onChange={(value) => updateWeight("behavioral", value)} />
              <WeightSlider label="Domain" value={weights.domain} onChange={(value) => updateWeight("domain", value)} />
              <WeightSlider label="Platform activity" value={weights.platform_activity} onChange={(value) => updateWeight("platform_activity", value)} />
              <Button className="w-full" onClick={rerank} disabled={rankingsQuery.isFetching}>
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
              <Input value={query} onChange={(event) => setQuery(event.target.value)} />
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

        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500">Candidates</div>
                <div className="text-2xl font-semibold">{rows.length}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500">Top score</div>
                <div className="text-2xl font-semibold">{percent(rows[0]?.composite_score ?? 0)}</div>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500">Anti-gaming flags</div>
                <div className="text-2xl font-semibold">{rows.filter((row) => row.anti_gaming_flag).length}</div>
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

          <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
            <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle>Ranked Shortlist</CardTitle>
                <CardDescription>Every score includes a recruiter-readable why</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <AnimatePresence mode="popLayout">
                {rows.map((row) => (
                  <motion.button
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    key={row.candidate.id}
                    onClick={() => setSelectedCandidateId(row.candidate.id)}
                    className={`w-full rounded-lg border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 ${selected?.candidate.id === row.candidate.id ? "border-slate-950 ring-2 ring-slate-950/5" : "border-slate-200"}`}
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

            {selected && (
              <div className="space-y-4">
                <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
                  <CardHeader>
                    <CardTitle>{blindReview ? selected.candidate.diversity_context.review_name : selected.candidate.full_name}</CardTitle>
                    <CardDescription>{selected.candidate.parsed_profile.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-64">
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
                    {selected.rank === 1 && runnerUp ? compareCandidates(selected, runnerUp) : compareCandidates(rows[0], selected)}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="rounded-lg border-white/70 bg-white/90 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-4" />
                  Score Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
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
                <CardDescription>Graduation decade proxy, shown for demo transparency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {biasAudit.report.map((item) => (
                  <div key={item.proxy_value} className="rounded-lg border bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.proxy_value}</span>
                      <span className="text-sm font-semibold">{percent(item.avg_score)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-teal-700" style={{ width: percent(item.avg_score) }} />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{item.candidate_count} candidate(s)</div>
                  </div>
                ))}
                <div className="text-xs leading-5 text-slate-600">
                  Score spread: {percent(biasAudit.spread)}. This panel surfaces differences for human review; it does not auto-reject candidates.
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
