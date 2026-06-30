import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scoreCandidateLLM, rankCandidates } from '@/features/ranking/services/scoring-engine';
import { analyzeTrajectory } from '@/features/trajectory/services/trajectory-scorer';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  void req;
  const { id: jobId } = await params;
  const supabase = await createClient();

  try {
    // 1. Fetch Job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!job.parsed_requirements) {
      return NextResponse.json({ error: 'Job requirements not parsed yet' }, { status: 400 });
    }

    // 2. Retrieval: For demo, just get all candidates (or we could use hybrid_search)
    // We'll get all candidates that don't have a score for this job yet, or force re-score
    const { data: candidates, error: cError } = await supabase
      .from('candidates')
      .select('*');

    if (cError || !candidates || candidates.length === 0) {
      return NextResponse.json({ error: 'No candidates to score' }, { status: 400 });
    }

    const scoringResults = [];

    // 3. Score each candidate
    for (const candidate of candidates) {
      if (!candidate.parsed_profile) continue;

      // Trajectory heuristics
      const trajectory = analyzeTrajectory(candidate.parsed_profile);
      
      // LLM Scoring (this incorporates GitHub signals if present)
      const llmResult = await scoreCandidateLLM(
        job.parsed_requirements, 
        candidate.parsed_profile, 
        candidate.github_signals
      );
      
      // Override or blend trajectory if we want programmatic + LLM hybrid
      llmResult.trajectory_score = (llmResult.trajectory_score + trajectory.trajectory_score) / 2;

      scoringResults.push({ id: candidate.id, result: llmResult });
    }

    // 4. Rank candidates using AHP weights + TOPSIS
    const rankedResults = await rankCandidates(job.scoring_weights, scoringResults);

    // 5. Save scores to DB
    const scoresToInsert = rankedResults.map(r => ({
      job_id: job.id,
      candidate_id: r.candidateId,
      composite_score: r.compositeScore,
      technical_fit: r.detailedResult.technical_fit,
      trajectory_score: r.detailedResult.trajectory_score,
      behavioral_score: r.detailedResult.behavioral_score,
      domain_score: r.detailedResult.domain_score,
      platform_activity_score: r.detailedResult.platform_activity_score,
      rationale: r.detailedResult.rationale,
      strengths: r.detailedResult.strengths,
      concerns: r.detailedResult.concerns,
      gaps: r.detailedResult.gaps,
      interview_questions: r.detailedResult.interview_questions,
      rank: r.rank,
      weights_used: job.scoring_weights,
      model_used: 'gemini-2.0-flash-topsis',
    }));

    // Upsert scores
    const { error: insertError } = await supabase
      .from('scores')
      .upsert(scoresToInsert, { onConflict: 'job_id,candidate_id,scoring_version' });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, count: rankedResults.length });

  } catch (error: unknown) {
    console.error('Ranking Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
