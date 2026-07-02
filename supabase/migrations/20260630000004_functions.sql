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
