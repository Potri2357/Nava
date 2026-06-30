import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractCandidateText } from '@/features/candidates/services/file-parser';
import { parseResumeText } from '@/features/candidates/services/resume-parser';
import { detectGaming } from '@/features/anti-gaming/services/gaming-detector';
import { hasSupabaseServerConfig } from '@/lib/env';
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
    const { inferred_github, ...parsedProfile } = await parseResumeText(rawText);
    const antiGaming = detectGaming(rawText);

    if (!hasSupabaseServerConfig()) {
      return NextResponse.json({
        success: true,
        data: {
          id: `demo-${fileHash.slice(0, 12)}`,
          status: 'parsed_demo',
          parsed_profile: parsedProfile,
          github_username: inferred_github || null,
          anti_gaming: antiGaming,
        },
        message: 'Candidate parsed in demo mode. Configure Supabase to persist uploads.',
      });
    }

    const supabase = await createClient();
    
    const { data: existing } = await supabase
      .from('candidates')
      .select('id')
      .eq('file_hash', fileHash)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        data: { id: existing.id, status: 'already_exists' },
        message: 'Candidate already exists in the database'
      });
    }

    // Save to DB (without embedding yet, embedding happens async or in trigger, but we'll do it later or in a separate step)
    const { data: inserted, error: insertError } = await supabase
      .from('candidates')
      .insert({
        full_name: parsedProfile.experience[0]?.company ? null : "Unknown", // LLM doesn't extract name currently, we can add it or let it be null
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
      return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to insert candidate to database' } }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { id: inserted.id, status: 'created' }
    });

  } catch (error: unknown) {
    console.error('Upload Error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } }, { status: 500 });
  }
}
