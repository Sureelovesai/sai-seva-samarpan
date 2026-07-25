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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const onlyUnread = searchParams.get("unread") === "true";

    const where: any = { userId: session.sub };
    if (onlyUnread) {
      where.read = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: { sentAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.notificationLog.count({ where }),
    ]);

    return NextResponse.json(
      {
        notifications,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Push] History error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? null;
    const session = await getSessionWithRole(cookieHeader);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, notificationId } = await req.json();

    if (action === "mark-read") {
      if (notificationId) {
        await prisma.notificationLog.update({
          where: { id: notificationId },
          data: { read: true },
        });
      } else {
        // Mark all as read
        await prisma.notificationLog.updateMany({
          where: { userId: session.sub },
          data: { read: true },
        });
      }
    } else if (action === "delete") {
      if (!notificationId) {
        return NextResponse.json({ error: "notificationId is required for delete" }, { status: 400 });
      }
      // Delete single notification
      await prisma.notificationLog.delete({
        where: { id: notificationId },
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Push] Update error:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
