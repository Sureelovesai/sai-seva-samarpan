import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { isPrismaColumnMissing } from "@/lib/prismaMissingPortalEvent";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId")?.trim();
  const responseFilter = searchParams.get("response"); // YES | NO | MAYBE

  const where: {
    eventId?: string;
    response?: "YES" | "NO" | "MAYBE";
  } = {};
  if (eventId) where.eventId = eventId;
  if (responseFilter === "YES" || responseFilter === "NO" || responseFilter === "MAYBE") {
    where.response = responseFilter;
  }

  try {
    const signups = await prisma.eventSignup.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        event: { select: { id: true, title: true, startsAt: true } },
      },
    });

    return NextResponse.json(signups);
  } catch (e) {
    if (!isPrismaColumnMissing(e)) throw e;

    const conditions: Prisma.Sql[] = [];
    if (eventId) conditions.push(Prisma.sql`s."eventId" = ${eventId}`);
    if (responseFilter === "YES" || responseFilter === "NO" || responseFilter === "MAYBE") {
      conditions.push(Prisma.sql`s.response = CAST(${responseFilter} AS "EventSignupResponse")`);
    }
    const whereSql =
      conditions.length === 0 ? Prisma.sql`TRUE` : Prisma.join(conditions, " AND ");

    type RawRow = {
      id: string;
      participantName: string;
      email: string;
      response: "YES" | "NO" | "MAYBE";
      accompanyingCount: number;
      createdAt: Date;
      eventId: string;
      eventTitle: string;
      eventStartsAt: Date;
    };

    const rawRows = (await prisma.$queryRaw(Prisma.sql`
      SELECT
        s.id,
        s."participantName",
        s.email,
        s.response,
        s."accompanyingCount",
        s."createdAt",
        e.id AS "eventId",
        e.title AS "eventTitle",
        e."startsAt" AS "eventStartsAt"
      FROM "EventSignup" s
      INNER JOIN "PortalEvent" e ON e.id = s."eventId"
      WHERE ${whereSql}
      ORDER BY s."createdAt" DESC
    `)) as RawRow[];

    const signups = rawRows.map((r) => ({
      id: r.id,
      participantName: r.participantName,
      email: r.email,
      response: r.response,
      accompanyingAdults: r.accompanyingCount,
      accompanyingKids: 0,
      createdAt: r.createdAt,
      event: {
        id: r.eventId,
        title: r.eventTitle,
        startsAt: r.eventStartsAt,
      },
    }));

    return NextResponse.json(signups);
  }
}
