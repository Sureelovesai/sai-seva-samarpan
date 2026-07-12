import { NextResponse } from "next/server";
import { sendNotificationToUser } from "@/lib/notification-service";
import { getSessionWithRole } from "@/lib/getRole";

/**
 * Test endpoint for sending notifications
 * POST /api/test/send-notification
 * 
 * Usage:
 * curl -X POST http://localhost:3000/api/test/send-notification \
 *   -H "Content-Type: application/json" \
 *   -H "Cookie: <your-session-cookie>" \
 *   -d '{"title":"Test","body":"This is a test","actionUrl":"/dashboard"}'
 */
export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? null;
    const session = await getSessionWithRole(cookieHeader);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in first" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      title = "Test Notification",
      body: bodyText = "This is a test notification",
      actionUrl = "/dashboard",
    } = body;

    console.log(`[Test] Sending notification to user ${session.sub}:`, {
      title,
      bodyText,
      actionUrl,
    });

    // Send notification to current user
    await sendNotificationToUser(
      session.sub,
      {
        title,
        body: bodyText,
        triggerType: "TEST",
        actionUrl,
      },
      false // Don't check preferences for test
    );

    return NextResponse.json(
      {
        success: true,
        message: "Test notification sent",
        details: {
          userId: session.sub,
          userEmail: session.email,
          title,
          body: bodyText,
          actionUrl,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Test] Error sending test notification:", error);
    return NextResponse.json(
      {
        error: "Failed to send test notification",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
