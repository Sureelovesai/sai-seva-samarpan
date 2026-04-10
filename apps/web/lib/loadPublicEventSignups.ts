import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { isPrismaColumnMissing } from "@/lib/prismaMissingPortalEvent";

export type PublicEventSignupRow = {
  id: string;
  participantName: string;
  comment: string | null;
  response: "YES" | "NO" | "MAYBE";
  accompanyingAdults: number;
  accompanyingKids: number;
};

type RowBase = {
  id: string;
  participantName: string;
  response: "YES" | "NO" | "MAYBE";
  accompanyingAdults: number;
  accompanyingKids: number;
};

/**
 * Once the `comment` column exists we cache `true` only (cheap path).
 * While missing, we re-check each time so a deploy/migrate picks up comments without restart.
 */
let cachedEventSignupHasCommentColumn = false;

async function eventSignupCommentColumnExists(): Promise<boolean> {
  if (cachedEventSignupHasCommentColumn) return true;
  try {
    const rows = (await prisma.$queryRaw(
      Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM pg_attribute a
          INNER JOIN pg_class c ON c.oid = a.attrelid
          INNER JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname = 'EventSignup'
            AND a.attname = 'comment'
            AND a.attnum > 0
            AND NOT a.attisdropped
        ) AS ok
      `
    )) as Array<{ ok: boolean }>;
    const ok = Boolean(rows[0]?.ok);
    if (ok) cachedEventSignupHasCommentColumn = true;
    return ok;
  } catch {
    return false;
  }
}

/**
 * Merge optional `comment` only when the DB column exists (no failed raw SQL / prisma:error).
 */
async function mergeCommentsFromDb(eventId: string, rows: RowBase[]): Promise<PublicEventSignupRow[]> {
  if (rows.length === 0) return [];
  if (!(await eventSignupCommentColumnExists())) {
    return rows.map((r) => ({ ...r, comment: null }));
  }
  const cm = (await prisma.$queryRaw(
    Prisma.sql`SELECT id, comment FROM "EventSignup" WHERE "eventId" = ${eventId}`
  )) as Array<{ id: string; comment: string | null }>;
  const map = new Map(cm.map((x) => [x.id, x.comment ?? null]));
  return rows.map((r) => ({ ...r, comment: map.get(r.id) ?? null }));
}

/**
 * Loads signups for the public event summary. Uses Prisma when possible; falls back
 * when adults/kids columns are missing (migrations not fully applied).
 */
export async function loadPublicEventSignups(eventId: string): Promise<PublicEventSignupRow[]> {
  try {
    const rows = await prisma.eventSignup.findMany({
      where: { eventId },
      select: {
        id: true,
        participantName: true,
        response: true,
        accompanyingAdults: true,
        accompanyingKids: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return mergeCommentsFromDb(eventId, rows);
  } catch (e) {
    if (!isPrismaColumnMissing(e)) throw e;

    const rows = (await prisma.$queryRaw(Prisma.sql`
      SELECT id, "participantName", response, "accompanyingCount"
      FROM "EventSignup"
      WHERE "eventId" = ${eventId}
      ORDER BY "createdAt" ASC
    `)) as Array<{
      id: string;
      participantName: string;
      response: "YES" | "NO" | "MAYBE";
      accompanyingCount: number;
    }>;

    return rows.map((r) => ({
      id: r.id,
      participantName: r.participantName,
      comment: null,
      response: r.response,
      accompanyingAdults: r.accompanyingCount,
      accompanyingKids: 0,
    }));
  }
}
