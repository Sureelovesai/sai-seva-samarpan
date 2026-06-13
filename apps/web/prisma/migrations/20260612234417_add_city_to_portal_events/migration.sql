-- AlterTable
ALTER TABLE "PortalEvent" ADD COLUMN "city" TEXT NOT NULL DEFAULT 'Charlotte';

-- CreateIndex
CREATE INDEX "PortalEvent_city_idx" ON "PortalEvent"("city");
