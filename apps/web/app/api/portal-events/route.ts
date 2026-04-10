import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Published events: upcoming first, then past (newest past first). */
export async function GET() {
  const now = new Date();
  const upcoming = await prisma.portalEvent.findMany({
    where: { status: "PUBLISHED", startsAt: { gte: now } },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      heroImageUrl: true,
      startsAt: true,
      venue: true,
      signupsEnabled: true,
    },
  });

  const past = await prisma.portalEvent.findMany({
    where: { status: "PUBLISHED", startsAt: { lt: now } },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      heroImageUrl: true,
      startsAt: true,
      venue: true,
      signupsEnabled: true,
    },
  });

  return NextResponse.json([...upcoming, ...past]);
}
