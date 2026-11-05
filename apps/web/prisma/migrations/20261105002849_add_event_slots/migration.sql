-- AlterTable
ALTER TABLE "PortalEvent" ADD COLUMN "hasSlots" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EventSlot" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "slotName" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventSlot_eventId_idx" ON "EventSlot"("eventId");

-- AddForeignKey
ALTER TABLE "EventSlot" ADD CONSTRAINT "EventSlot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PortalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
