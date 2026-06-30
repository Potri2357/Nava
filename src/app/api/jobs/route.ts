import { NextResponse } from "next/server";
import { demoJobs } from "@/features/demo/data";
import { parseJobDescription } from "@/features/jobs/services/jd-parser";
import { defaultWeights } from "@/features/demo/data";
import { hasSupabaseServerConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({
      success: true,
      source: "demo",
      data: demoJobs,
    });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, company, raw_description, parsed_requirements, scoring_weights, status, source")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      source: "supabase",
      data: data?.length ? data : demoJobs,
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      source: "demo",
      warning: error instanceof Error ? error.message : "Unable to load Supabase jobs",
      data: demoJobs,
    });
  }
}

export async function POST(req: Request) {
  try {
    if (!hasSupabaseServerConfig()) {
      return NextResponse.json(
        { success: false, error: { code: "SUPABASE_NOT_CONFIGURED", message: "Configure Supabase env vars to create live jobs." } },
        { status: 503 },
      );
    }

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const company = typeof body.company === "string" ? body.company.trim() : null;
    const rawDescription = typeof body.raw_description === "string" ? body.raw_description.trim() : "";
    const scoringWeights = body.scoring_weights ?? defaultWeights;

    if (!title || !rawDescription) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "title and raw_description are required" } },
        { status: 400 },
      );
    }

    const parsed = await parseJobDescription(rawDescription);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        title,
        company,
        raw_description: rawDescription,
        parsed_requirements: parsed,
        scoring_weights: scoringWeights,
        status: "active",
        source: "api",
      })
      .select("id, title, parsed_requirements")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: error.message } },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error instanceof Error ? error.message : "Unknown error" } },
      { status: 500 },
    );
  }
}
