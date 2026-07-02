import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasSupabaseAdminConfig } from '@/lib/env';
import { scoreCandidateLLM, rankCandidates } from '@/features/ranking/services/scoring-engine';
import { analyzeTrajectory } from '@/features/trajectory/services/trajectory-scorer';
import { getSupabaseErrorMessage, isRecoverableSupabaseSetupError } from '@/lib/supabase/errors';
import { getLocalJob, listLocalCandidates, replaceLocalScores, type LocalScore } from '@/lib/local-store';
import type { ScoringWeights } from '@/features/jobs/types';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params;
  const requestedWeights = await readRequestedWeights(req);

  if (!hasSupabaseAdminConfig() || jobId.startsWith('local-job-')) {
    return rankLocalJob(jobId, requestedWeights);
  }

  const supabase = createAdminClient();

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

    // 2. Retrieval: score the current uploaded candidate pool.
    // Hybrid search can narrow this pool once embeddings are available for every upload.
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
    const weightsUsed = requestedWeights ?? job.scoring_weights;
    const rankedResults = await rankCandidates(weightsUsed, scoringResults);

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
      weights_used: weightsUsed,
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
    if (isRecoverableSupabaseSetupError(error)) {
      return rankLocalJob(jobId, requestedWeights);
    }
    return NextResponse.json({ error: getSupabaseErrorMessage(error, 'Unknown error') }, { status: 500 });
  }
}

async function rankLocalJob(jobId: string, requestedWeights: ScoringWeights | null) {
  const job = await getLocalJob(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (!job.parsed_requirements) {
    return NextResponse.json({ error: 'Job requirements not parsed yet' }, { status: 400 });
  }

  const candidates = await listLocalCandidates();
  if (candidates.length === 0) {
    return NextResponse.json({ error: 'No candidates to score' }, { status: 400 });
  }

  const scoringResults = [];
  for (const candidate of candidates) {
    if (!candidate.parsed_profile) continue;
    const trajectory = analyzeTrajectory(candidate.parsed_profile);
    const result = await scoreCandidateLLM(job.parsed_requirements, candidate.parsed_profile, candidate.github_signals);
    result.trajectory_score = (result.trajectory_score + trajectory.trajectory_score) / 2;
    scoringResults.push({ id: candidate.id, result });
  }

  if (scoringResults.length === 0) {
    return NextResponse.json({ error: 'No parsed candidates to score' }, { status: 400 });
  }

  const rankedResults = await rankCandidates(requestedWeights ?? job.scoring_weights, scoringResults);
  const now = new Date().toISOString();
  const scores: LocalScore[] = rankedResults.map((ranked) => ({
    id: `local-score-${crypto.randomUUID()}`,
    job_id: job.id,
    candidate_id: ranked.candidateId,
    rank: ranked.rank,
    composite_score: ranked.compositeScore,
    technical_fit: ranked.detailedResult.technical_fit,
    trajectory_score: ranked.detailedResult.trajectory_score,
    behavioral_score: ranked.detailedResult.behavioral_score,
    domain_score: ranked.detailedResult.domain_score,
    platform_activity_score: ranked.detailedResult.platform_activity_score,
    rationale: ranked.detailedResult.rationale,
    strengths: ranked.detailedResult.strengths,
    concerns: ranked.detailedResult.concerns,
    gaps: ranked.detailedResult.gaps,
    interview_questions: ranked.detailedResult.interview_questions,
    created_at: now,
  }));

  await replaceLocalScores(job.id, scores);
  return NextResponse.json({ success: true, source: 'local', count: scores.length });
}

async function readRequestedWeights(req: Request): Promise<ScoringWeights | null> {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;

  const body = await req.json().catch(() => null) as { weights?: Partial<ScoringWeights> } | null;
  if (!body?.weights) return null;

  const candidate = body.weights;
  const weights = {
    technical_fit: Number(candidate.technical_fit),
    trajectory: Number(candidate.trajectory),
    behavioral: Number(candidate.behavioral),
    domain: Number(candidate.domain),
    platform_activity: Number(candidate.platform_activity),
  };

  if (Object.values(weights).some((value) => !Number.isFinite(value) || value < 0)) {
    return null;
  }

  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return null;

  return {
    technical_fit: weights.technical_fit / total,
    trajectory: weights.trajectory / total,
    behavioral: weights.behavioral / total,
    domain: weights.domain / total,
    platform_activity: weights.platform_activity / total,
  };
}
