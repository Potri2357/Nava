import { NextResponse } from "next/server";
import { getDashboardSummary, getEmptyDashboardSummary } from "@/features/dashboard/services/summary";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: await getDashboardSummary(),
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      warning: error instanceof Error ? error.message : "Unable to load live dashboard summary",
      data: getEmptyDashboardSummary(),
    });
  }
}
