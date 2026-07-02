
-- supabase/migrations/20260630000001_extensions.sql

-- ============================================================
-- Migration 001: Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- supabase/migrations/20260630000002_tables.sql

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

-- supabase/migrations/20260630000003_indexes.sql

-- ============================================================
-- Migration 003: Indexes
-- ============================================================

-- Vector similarity (HNSW for sub-10ms search)
CREATE INDEX idx_candidates_embedding ON candidates
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_jobs_embedding ON jobs
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_skills_embedding ON skills_ontology
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Full-text search (GIN)
CREATE INDEX idx_candidates_search ON candidates USING gin (search_vector);

-- Trigram for fuzzy name search
CREATE INDEX idx_candidates_name_trgm ON candidates
  USING gin (full_name gin_trgm_ops);

-- B-tree for common lookups
CREATE INDEX idx_scores_job ON scores (job_id, rank);
CREATE INDEX idx_scores_candidate ON scores (candidate_id);
CREATE INDEX idx_scores_composite ON scores (job_id, composite_score DESC);
CREATE INDEX idx_candidates_hash ON candidates (file_hash);
CREATE INDEX idx_audit_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_feedback_score ON feedback (score_id);

-- supabase/migrations/20260630000004_functions.sql

-- ============================================================
-- Migration 004: Functions
-- ============================================================

-- HYBRID SEARCH with Reciprocal Rank Fusion
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding VECTOR(384),
  query_text      TEXT,
  match_count     INT DEFAULT 50,
  rrf_k           INT DEFAULT 60,
  semantic_weight FLOAT DEFAULT 0.6,
  keyword_weight  FLOAT DEFAULT 0.4
)
RETURNS TABLE (
  candidate_id UUID,
  semantic_rank INT,
  keyword_rank INT,
  rrf_score NUMERIC,
  full_name TEXT,
  raw_resume_text TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH semantic AS (
    SELECT
      c.id,
      c.full_name,
      c.raw_resume_text,
      ROW_NUMBER() OVER (
        ORDER BY c.embedding <=> query_embedding
      )::INT AS rank
    FROM candidates c
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count
  ),
  keyword AS (
    SELECT
      c.id,
      c.full_name,
      c.raw_resume_text,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(c.search_vector, websearch_to_tsquery('english', query_text)) DESC
      )::INT AS rank
    FROM candidates c
    WHERE c.search_vector @@ websearch_to_tsquery('english', query_text)
    ORDER BY ts_rank_cd(c.search_vector, websearch_to_tsquery('english', query_text)) DESC
    LIMIT match_count
  ),
  fused AS (
    SELECT
      COALESCE(s.id, k.id) AS id,
      COALESCE(s.full_name, k.full_name) AS full_name,
      COALESCE(s.raw_resume_text, k.raw_resume_text) AS raw_resume_text,
      s.rank AS s_rank,
      k.rank AS k_rank,
      -- RRF: 1/(rank + k) — rank-based, not score-based
      (
        COALESCE(semantic_weight * (1.0 / (COALESCE(s.rank, 1000) + rrf_k)), 0) +
        COALESCE(keyword_weight  * (1.0 / (COALESCE(k.rank, 1000) + rrf_k)), 0)
      )::NUMERIC AS score
    FROM semantic s
    FULL OUTER JOIN keyword k ON s.id = k.id
  )
  SELECT
    f.id AS candidate_id,
    f.s_rank AS semantic_rank,
    f.k_rank AS keyword_rank,
    f.score AS rrf_score,
    f.full_name,
    f.raw_resume_text
  FROM fused f
  ORDER BY f.score DESC
  LIMIT match_count;
END;
$$;

-- SKILL NORMALIZATION lookup
CREATE OR REPLACE FUNCTION normalize_skill(raw_skill TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT canonical_name
  FROM skills_ontology
  WHERE canonical_name ILIKE raw_skill
     OR aliases @> to_jsonb(raw_skill)
  LIMIT 1;
$$;

-- BIAS AUDIT aggregation
CREATE OR REPLACE FUNCTION bias_audit_report(target_job_id UUID)
RETURNS TABLE (
  proxy_category TEXT,
  proxy_value TEXT,
  candidate_count BIGINT,
  avg_score NUMERIC,
  median_score NUMERIC,
  min_score NUMERIC,
  max_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Using graduation year as age proxy
  RETURN QUERY
  WITH scored_candidates AS (
    SELECT
      s.composite_score,
      c.parsed_profile->'education'->0->>'graduation_year' AS graduation_year
    FROM scores s
    JOIN candidates c ON s.candidate_id = c.id
    WHERE s.job_id = target_job_id
      AND c.parsed_profile->'education'->0->>'graduation_year' IS NOT NULL
      AND c.parsed_profile->'education'->0->>'graduation_year' ~ '^[0-9]{4}$'
  )
  SELECT
    'graduation_decade'::TEXT AS proxy_category,
    (FLOOR((sc.graduation_year::INT) / 10.0) * 10)::TEXT
      AS proxy_value,
    COUNT(*)::BIGINT AS candidate_count,
    ROUND(AVG(sc.composite_score), 4) AS avg_score,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sc.composite_score)::numeric, 4) AS median_score,
    ROUND(MIN(sc.composite_score), 4) AS min_score,
    ROUND(MAX(sc.composite_score), 4) AS max_score
  FROM scored_candidates sc
  GROUP BY proxy_value
  ORDER BY proxy_value;
END;
$$;

-- supabase/migrations/20260630000005_rls_policies.sql

-- ============================================================
-- Migration 005: RLS Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_ontology ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Public recruiter workflow can read active jobs.
CREATE POLICY "read_active_jobs" ON jobs
  FOR SELECT USING (status = 'active');

-- Public recruiter workflow can create jobs through the app API.
CREATE POLICY "insert_jobs" ON jobs
  FOR INSERT WITH CHECK (source IN ('upload', 'bulk', 'api'));

-- Authenticated users can CRUD their own jobs.
CREATE POLICY "own_jobs" ON jobs
  FOR ALL USING (auth.uid() = created_by);

-- Public recruiter workflow can read and upload original candidates.
CREATE POLICY "read_candidates" ON candidates
  FOR SELECT USING (true);

CREATE POLICY "insert_candidates" ON candidates
  FOR INSERT WITH CHECK (source IN ('upload', 'bulk', 'api'));

-- Public recruiter workflow can read and write scores generated from original uploads.
CREATE POLICY "read_scores" ON scores
  FOR SELECT USING (true);

CREATE POLICY "insert_scores" ON scores
  FOR INSERT WITH CHECK (true);

CREATE POLICY "update_scores" ON scores
  FOR UPDATE USING (true) WITH CHECK (true);

-- Feedback only by the recruiter who created it
CREATE POLICY "own_feedback" ON feedback
  FOR ALL USING (auth.uid() = recruiter_id);

-- Skills ontology readable by all
CREATE POLICY "read_skills" ON skills_ontology
  FOR SELECT USING (true);

-- supabase/migrations/20260630000006_realtime.sql

-- ============================================================
-- Migration 006: Realtime publication
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'candidates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE candidates;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'scores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE scores;
  END IF;
END $$;
