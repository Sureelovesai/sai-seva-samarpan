import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManagePortalEvents, getSessionWithRole } from "@/lib/getRole";

function canManage(session: Awaited<ReturnType<typeof getSessionWithRole>>) {
  return canManagePortalEvents(session);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionWithRole(req.headers.get("cookie"));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    await prisma.eventSignup.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
