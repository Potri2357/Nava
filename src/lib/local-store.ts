import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { defaultWeights } from "@/features/jobs/constants";
import { roleTemplates } from "@/features/jobs/role-templates";
import type { ParsedProfile } from "@/features/candidates/types";
import type { ParsedJD, ScoringWeights } from "@/features/jobs/types";

const storeDir = path.join(process.cwd(), ".nava-data");
const storePath = path.join(storeDir, "store.json");

export type LocalJob = {
  id: string;
  title: string;
  company: string | null;
  raw_description: string;
  parsed_requirements: ParsedJD | null;
  scoring_weights: ScoringWeights;
  status: "draft" | "active" | "paused" | "closed";
  source: "api" | "upload" | "bulk";
  created_at: string;
};

export type LocalCandidate = {
  id: string;
  full_name: string | null;
  email: string | null;
  raw_resume_text: string;
  file_hash: string;
  parsed_profile: ParsedProfile | null;
  github_username: string | null;
  github_signals: null;
  anti_gaming_flag: boolean;
  anti_gaming_score: number;
  anti_gaming_reasons: string[];
  source: "upload" | "bulk" | "api";
  created_at: string;
};

export type LocalScore = {
  id: string;
  job_id: string;
  candidate_id: string;
  rank: number;
  composite_score: number;
  technical_fit: number;
  trajectory_score: number;
  behavioral_score: number;
  domain_score: number;
  platform_activity_score: number;
  rationale: string;
  strengths: string[];
  concerns: string[];
  gaps: string[];
  interview_questions: string[];
  created_at: string;
};

type Store = {
  jobs: LocalJob[];
  candidates: LocalCandidate[];
  scores: LocalScore[];
};

const emptyStore = (): Store => ({ jobs: [], candidates: [], scores: [] });

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      jobs: parsed.jobs ?? [],
      candidates: parsed.candidates ?? [],
      scores: parsed.scores ?? [],
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: Store) {
  await mkdir(storeDir, { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2));
}

export async function listLocalJobs() {
  const store = await readStore();
  return store.jobs.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function ensureLocalRoleCatalog() {
  const store = await readStore();
  const existingTitles = new Set(store.jobs.map((job) => job.title.toLowerCase()));
  const now = Date.now();
  const missingJobs = roleTemplates
    .filter((template) => !existingTitles.has(template.title.toLowerCase()))
    .map((template, index): LocalJob => ({
      id: `local-job-${crypto.randomUUID()}`,
      title: template.title,
      company: template.company,
      raw_description: template.raw_description,
      parsed_requirements: template.parsed_requirements,
      scoring_weights: template.scoring_weights,
      status: "active",
      source: "api",
      created_at: new Date(now - index * 1000).toISOString(),
    }));

  if (missingJobs.length > 0) {
    store.jobs.unshift(...missingJobs);
    await writeStore(store);
  }

  return store.jobs.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getLocalJob(id: string) {
  const store = await readStore();
  return store.jobs.find((job) => job.id === id) ?? null;
}

export async function insertLocalJob(input: {
  title: string;
  company: string | null;
  raw_description: string;
  parsed_requirements: ParsedJD | null;
  scoring_weights?: ScoringWeights;
}) {
  const store = await readStore();
  const job: LocalJob = {
    id: `local-job-${crypto.randomUUID()}`,
    title: input.title,
    company: input.company,
    raw_description: input.raw_description,
    parsed_requirements: input.parsed_requirements,
    scoring_weights: input.scoring_weights ?? defaultWeights,
    status: "active",
    source: "api",
    created_at: new Date().toISOString(),
  };
  store.jobs.unshift(job);
  await writeStore(store);
  return job;
}

export async function listLocalCandidates() {
  const store = await readStore();
  return store.candidates.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getLocalCandidate(id: string) {
  const store = await readStore();
  return store.candidates.find((candidate) => candidate.id === id) ?? null;
}

export async function insertLocalCandidate(input: Omit<LocalCandidate, "id" | "created_at" | "source" | "github_signals">) {
  const store = await readStore();
  const existing = store.candidates.find((candidate) => candidate.file_hash === input.file_hash);
  if (existing) return { candidate: existing, status: "already_exists" as const };

  const candidate: LocalCandidate = {
    ...input,
    id: `local-candidate-${crypto.randomUUID()}`,
    github_signals: null,
    source: "upload",
    created_at: new Date().toISOString(),
  };
  store.candidates.unshift(candidate);
  await writeStore(store);
  return { candidate, status: "created" as const };
}

export async function listLocalScores(jobId: string) {
  const store = await readStore();
  const candidatesById = new Map(store.candidates.map((candidate) => [candidate.id, candidate]));
  return store.scores
    .filter((score) => score.job_id === jobId)
    .sort((a, b) => a.rank - b.rank)
    .map((score) => ({
      ...score,
      candidates: candidatesById.get(score.candidate_id) ?? null,
    }));
}

export async function replaceLocalScores(jobId: string, scores: LocalScore[]) {
  const store = await readStore();
  store.scores = [...store.scores.filter((score) => score.job_id !== jobId), ...scores];
  await writeStore(store);
}
