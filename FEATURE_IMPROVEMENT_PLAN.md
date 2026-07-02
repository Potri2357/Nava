# Nava Feature Improvement Plan

This plan turns Nava into a real data product feature by feature, using `PROJECT_PLAN.md` as the source of truth. The app should use only original jobs and candidate uploads persisted in Supabase.

## Guiding rules

- Live Supabase data is the primary path for every screen and API.
- Only original Supabase jobs and uploaded candidate files should appear in the product UI.
- Every candidate-facing score must show evidence, concern, and interview action.
- Recruiters must be able to review, override, export, and explain shortlists without leaving the app.

## Phase 1: Real Data Foundation

Status: in progress

- Replace hardcoded dashboard metrics with live counts from `jobs`, `candidates`, `scores`, and `feedback`.
- Keep `/api/jobs`, `/api/candidates/upload`, `/api/jobs/:id/rank`, and `/api/jobs/:id/scores` as the primary data surface.
- Add real empty states instead of silently showing placeholder candidates.
- Add visible source labels: `Live data`, `Supabase live`, or `Setup required`.

## Phase 2: Candidate Intake

Status: next

- Improve resume parsing to extract `full_name`, `email`, latest title, current location, and GitHub username.
- Add bulk upload support for CSV and multi-file resume batches.
- Store parsed candidate source and parse status so recruiters can see failed or partial parses.
- Fetch GitHub signals after upload when a username is available.

## Phase 3: Job Intake and Search

Status: planned

- Add a real job creation screen wired to `/api/jobs`.
- Let recruiters paste a JD, review parsed requirements, edit weights, and save.
- Wire natural-language search to hybrid retrieval instead of local text filtering.
- Keep boolean search as a visible fallback for recruiter sanity checks.

## Phase 4: Ranking and Explainability

Status: planned

- Use hybrid retrieval to choose candidate pools before scoring.
- Persist scoring version, weights used, model used, and retrieval method for every score.
- Add inline candidate presentation cards with summary, score drivers, concerns, gap context, and interview focus.
- Add a side-by-side "Why Not #1" view powered by stored score dimensions.

## Phase 5: Recruiter Feedback Loop

Status: planned

- Add upvote/downvote and notes on each score.
- Write feedback to the `feedback` table with previous rank.
- Surface feedback count and recent override notes in the dashboard.
- Prepare the data shape for v2 personalized weight calibration.

## Phase 6: Audit and Compliance

Status: planned

- Use the `bias_audit_report(job_id)` SQL function for live jobs.
- Show score spread by proxy group with clear "review, do not auto-reject" language.
- Add audit log writes for job creation, candidate upload, ranking, export, and feedback.
- Add export metadata so generated CSVs can be reproduced.

## Phase 7: Candidate Database

Status: planned

- Build `/dashboard/candidates` as a real searchable candidate table.
- Add filters for skills, seniority, domain, GitHub signal, anti-gaming flag, and parse source.
- Add candidate detail view with parsed profile, trajectory, GitHub activity, and ranking history.

## Phase 8: Submission Polish

Status: planned

- Run full build/lint checks.
- Add seed instructions and live setup screenshots to the README.
- Prepare a concise presentation script explaining the candidate ranking flow.
- Export a ranked CSV from original uploaded Supabase data.
