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

-- Demo mode: allow anonymous read access to seeded data (source = 'demo')
CREATE POLICY "demo_read_jobs" ON jobs
  FOR SELECT USING (status = 'active' OR auth.uid() IS NOT NULL);

-- Authenticated users can CRUD their own jobs
CREATE POLICY "own_jobs" ON jobs
  FOR ALL USING (auth.uid() = created_by);

-- All authenticated users can read candidates
CREATE POLICY "read_candidates" ON candidates
  FOR SELECT USING (source = 'demo' OR auth.uid() IS NOT NULL);

-- Scores readable by authenticated users
CREATE POLICY "read_scores" ON scores
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM jobs j
      JOIN candidates c ON c.id = scores.candidate_id
      WHERE j.id = scores.job_id
        AND j.source = 'demo'
        AND c.source = 'demo'
    )
  );

-- Feedback only by the recruiter who created it
CREATE POLICY "own_feedback" ON feedback
  FOR ALL USING (auth.uid() = recruiter_id);

-- Skills ontology readable by all
CREATE POLICY "read_skills" ON skills_ontology
  FOR SELECT USING (true);
