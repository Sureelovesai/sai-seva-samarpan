import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Get all items for all slots of this event
    const slots = await prisma.eventSlot.findMany({
      where: { eventId: id },
      select: {
        id: true,
        slotName: true,
        slotDate: true,
        startTime: true,
        endTime: true,
        items: {
          select: {
            id: true,
            name: true,
            category: true,
            neededLabel: true,
            maxQuantity: true,
            signups: {
              select: {
                id: true,
                email: true,
                quantity: true,
              },
            },
          },
        },
      },
      orderBy: [{ slotDate: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({ slots });
  } catch (e: unknown) {
    console.error("GET portal-events/[id]/items:", e);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}
