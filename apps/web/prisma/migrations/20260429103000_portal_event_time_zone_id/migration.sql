-- Align DB with prisma schema: IANA TZ for displaying event startsAt at the venue.
ALTER TABLE "PortalEvent" ADD COLUMN "timeZoneId" TEXT NOT NULL DEFAULT 'America/New_York';
