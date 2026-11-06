-- CreateTable EventItem
CREATE TABLE "EventItem" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "neededLabel" TEXT NOT NULL,
    "maxQuantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable EventItemSignup
CREATE TABLE "EventItemSignup" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventItemSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventItem_slotId_idx" ON "EventItem"("slotId");

-- CreateIndex
CREATE INDEX "EventItemSignup_itemId_idx" ON "EventItemSignup"("itemId");

-- CreateIndex
CREATE INDEX "EventItemSignup_email_idx" ON "EventItemSignup"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EventItemSignup_itemId_email_key" ON "EventItemSignup"("itemId", "email");

-- AddForeignKey
ALTER TABLE "EventItem" ADD CONSTRAINT "EventItem_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "EventSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventItemSignup" ADD CONSTRAINT "EventItemSignup_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "EventItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
