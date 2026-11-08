import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }
    
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

    return NextResponse.json({ slots, success: true });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    console.error("GET portal-events/[id]/items:", errorMsg);
    return NextResponse.json({ error: "Failed to fetch items", details: errorMsg }, { status: 500 });
  }
}
