import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractCandidateText } from '@/features/candidates/services/file-parser';
import { parseResumeText } from '@/features/candidates/services/resume-parser';
import { detectGaming } from '@/features/anti-gaming/services/gaming-detector';
import { hasSupabaseAdminConfig } from '@/lib/env';
import { insertLocalCandidate } from '@/lib/local-store';
import { getSupabaseErrorMessage, isRecoverableSupabaseSetupError } from '@/lib/supabase/errors';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: { code: 'NO_FILE', message: 'No file provided' } }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractCandidateText(file, buffer);

    if (!rawText.trim()) {
      return NextResponse.json({ success: false, error: { code: 'EMPTY_FILE', message: 'Could not extract text from the file.' } }, { status: 400 });
    }

    // Deduplication check
    const fileHash = crypto.createHash('sha256').update(rawText).digest('hex');
    const { inferred_github, full_name, email, ...parsedProfile } = await parseResumeText(rawText);
    const antiGaming = detectGaming(rawText);
    const fallbackName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    const candidateName = full_name || fallbackName || 'Unnamed candidate';

    const persistLocally = async (statusMessage = 'Candidate persisted locally until Supabase schema is available.') => {
      const { candidate, status } = await insertLocalCandidate({
        full_name: candidateName,
        email,
        raw_resume_text: rawText,
        file_hash: fileHash,
        parsed_profile: parsedProfile,
        github_username: inferred_github || null,
        anti_gaming_flag: antiGaming.is_flagged,
        anti_gaming_score: antiGaming.gaming_score,
        anti_gaming_reasons: antiGaming.reasons,
      });

      return NextResponse.json({
        success: true,
        source: 'local',
        data: {
          id: candidate.id,
          status,
          file_name: file.name,
          full_name: candidate.full_name,
          email: candidate.email,
          raw_resume_text: rawText,
          parsed_profile: parsedProfile,
          github_username: inferred_github || null,
          anti_gaming: antiGaming,
        },
        message: statusMessage,
      });
    };

    if (!hasSupabaseAdminConfig()) {
      return persistLocally('Candidate persisted locally. Configure Supabase later to use hosted persistence.');
    }

    let insertedCandidateId: string;
    try {
      const supabase = createAdminClient();
      
      const { data: existing } = await supabase
        .from('candidates')
        .select('id, full_name, email, raw_resume_text, parsed_profile, github_username, anti_gaming_flag, anti_gaming_score, anti_gaming_reasons')
        .eq('file_hash', fileHash)
        .single();

      if (existing) {
        return NextResponse.json({
          success: true,
          data: {
            id: existing.id,
            status: 'already_exists',
            file_name: file.name,
            full_name: existing.full_name,
            email: existing.email,
            raw_resume_text: existing.raw_resume_text,
            parsed_profile: existing.parsed_profile,
            github_username: existing.github_username,
            anti_gaming: {
              is_flagged: existing.anti_gaming_flag,
              gaming_score: existing.anti_gaming_score,
              reasons: existing.anti_gaming_reasons ?? [],
            },
          },
          message: 'Candidate already exists in the database'
        });
      }

      const { data: inserted, error: insertError } = await supabase
        .from('candidates')
        .insert({
          full_name: candidateName,
          email,
          raw_resume_text: rawText,
          file_hash: fileHash,
          parsed_profile: parsedProfile,
          github_username: inferred_github || null,
          anti_gaming_flag: antiGaming.is_flagged,
          anti_gaming_score: antiGaming.gaming_score,
          anti_gaming_reasons: antiGaming.reasons,
          source: 'upload',
        })
        .select('id')
        .single();

      if (insertError || !inserted) {
        console.error('Insert error:', insertError);
        if (insertError && isRecoverableSupabaseSetupError(insertError)) {
          return persistLocally();
        }

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DB_ERROR',
              message: getSupabaseErrorMessage(insertError, 'Failed to insert candidate to database'),
            },
          },
          { status: 500 },
        );
      }
      insertedCandidateId = inserted.id;
    } catch (error) {
      if (isRecoverableSupabaseSetupError(error)) {
        return persistLocally();
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: insertedCandidateId,
        status: 'created',
        file_name: file.name,
        full_name: candidateName,
        email,
        raw_resume_text: rawText,
        parsed_profile: parsedProfile,
        github_username: inferred_github || null,
        anti_gaming: antiGaming,
      }
    });

  } catch (error: unknown) {
    console.error('Upload Error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: getSupabaseErrorMessage(error, 'Unknown error') } }, { status: 500 });
  }
}
