import { NextResponse } from "next/server";
import { hasGeminiConfig, hasSupabaseAdminConfig, hasSupabaseServerConfig } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    supabase: {
      configured: hasSupabaseServerConfig(),
      adminConfigured: hasSupabaseAdminConfig(),
    },
    gemini: {
      configured: hasGeminiConfig(),
    },
    github: {
      configured: Boolean(process.env.GITHUB_PAT),
    },
    mode: hasSupabaseServerConfig() ? "live" : "demo",
  });
}
