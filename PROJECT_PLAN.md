# AI Recruiter — Smart Candidate Ranking System
### Complete Feature Set, USP Map, and Zero-Cost Implementation Plan

---

## 1. The core insight

Every existing AI recruiting tool — Eightfold, HireVue, Paradox, Beamery, SeekOut — was built **before** generative LLMs could reason about a candidate the way a human recruiter does. They're keyword-matching engines with a machine-learning paint job. The actual complaints from recruiters (G2 reviews) and candidates (Reddit, Quora) point to the same five failures, repeated across every vendor:

1. Resumes get scored on keyword overlap, not on what the words actually mean ("led 12 engineers" ≠ "people management" to a keyword matcher).
2. Scores are a black box — recruiters can't explain *why* someone ranked #1 to a hiring manager.
3. Every tool looks only at the resume text. None look at GitHub, community activity, or behavioral signals.
4. ChatGPT-optimized resumes (64% of recruiters report a flood of look-alikes) defeat keyword systems entirely — everyone now says the same thing.
5. Career trajectory — the difference between someone who's been static for 6 years and someone who went IC → lead → director in 4 — is invisible to a flat skill-matcher.

We are building the tool that fixes exactly these five things, for **$0/month**, using a stack any judge or recruiter can run in 10 minutes.

---

## 2. Full feature list

### 2.1 Table-stakes features (what every competitor already has — we need these to be credible)

| # | Feature | What it does | Inspired by |
|---|---|---|---|
| 1 | Job description parser | Paste/upload a JD; LLM extracts required skills, nice-to-haves, seniority, years of experience, domain | Eightfold, SeekOut |
| 2 | Resume/profile parser | Accepts PDF, DOCX, CSV, or JSON candidate data; normalizes into a structured schema | All ATS vendors |
| 3 | Keyword/boolean search fallback | Classic AND/OR/NOT search for recruiters who want to sanity-check the AI | Every legacy ATS |
| 4 | Ranked shortlist generation | Produces a sorted list of candidates against a JD | All competitors |
| 5 | Skills extraction & normalization | Maps "ReactJS", "React.js", "React" to one canonical skill node | Eightfold's skills ontology |
| 6 | Candidate database / search | Browse, filter, and search the full candidate pool, not just the shortlist | LinkedIn Recruiter, SeekOut |
| 7 | CSV/export of results | Download ranked output in the required submission format | All ATS |
| 8 | Diversity-aware filtering toggle | Optional view that hides photos/names to reduce bias while reviewing | Eightfold D&I filters |
| 9 | Bulk upload | Drop in 100s of resumes at once via a folder/zip or CSV | Greenhouse, Lever |
| 10 | Recruiter dashboard | At-a-glance view of open roles, pipeline counts, top candidates per role | Every ATS |

### 2.2 USP features — built directly from Reddit/Quora/G2 pain points (this is what makes the product *ours*)

| # | Feature | Pain point it solves | Source signal |
|---|---|---|---|
| 1 | **Explainable Match Score** — every candidate gets a 2–3 sentence plain-English rationale ("Strong fit: 5 years of distributed-systems experience directly matching the JD's core requirement, though no direct fintech domain exposure") instead of a bare number | "Black-box scoring" — Eightfold reviews on G2 repeatedly say "AI sometimes misses the mark," recruiters can't justify shortlists to hiring managers | G2 reviews, SHRM reporting |
| 2 | **Semantic Skill Equivalence Engine** — understands that "led 12 engineers", "managed a team", and "people management" are the same signal, even with zero keyword overlap | "ATS rejects qualified candidates because of vocabulary mismatch" — this is the #1 complaint across Quora threads on ATS rejection | Quora ATS threads, HBS Hidden Workers study (88% of employers admit qualified candidates get filtered for non-exact-match reasons) |
| 3 | **Career Trajectory Score** — a dedicated model that looks at the *sequence* of roles (IC → senior → lead → director) and scores momentum/acceleration, not just current title | Flat keyword tools see 3 job titles and treat them as 3 unrelated data points, missing high-potential candidates on a steep growth curve | Direct gap identified vs Eightfold/SeekOut — no competitor scores trajectory shape |
| 4 | **Multi-Source Signal Fusion (GitHub + platform activity)** — pulls public GitHub stats (commit frequency, repo stars, language mix, contribution streaks) and folds them into the score for technical roles | Every competitor scores resume text only. None of HireVue/Eightfold/Paradox ingest GitHub or community signals | Identified gap in 100+ AI recruiting stats review |
| 5 | **Anti-Gaming Detector** — flags resumes that look AI-generated/templated (generic buzzword density, no concrete metrics, structure identical to thousands of others) so recruiters know which "great-looking" resumes need extra scrutiny | 64% of recruiters report a flood of AI-written look-alike resumes that defeat keyword scoring | ResumeBuilder survey 2024–25, SHRM "Recruitment is Broken" |
| 6 | **Recruiter Override + Feedback Loop** — recruiters can upvote/downvote a ranking; the system logs this and (in v2) can recalibrate weighting per job family | "70% of candidates uncomfortable with AI making decisions without oversight" (Workday survey) — recruiters want a human-in-the-loop, not a black box that fully decides | Workday/Investopedia 2025 survey |
| 7 | **Bias Audit Panel** — a dedicated view showing score distribution across visible demographic proxies available in the dataset (e.g. graduation year as age proxy, university tier) with a flag if any group is being systematically scored lower | EEOC investigations into HireVue, NYC Local Law 144 bias-audit requirement, candidate trust crisis (only 26% trust AI to evaluate fairly — Gartner 2026) | Gartner 2026, NYC Local Law 144 |
| 8 | **"Why Not #1" Comparator** — click any two candidates and get an LLM-generated side-by-side explaining exactly what separates their scores | No competitor offers comparative explainability — only absolute scores | Original USP, derived from "black box" complaints |
| 9 | **Configurable Scoring Weights per Role** — recruiter can drag sliders to say "for this role, weight technical fit at 50%, trajectory at 30%, domain at 20%" instead of one fixed algorithm for every job | Generic Eightfold scoring doesn't flex per role family; "shallower on complex skills analysis" is a recurring complaint | thenontechai.com competitor review |
| 10 | **Interview Focus Generator** — for each shortlisted candidate, auto-generates 2–3 targeted interview questions probing their single biggest uncertainty/gap | No competitor closes the loop from "ranked" to "what do I actually ask them" | Original USP — extends explainability into action |
| 11 | **Resume Gap Context (not auto-reject)** — instead of silently dropping candidates with employment gaps (the #1 cause of HBS "hidden worker" exclusion — 49% of companies auto-eliminate 6-month+ gaps), the system surfaces the gap with context if available and still scores the candidate | HBS Hidden Workers study: 49% of companies eliminate any 6-month gap regardless of reason (parental leave, layoffs, caregiving) | Harvard Business School "Hidden Workers: Untapped Talent" |
| 12 | **Natural-Language Search Bar** — recruiter can type "find me someone like a senior backend engineer who's grown fast and has some open-source cred" instead of building a boolean query | Boolean search is the most-hated UX pattern in legacy ATS, repeatedly mocked on Reddit r/recruiting | r/recruiting sentiment, general ATS UX complaints |
| 13 | **Zero-Setup Public Demo Mode** — judges/recruiters can try the tool instantly on a seeded dataset with no signup, no API key required for the demo path | Every competitor (Eightfold, Beamery, HireVue) requires a sales call before you can even see the product — a constant complaint in review threads | Implementation guide reviews, "no pricing transparency" complaints across vendors |

---

## 3. Why this is genuinely user-friendly (not just feature-dense)

- **One input box, one output list.** The core flow is: paste a JD → see a ranked shortlist with reasons. No mandatory multi-step wizard.
- **Every number has a "why" next to it.** No score appears without a sentence explaining it — this single decision differentiates us from every incumbent.
- **Progressive disclosure.** The shortlist view is clean by default; click a candidate to expand the trajectory chart, GitHub signals, and bias audit context. Nothing is forced on the recruiter up front.
- **Mobile-friendly recruiter dashboard** since many reviewers/judges will check on a phone.
- **No dead ends.** Every screen has a `sendPrompt`-style next action (e.g. "Compare with #2", "Generate interview questions", "Why did this candidate rank lower?").

---

## 4. Tech stack — fully free, zero infrastructure cost

The brief is judged on outcome, not architecture purity — so we optimize for **a stack a judge can clone and run in minutes, costing $0 to operate at hackathon/demo scale.**

| Layer | Choice | Why it's free | Notes |
|---|---|---|---|
| Frontend framework | **Next.js 14 (App Router)** | Open source, deploys free on Vercel Hobby tier | Server components for fast initial load, API routes for backend logic |
| Hosting | **Vercel (Hobby plan)** | Free for personal/hackathon projects, generous bandwidth | Auto CI/CD from GitHub |
| Database + Auth | **Supabase (Free tier)** | 500MB Postgres DB, 50k monthly active users, built-in Auth, free forever | This is also our vector database — no separate vector DB needed |
| Vector search | **Supabase pgvector (built into the free Postgres DB)** | No extra service, no extra bill — pgvector ships on every Supabase project including free tier | HNSW index gives sub-10ms search up to ~1M vectors, more than enough |
| Embeddings | **Supabase Edge Functions running `gte-small`** (open-source, runs natively in Supabase's edge runtime) | Zero external API calls, zero cost, no OpenAI key required | Fallback option: OpenAI `text-embedding-3-small` if a free trial API key is available — $0.02/1M tokens is also negligible if a card is on hand |
| Keyword/sparse search | **Postgres full-text search (`tsvector`/`ts_rank`)** | Built into Postgres, already inside Supabase, no extra service | Used for hybrid retrieval — fused with vector results via Reciprocal Rank Fusion done in a SQL function or in Next.js |
| LLM reasoning & reranking | **Anthropic Claude API (free credits) or Google Gemini API (generous free tier)** | Gemini 1.5 Flash / Gemini 2.0 Flash has a genuinely free tier sufficient for a hackathon demo; Claude offers trial credits | Used for: JD parsing, explainable scoring, trajectory analysis, anti-gaming detection, interview question generation |
| File parsing | **`pdf-parse`, `mammoth` (docx → text), `papaparse` (CSV)** | All open-source npm packages, no API cost | Runs server-side in a Next.js API route or Edge Function |
| GitHub signal fetch | **GitHub REST API (free, unauthenticated up to 60 req/hr, 5000/hr with a free personal access token)** | No cost, generous rate limit for a demo dataset | Pulls public repo count, stars, languages, contribution activity |
| Styling/UI | **Tailwind CSS + shadcn/ui** | Open source, no license cost | Fast to build clean, accessible, recruiter-friendly UI |
| Charts | **Recharts** | Open source npm package | Used for trajectory timeline, score radar, bias distribution chart |
| State/data fetching | **TanStack Query (React Query)** | Open source | Caching, optimistic UI for the recruiter dashboard |
| Forms | **React Hook Form + Zod** | Open source | JD upload form, scoring-weight sliders, validation |
| Deployment CI | **GitHub Actions (free for public repos)** | Free | Lint/test on every PR |

**Total monthly cost at hackathon/demo scale: $0.** Every layer in this stack has a genuine free tier (not a 14-day trial) sufficient for a submission-grade demo with hundreds of candidates and dozens of job descriptions.

> If a paid LLM key becomes available later (production scale), the only thing that changes is swapping the model endpoint in one config file — the architecture doesn't change.

---

## 5. System architecture

```
                         ┌─────────────────────────┐
                         │   Next.js Frontend       │
                         │  (Recruiter Dashboard)    │
                         └─────────────┬─────────────┘
                                       │
                         ┌─────────────▼─────────────┐
                         │  Next.js API Routes /      │
                         │  Edge Functions (backend)  │
                         └──┬──────────┬──────────┬───┘
                            │          │          │
                  ┌─────────▼──┐ ┌─────▼─────┐ ┌──▼─────────────┐
                  │ JD Parser   │ │ Resume     │ │ GitHub Signal  │
                  │ (LLM call)  │ │ Parser     │ │ Fetcher        │
                  └─────────┬──┘ └─────┬─────┘ └──┬─────────────┘
                            │          │          │
                            └────┬─────┴─────┬────┘
                                 │           │
                       ┌─────────▼───────────▼────────┐
                       │   Supabase Postgres + pgvector │
                       │  (candidates, jobs, embeddings,│
                       │   full-text index, audit log)  │
                       └─────────────┬───────────────────┘
                                     │
                       ┌─────────────▼───────────────────┐
                       │  Hybrid Retrieval                │
                       │  BM25/tsvector (sparse) +         │
                       │  pgvector cosine (dense) →         │
                       │  Reciprocal Rank Fusion            │
                       └─────────────┬───────────────────┘
                                     │
                       ┌─────────────▼───────────────────┐
                       │  LLM Reranker & Scorer            │
                       │  (Claude/Gemini): multi-dimension │
                       │  scoring + rationale + trajectory │
                       │  + anti-gaming flag                │
                       └─────────────┬───────────────────┘
                                     │
                       ┌─────────────▼───────────────────┐
                       │  Ranked Shortlist + Explainability│
                       │  UI (radar chart, comparator,     │
                       │  bias audit, interview questions)  │
                       └───────────────────────────────────┘
```

---

## 6. Database schema (Supabase / Postgres)

```sql
-- Enable required extensions
create extension if not exists vector;
create extension if not exists pg_trgm;

-- Jobs table
create table jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  raw_description text not null,
  parsed_requirements jsonb,        -- { required_skills, nice_to_have, seniority, domain, years_exp }
  scoring_weights jsonb default '{"technical_fit":0.35,"trajectory":0.25,"behavioral":0.20,"domain":0.15,"platform_activity":0.05}',
  embedding vector(384),            -- gte-small dimension
  created_at timestamptz default now()
);

-- Candidates table
create table candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  raw_resume_text text not null,
  parsed_profile jsonb,             -- structured: skills, companies, titles, education, dates
  github_username text,
  github_signals jsonb,             -- { repos, stars, top_languages, contribution_streak }
  embedding vector(384),
  search_vector tsvector generated always as (to_tsvector('english', raw_resume_text)) stored,
  anti_gaming_flag boolean default false,
  anti_gaming_reason text,
  created_at timestamptz default now()
);

-- Scores table (one row per job x candidate)
create table scores (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete cascade,
  composite_score numeric,
  technical_fit numeric,
  trajectory_score numeric,
  behavioral_score numeric,
  domain_score numeric,
  platform_activity_score numeric,
  rationale text,
  strengths jsonb,                  -- array of strings
  concern text,
  interview_focus jsonb,            -- array of suggested questions
  rank int,
  created_at timestamptz default now()
);

-- Recruiter feedback (for the override/feedback loop USP)
create table feedback (
  id uuid primary key default gen_random_uuid(),
  score_id uuid references scores(id) on delete cascade,
  recruiter_id uuid references auth.users(id),
  vote text check (vote in ('up','down')),
  note text,
  created_at timestamptz default now()
);

-- Indexes
create index on candidates using hnsw (embedding vector_cosine_ops);
create index on jobs using hnsw (embedding vector_cosine_ops);
create index on candidates using gin (search_vector);
```

---

## 7. Implementation roadmap (zero-cost stack)

| Phase | Duration | Deliverables |
|---|---|---|
| **Phase 1 — Setup & data pipeline** | Day 1–2 | Next.js + Supabase project scaffolded; schema migrated; dataset (from the provided Drive link) ingested and parsed into `candidates` table; resume/JD parsers built with LLM structured-output calls |
| **Phase 2 — Embeddings & hybrid retrieval** | Day 2–3 | `gte-small` embeddings generated for all candidates and jobs via Edge Function; `tsvector` full-text index built; Reciprocal Rank Fusion SQL function combining BM25 + cosine search; tested against sample queries |
| **Phase 3 — LLM scoring engine** | Day 3–4 | Multi-dimensional scoring prompt built and tested (technical fit, trajectory, behavioral, domain, platform activity); explainability rationale generation; anti-gaming detector; GitHub signal fetcher wired in |
| **Phase 4 — USP features** | Day 4–5 | Trajectory score visualization; "Why Not #1" comparator; bias audit panel; configurable weight sliders; interview question generator; natural-language search bar |
| **Phase 5 — UI polish & dashboard** | Day 5–6 | Recruiter dashboard, candidate detail view, shortlist export, mobile responsiveness, empty/loading states |
| **Phase 6 — Submission package** | Day 6–7 | Clean GitHub repo with README, seed script, `.env.example`; PDF deck explaining approach; ranked output CSV in required format; recorded demo walkthrough |

---

## 8. Output file format (ranked candidates)

```csv
rank,candidate_id,candidate_name,composite_score,technical_fit,trajectory_score,behavioral_score,domain_score,platform_activity_score,anti_gaming_flag,rationale,top_strength_1,top_strength_2,top_strength_3,primary_concern,suggested_interview_question
1,C-0042,Jane Doe,0.91,0.94,0.88,0.81,0.76,0.62,false,"5 years of distributed systems experience directly matching core requirements; demonstrated IC-to-lead acceleration in under 3 years.","Strong systems design background","Proven team leadership growth","Active open-source contributor","No direct fintech domain exposure","Walk me through a time you had to lead a team through a major system migration under deadline pressure."
```

---

## 9. README structure for the GitHub repo

```markdown
# AI Recruiter — Explainable Candidate Ranking

## What this is
[2-3 sentence pitch]

## Live demo
[Vercel link]

## Quick start
1. Clone repo
2. `npm install`
3. Copy `.env.example` to `.env.local`, add Supabase + LLM keys (or use demo mode with no keys)
4. `npm run db:migrate` — sets up Supabase schema
5. `npm run db:seed` — loads sample dataset
6. `npm run dev`

## Architecture
[link to architecture diagram section]

## Features
[link to feature table]

## Tech stack
[link to stack table — note $0 cost]

## Scoring methodology
[explain the 5-dimension weighted score, hybrid retrieval, anti-gaming detection]

## Known limitations
[honest list — e.g. GitHub signals only useful for technical roles, demo dataset size]
```

---

## 10. Why this wins against the brief's evaluation criteria

The brief says: *"How you build it is up to you... the outcome is what gets judged."* Three things this plan optimizes for directly:

1. **Trust, not just accuracy.** Every competitor analysis above shows the same failure: high scores recruiters don't trust because they can't see the reasoning. Our entire feature set is organized around explainability first, ranking second.
2. **Signals nobody else uses.** GitHub activity, trajectory shape, and anti-gaming detection are not in any competitor's feature set per the research above — they are genuinely new value, not a UI repaint of Eightfold.
3. **Runs for free, runs immediately.** A judge can clone the repo and see it work in minutes with zero API keys (demo mode) — directly solving the "no transparency, sales-call-required" complaint that shows up across every competitor review.
