import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    
    // body should be: { email: string, signups: Array<{ itemId: string, quantity: number }> }
    const { email, signups } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    if (!Array.isArray(signups)) {
      return NextResponse.json({ error: "Signups array required" }, { status: 400 });
    }

    // Process each item signup
    const results = [];
    for (const signup of signups) {
      const { itemId, quantity } = signup;

      if (!itemId || typeof itemId !== "string") {
        continue;
      }

      const qty = Math.max(0, Math.floor(Number(quantity) || 0));

      // Verify item exists and belongs to this event
      const item = await prisma.eventItem.findUnique({
        where: { id: itemId },
        include: { slot: { select: { eventId: true } } },
      });

      if (!item || item.slot.eventId !== id) {
        continue;
      }

      if (qty === 0) {
        // Delete any existing signup for this item by this email
        await prisma.eventItemSignup.deleteMany({
          where: { itemId, email },
        });
      } else {
        // Upsert: update if exists, create if not
        await prisma.eventItemSignup.upsert({
          where: { itemId_email: { itemId, email } },
          update: { quantity: qty },
          create: { itemId, email, quantity: qty },
        });
      }

      results.push({ itemId, quantity: qty, status: "ok" });
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: unknown) {
    console.error("POST portal-events/[id]/items/signup:", e);
    return NextResponse.json({ error: "Failed to save signups" }, { status: 500 });
  }
}
