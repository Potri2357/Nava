# Nava Deep Product Brainstorm

## Product North Star

Nava should feel like a recruiter command center, not a static prototype. The first screen should let a recruiter understand the hiring pipeline, choose a role, upload or inspect candidates, run ranking, explain the shortlist, compare tradeoffs, audit risk, and export a hiring-manager-ready packet.

The product promise is: paste a job, add candidates, get a ranked shortlist that a human can defend.

## Core User Flow

1. Recruiter lands on `/`.
2. They see live pipeline health: active jobs, candidates, scores, flags, and feedback.
3. They choose a job from the role list.
4. They review parsed requirements and tune scoring weights.
5. They upload candidates or use the current candidate database.
6. Nava ranks candidates with explainable scoring.
7. Recruiter clicks a candidate and gets an inline presentation: rationale, lead-with point, risk/probe area, and interview question.
8. Recruiter compares any candidate against #1.
9. Recruiter checks bias/gap context and exports CSV.
10. Recruiter adds feedback so the system becomes more useful over time.

## Feature Brainstorm

### 1. Landing Page as Command Center

What it should do:
- Show dashboard metrics directly on `/`.
- Surface all feature options as visible controls: upload, blind review, rerank, export, search, compare, audit.
- Avoid a marketing page. The app should start with the working recruiter workflow.

Current status:
- `/` now loads dashboard summary and shows command-center metrics above the recruiter flow.
- `/dashboard` remains useful but is no longer the only place with operational data.

Next build step:
- Add quick filters near the feature chips: flagged only, GitHub signal, gap context, seniority, and minimum score.

### 2. Job Listings

What it should do:
- Show several realistic roles across different hiring needs.
- Switching jobs should change rank order and score rationale.
- Each job should show parsed requirements, required skills, nice-to-haves, domain, seniority, and responsibilities.

Current status:
- Job listings now come from Supabase only. Empty states guide the recruiter to create an original job.

Next build step:
- Build a real `/dashboard/jobs/new` form that posts to `/api/jobs`.
- Add edit mode for parsed JD requirements before saving.

### 3. Candidate Database

What it should do:
- Recruiters need a real searchable pool, not only a shortlist.
- Candidate profiles should include parsed skills, timeline, education, GitHub, anti-gaming status, and ranking history.

Current status:
- Candidate listings now come from Supabase only.
- Upload API parses and inserts candidates when Supabase is configured, and rejects non-persistent uploads.

Next build step:
- Add `/dashboard/candidates` with table filters and candidate detail.
- Improve resume parsing to store full name, email, current title, location, and parse status.

### 4. Ranking Engine

What it should do:
- Blend technical fit, trajectory, behavioral evidence, domain match, and platform activity.
- Explain every score in recruiter-readable language.
- Use role-specific weights.

Current status:
- Ranking uses semantic aliases, trajectory scoring, anti-gaming detection, GitHub signals, and TOPSIS.
- Live route persists score dimensions and rationale.

Next build step:
- Use hybrid search to select the candidate pool before live LLM scoring.
- Add cached scoring so the app does not rescore unchanged candidates unnecessarily.

### 5. Inline Candidate Presentation

What it should do:
- Give the recruiter a compact hiring-manager narrative.
- Include: candidate pitch, strongest evidence, main concern, and targeted interview question.

Current status:
- Candidate detail now includes a `Candidate presentation` panel.

Next build step:
- Add one-click copy/export for candidate presentation notes.
- Add a presentation mode that hides controls and shows a clean shortlist packet.

### 6. Why Not #1 Comparator

What it should do:
- Explain why a candidate is below the leader without making the score feel arbitrary.
- Compare dimension gaps, not just total score.

Current status:
- Existing comparator explains the largest score gap.

Next build step:
- Let recruiter choose any two candidates.
- Add a compact comparison table for score dimensions and evidence.

### 7. Bias and Gap Review

What it should do:
- Show demographic proxy score spread and employment gap context.
- Make it clear that the system surfaces risks for review, not rejection.

Current status:
- Bias audit panel exists.
- Gap context is surfaced in candidate detail.

Next build step:
- Use the live `bias_audit_report(job_id)` SQL function for Supabase jobs.
- Add exportable audit notes per job.

### 8. Recruiter Feedback Loop

What it should do:
- Recruiter can upvote/downvote ranking, add notes, and override decisions.
- Feedback should be logged and later used for calibration.

Current status:
- Database has a `feedback` table and dashboard summary counts feedback.

Next build step:
- Add feedback controls to each ranked candidate.
- Write feedback from the landing page directly to Supabase.

### 9. Natural-Language Search

What it should do:
- Support queries like "senior backend engineer with fast growth and open-source signal".
- Translate intent into semantic retrieval plus filters.

Current status:
- Search input exists as UI.

Next build step:
- Add `/api/candidates/search` using hybrid search when embeddings exist.
- If embeddings are unavailable, fall back to parsed profile keyword matching on original uploaded records.

### 10. Export and Submission Quality

What it should do:
- Produce ranked CSV matching the required output format.
- Produce a shortlist packet suitable for hiring manager review.

Current status:
- CSV export exists.

Next build step:
- Add JSON export with job metadata, weights used, model used, and generated timestamp.
- Add a printable shortlist view.

## Build Order

1. Landing command center and original Supabase data flow.
2. Candidate database route.
3. Job creation route and form.
4. Search API and filters.
5. Feedback write path.
6. Live bias audit per job.
7. Presentation/export mode.
8. Final polish, empty states, and README walkthrough.

## Quality Bar

- If Supabase is not configured, show setup/empty states.
- No score without a reason.
- No rejection automation. The product helps humans review.
- No dead ends. Every panel should lead to upload, rank, compare, audit, feedback, or export.
