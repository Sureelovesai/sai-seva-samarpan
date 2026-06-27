import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionWithRole } from "@/lib/getRole";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? null;
    const session = await getSessionWithRole(cookieHeader);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fcmToken, deviceName } = await req.json();

    if (!fcmToken) {
      return NextResponse.json({ error: "FCM token required" }, { status: 400 });
    }

    // Check if token already exists
    const existing = await prisma.pushSubscription.findUnique({
      where: { fcmToken },
    });

    if (existing) {
      // Reactivate if deactivated
      await prisma.pushSubscription.update({
        where: { fcmToken },
        data: { isActive: true, subscribedAt: new Date() },
      });
    } else {
      // Create new subscription
      await prisma.pushSubscription.create({
        data: {
          userId: session.sub,
          fcmToken,
          deviceName: deviceName || "Unknown Device",
        },
      });
    }

    // Ensure notification preferences exist
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: session.sub },
    });

    if (!prefs) {
      await prisma.notificationPreference.create({
        data: { userId: session.sub },
      });
    }

    console.log(`[Push] User ${session.email} subscribed to notifications`);

    return NextResponse.json(
      { success: true, message: "Subscribed to notifications" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Push] Subscription error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
