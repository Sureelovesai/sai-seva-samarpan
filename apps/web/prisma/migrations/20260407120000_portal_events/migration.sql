-- CreateEnum
CREATE TYPE "PortalEventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventSignupResponse" AS ENUM ('YES', 'NO', 'MAYBE');

-- CreateTable
CREATE TABLE "PortalEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "heroImageUrl" TEXT,
    "flyerUrl" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "signupsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "PortalEventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSignup" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accompanyingCount" INTEGER NOT NULL DEFAULT 0,
    "response" "EventSignupResponse" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortalEvent_status_idx" ON "PortalEvent"("status");

-- CreateIndex
CREATE INDEX "PortalEvent_startsAt_idx" ON "PortalEvent"("startsAt");

-- CreateIndex
CREATE INDEX "EventSignup_eventId_idx" ON "EventSignup"("eventId");

-- CreateIndex
CREATE INDEX "EventSignup_email_idx" ON "EventSignup"("email");

-- AddForeignKey
ALTER TABLE "EventSignup" ADD CONSTRAINT "EventSignup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PortalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
