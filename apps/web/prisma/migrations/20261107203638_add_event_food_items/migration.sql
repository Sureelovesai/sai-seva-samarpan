-- CreateTable EventFoodItem
CREATE TABLE "EventFoodItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "neededLabel" TEXT NOT NULL,
    "maxQuantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventFoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventFoodItem_eventId_idx" ON "EventFoodItem"("eventId");

-- AddForeignKey
ALTER TABLE "EventFoodItem" ADD CONSTRAINT "EventFoodItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PortalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
