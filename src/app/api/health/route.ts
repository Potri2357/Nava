import { NextResponse } from "next/server";
import { hasGeminiConfig, hasSupabaseAdminConfig, hasSupabaseServerConfig, hasSupabaseServiceRoleConfig } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    supabase: {
      configured: hasSupabaseServerConfig(),
      adminConfigured: hasSupabaseAdminConfig(),
      serviceRoleConfigured: hasSupabaseServiceRoleConfig(),
    },
    gemini: {
      configured: hasGeminiConfig(),
    },
    github: {
      configured: Boolean(process.env.GITHUB_PAT),
    },
    mode: hasSupabaseAdminConfig() ? "live" : "setup",
  });
}
