import { NextResponse } from "next/server";
import { demoRankingsForJob, liveScoreToRankedCandidate } from "@/features/demo/ranking";
import { hasSupabaseServerConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!hasSupabaseServerConfig() || id.startsWith("job-")) {
    return NextResponse.json({
      success: true,
      source: "demo",
      data: demoRankingsForJob(id),
    });
  }

  try {
    const supabase = await createClient();
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

    return NextResponse.json({
      success: true,
      source: "supabase",
      data: data?.map(liveScoreToRankedCandidate) ?? [],
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      source: "demo",
      warning: error instanceof Error ? error.message : "Unable to load Supabase scores",
      data: demoRankingsForJob(id),
    });
  }
}
