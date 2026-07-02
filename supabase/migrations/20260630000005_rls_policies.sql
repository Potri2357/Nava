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
