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

    const { fcmToken } = await req.json();

    if (!fcmToken) {
      return NextResponse.json({ error: "FCM token required" }, { status: 400 });
    }

    // Deactivate subscription
    await prisma.pushSubscription.updateMany({
      where: { fcmToken, userId: session.sub },
      data: { isActive: false },
    });

    console.log(`[Push] User ${session.email} unsubscribed from notifications`);

    return NextResponse.json(
      { success: true, message: "Unsubscribed from notifications" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Push] Unsubscription error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}
