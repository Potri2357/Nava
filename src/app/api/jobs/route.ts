import { NextResponse } from "next/server";
import { parseJobDescription } from "@/features/jobs/services/jd-parser";
import { defaultWeights } from "@/features/jobs/constants";
import { hasSupabaseAdminConfig } from "@/lib/env";
import { ensureLocalRoleCatalog, insertLocalJob } from "@/lib/local-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseErrorMessage, isRecoverableSupabaseSetupError } from "@/lib/supabase/errors";

export async function GET() {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({
      success: true,
      source: "local",
      data: await ensureLocalRoleCatalog(),
    });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, company, raw_description, parsed_requirements, scoring_weights, status, source")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      source: data && data.length > 0 ? "supabase" : "local",
      warning: data && data.length > 0 ? undefined : "Using local role catalog because Supabase has no jobs yet.",
      data: data && data.length > 0 ? data : await ensureLocalRoleCatalog(),
    });
  } catch (error) {
    if (isRecoverableSupabaseSetupError(error)) {
      return NextResponse.json({
        success: true,
        source: "local",
        warning: "Using local original jobs until Supabase schema is applied.",
        data: await ensureLocalRoleCatalog(),
      });
    }

    return NextResponse.json({
      success: true,
      source: "error",
      warning: getSupabaseErrorMessage(error, "Unable to load Supabase jobs"),
      data: [],
    });
  }
}

export async function POST(req: Request) {
  try {
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

    if (!hasSupabaseAdminConfig()) {
      const localJob = await insertLocalJob({
        title,
        company,
        raw_description: rawDescription,
        parsed_requirements: parsed,
        scoring_weights: scoringWeights,
      });
      return NextResponse.json({ success: true, source: "local", data: localJob });
    }

    try {
      const supabase = createAdminClient();

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
        if (isRecoverableSupabaseSetupError(error)) {
          const localJob = await insertLocalJob({
            title,
            company,
            raw_description: rawDescription,
            parsed_requirements: parsed,
            scoring_weights: scoringWeights,
          });
          return NextResponse.json({
            success: true,
            source: "local",
            warning: "Job persisted locally until Supabase schema is available.",
            data: localJob,
          });
        }

        return NextResponse.json(
          { success: false, error: { code: "DB_ERROR", message: getSupabaseErrorMessage(error, "Failed to insert job") } },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, data });
    } catch (error) {
      if (isRecoverableSupabaseSetupError(error)) {
        const localJob = await insertLocalJob({
          title,
          company,
          raw_description: rawDescription,
          parsed_requirements: parsed,
          scoring_weights: scoringWeights,
        });
        return NextResponse.json({
          success: true,
          source: "local",
          warning: "Job persisted locally until Supabase schema is available.",
          data: localJob,
        });
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: getSupabaseErrorMessage(error, "Unknown error") } },
      { status: 500 },
    );
  }
}
