# Nava AI Recruiter

Explainable candidate ranking for recruiters. Nava parses job descriptions and candidate profiles, scores candidates across multiple dimensions, flags templated resumes, surfaces career trajectory, compares candidates, audits score distribution, and exports ranked CSV output.

## Implemented

- Zero-setup public demo at `/` with seeded jobs and candidates.
- Semantic skill matching, career trajectory scoring, anti-gaming detection, weighted TOPSIS ranking, and CSV export.
- Recruiter controls for blind review, scoring weights, natural-language search intent, interview focus, and "Why Not #1" comparison.
- Upload API for PDF, DOCX, CSV, JSON, and TXT candidate files.
- Job creation API with JD parsing.
- Supabase schema for jobs, candidates, scores, feedback, skills ontology, hybrid search, bias audit, RLS, and demo-readable data.
- Gemini-backed structured parsing/scoring when `GEMINI_API_KEY` is present, with deterministic heuristic fallbacks when it is not.

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
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GITHUB_PAT=
NEXT_PUBLIC_DEMO_MODE=true
```

Without these keys, the demo and heuristic parser/scorer still run.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

Seed external Supabase demo data from `dataset/jds` and `dataset/resumes`:

```bash
npx tsx --env-file=.env.local scripts/seed-demo-data.ts
```
