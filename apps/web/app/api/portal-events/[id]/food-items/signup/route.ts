import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { email, signups } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (!Array.isArray(signups) || signups.length === 0) {
      return NextResponse.json({ error: "At least one item must be selected" }, { status: 400 });
    }

    // Verify event exists
    const event = await prisma.portalEvent.findUnique({ where: { id } });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // TODO: Create EventFoodItemSignup model in schema when backend API is ready
    // For now, just acknowledge the request
    console.log(`Food signup for event ${id} from ${email}:`, signups);

    return NextResponse.json({
      success: true,
      message: "Food signup received (storage pending)",
    });
  } catch (e: unknown) {
    console.error("POST /api/portal-events/[id]/food-items/signup:", e);
    return NextResponse.json(
      { error: "Failed to save food signup" },
      { status: 500 }
    );
  }
}
