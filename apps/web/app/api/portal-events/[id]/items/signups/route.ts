import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Get all item signups for this event, organized by person
    const event = await prisma.portalEvent.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get all items for this event with their signups
    const slots = await prisma.eventSlot.findMany({
      where: { eventId: id },
      select: {
        id: true,
        items: {
          select: {
            id: true,
            name: true,
            signups: {
              select: {
                email: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    // Reorganize: { email => { itemId => quantity } }
    const signupsByEmail: Record<string, Record<string, number>> = {};

    for (const slot of slots) {
      for (const item of slot.items) {
        for (const signup of item.signups) {
          if (!signupsByEmail[signup.email]) {
            signupsByEmail[signup.email] = {};
          }
          signupsByEmail[signup.email][item.id] = signup.quantity;
        }
      }
    }

    return NextResponse.json({ signupsByEmail });
  } catch (e: unknown) {
    console.error("GET portal-events/[id]/items/signups:", e);
    return NextResponse.json({ error: "Failed to fetch signups" }, { status: 500 });
  }
}
