import { NextResponse } from "next/server";
import { sendActivityReminders } from "@/lib/reminder-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/activity-reminders
 * 
 * Sends activity reminders to volunteers and coordinators:
 * - 24 hours before activity start
 * - 12 hours before activity start
 * - 1 hour before activity start
 * 
 * This endpoint should be called by a cron job (e.g., every 30 minutes).
 * 
 * Protected by checking X-Cron-Token header for security.
 * 
 * Examples:
 * - curl -X POST https://your-app.com/api/cron/activity-reminders -H "X-Cron-Token: your-secret-token"
 * - Vercel Cron: run every 30 minutes
 */

export async function POST(req: Request) {
  try {
    // Verify cron token for security
    const token = req.headers.get("x-cron-token");
    const expectedToken = process.env.CRON_SECRET;

    if (!expectedToken || token !== expectedToken) {
      console.warn("[Cron] Unauthorized reminder request - invalid token");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cron] Starting activity reminder job...");
    const result = await sendActivityReminders();

    return NextResponse.json({
      success: true,
      message: "Activity reminders sent",
      stats: result,
    });
  } catch (error) {
    console.error("[Cron] Activity reminder job failed:", error);
    return NextResponse.json(
      {
        error: "Failed to send activity reminders",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
