# Nava AI Recruiter

Explainable candidate ranking for recruiters. Nava parses job descriptions and candidate profiles, scores candidates across multiple dimensions, flags templated resumes, surfaces career trajectory, compares candidates, audits score distribution, and exports ranked CSV output.

## Implemented

- Live recruiter command center at `/` using original Supabase jobs, uploads, and scores.
- Semantic skill matching, career trajectory scoring, anti-gaming detection, weighted TOPSIS ranking, and CSV export.
- Recruiter controls for blind review, scoring weights, natural-language search intent, interview focus, and "Why Not #1" comparison.
- Upload API for PDF, DOCX, CSV, JSON, and TXT candidate files.
- Job creation API with JD parsing.
- Supabase schema for jobs, candidates, scores, feedback, skills ontology, hybrid search, bias audit, and RLS.
- Gemini-backed structured parsing/scoring when `GEMINI_API_KEY` is present, with deterministic heuristic parsing/scoring fallbacks for original uploaded content when it is not.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` to `.env.local` and fill in values when you want the live Supabase/Gemini/GitHub path:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GITHUB_PAT=
```

Without Supabase keys, the app shows setup and empty states.

## Supabase Schema

Your hosted Supabase project must have the schema before uploads can persist.

Use one of these:

```bash
npx supabase login
npm run db:link
npm run db:push
```

Or open the Supabase SQL editor and run:

```text
supabase/setup/apply_schema.sql
```

Verify the hosted project:

```bash
npm run db:check
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run db:link
npm run db:push
npm run db:check
```

Create jobs through `/dashboard/jobs/new` and upload candidate files from `/`.
