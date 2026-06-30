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
