import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? null;
    const session = await getSessionWithRole(cookieHeader);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId: session.sub },
    });

    // Create default preferences if not exist
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { userId: session.sub },
      });
    }

    return NextResponse.json(prefs, { status: 200 });
  } catch (error) {
    console.error("[Push] Get preferences error:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? null;
    const session = await getSessionWithRole(cookieHeader);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await req.json();

    // Validate allowed fields
    const allowedFields = [
      "newActivityNotifications",
      "signupNotifications",
      "reminderNotifications",
      "blogNotifications",
      "communityOutreachNotifications",
      "eventNotifications",
    ];

    const sanitized: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && typeof value === "boolean") {
        sanitized[key] = value;
      }
    }

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: session.sub },
      update: sanitized,
      create: { userId: session.sub, ...sanitized },
    });

    console.log(`[Push] Preferences updated for user ${session.email}`);

    return NextResponse.json(prefs, { status: 200 });
  } catch (error) {
    console.error("[Push] Update preferences error:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
