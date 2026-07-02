-- ============================================================
-- Migration 002: Core Tables
-- ============================================================

-- JOBS
CREATE TABLE jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  company         TEXT,
  raw_description TEXT NOT NULL,
  parsed_requirements JSONB,
  scoring_weights JSONB DEFAULT '{
    "technical_fit": 0.35,
    "trajectory": 0.25,
    "behavioral": 0.20,
    "domain": 0.15,
    "platform_activity": 0.05
  }',
  embedding       VECTOR(384),
  status          TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'closed')),
  source          TEXT DEFAULT 'upload' CHECK (source IN ('upload', 'bulk', 'api')),
  created_by      UUID, -- references auth.users(id) - assuming we map it later or keep it loose for now, but usually Supabase uses auth.users
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- CANDIDATES
CREATE TABLE candidates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT,
  email           TEXT,
  raw_resume_text TEXT NOT NULL,
  file_hash       TEXT,
  parsed_profile  JSONB,
  github_username TEXT,
  github_signals  JSONB,
  embedding       VECTOR(384),
  search_vector   TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(full_name, '') || ' ' || raw_resume_text)
  ) STORED,
  anti_gaming_flag    BOOLEAN DEFAULT FALSE,
  anti_gaming_score   NUMERIC,
  anti_gaming_reasons JSONB,
  source          TEXT DEFAULT 'upload' CHECK (source IN ('upload', 'bulk', 'api')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- SCORES
CREATE TABLE scores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id          UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  
  composite_score       NUMERIC NOT NULL CHECK (composite_score BETWEEN 0 AND 1),
  
  technical_fit         NUMERIC CHECK (technical_fit BETWEEN 0 AND 1),
  trajectory_score      NUMERIC CHECK (trajectory_score BETWEEN 0 AND 1),
  behavioral_score      NUMERIC CHECK (behavioral_score BETWEEN 0 AND 1),
  domain_score          NUMERIC CHECK (domain_score BETWEEN 0 AND 1),
  platform_activity_score NUMERIC CHECK (platform_activity_score BETWEEN 0 AND 1),
  
  rationale             TEXT NOT NULL,
  strengths             JSONB,
  concerns              JSONB,
  gaps                  JSONB,
  interview_questions   JSONB,
  
  rank                  INT,
  weights_used          JSONB,
  model_used            TEXT,
  retrieval_method      TEXT DEFAULT 'hybrid',
  scoring_version       TEXT DEFAULT 'v1',
  
  created_at            TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(job_id, candidate_id, scoring_version)
);

-- FEEDBACK
CREATE TABLE feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id        UUID NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
  recruiter_id    UUID, -- references auth.users(id)
  vote            TEXT NOT NULL CHECK (vote IN ('up', 'down')),
  note            TEXT,
  previous_rank   INT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- SKILLS ONTOLOGY
CREATE TABLE skills_ontology (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name  TEXT NOT NULL UNIQUE,
  aliases         JSONB DEFAULT '[]',
  category        TEXT,
  embedding       VECTOR(384),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- AUDIT LOG
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  actor_id        UUID, -- references auth.users(id)
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);
