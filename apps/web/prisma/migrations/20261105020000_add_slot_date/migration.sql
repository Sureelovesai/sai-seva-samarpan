-- AlterTable
ALTER TABLE "EventSlot" ADD COLUMN "slotDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "EventSlot_slotDate_idx" ON "EventSlot"("slotDate");
