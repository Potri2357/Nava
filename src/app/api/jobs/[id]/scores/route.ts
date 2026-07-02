import { NextResponse } from "next/server";
import { liveScoreToRankedCandidate } from "@/features/recruiter/ranking";
import { hasSupabaseAdminConfig } from "@/lib/env";
import { listLocalScores } from "@/lib/local-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseErrorMessage, isRecoverableSupabaseSetupError } from "@/lib/supabase/errors";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!hasSupabaseAdminConfig() || id.startsWith("local-job-")) {
    return NextResponse.json({
      success: true,
      source: "local",
      data: (await listLocalScores(id)).map(liveScoreToRankedCandidate),
    });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("scores")
      .select(`
        *,
        candidates (
          id,
          full_name,
          raw_resume_text,
          parsed_profile,
          github_username,
          github_signals,
          anti_gaming_flag,
          anti_gaming_reasons
        )
      `)
      .eq("job_id", id)
      .order("rank", { ascending: true });

    if (error) throw error;

    const localScores = (await listLocalScores(id)).map(liveScoreToRankedCandidate);
    return NextResponse.json({
      success: true,
      source: data && data.length > 0 ? "supabase" : "local",
      data: data && data.length > 0 ? data.map(liveScoreToRankedCandidate) : localScores,
    });
  } catch (error) {
    if (isRecoverableSupabaseSetupError(error)) {
      return NextResponse.json({
        success: true,
        source: "local",
        data: (await listLocalScores(id)).map(liveScoreToRankedCandidate),
      });
    }

    return NextResponse.json({
      success: true,
      source: "error",
      warning: getSupabaseErrorMessage(error, "Unable to load Supabase scores"),
      data: [],
    });
  }
}
