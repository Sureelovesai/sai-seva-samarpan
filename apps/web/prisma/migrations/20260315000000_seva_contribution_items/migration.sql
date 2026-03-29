-- CreateEnum
CREATE TYPE "SevaContributionClaimStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SevaContributionItem" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "neededLabel" TEXT NOT NULL DEFAULT '',
    "maxQuantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SevaContributionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SevaContributionClaim" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "volunteerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" "SevaContributionClaimStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SevaContributionClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SevaContributionItem_activityId_idx" ON "SevaContributionItem"("activityId");

-- CreateIndex
CREATE INDEX "SevaContributionClaim_itemId_idx" ON "SevaContributionClaim"("itemId");

-- CreateIndex
CREATE INDEX "SevaContributionClaim_email_idx" ON "SevaContributionClaim"("email");

-- AddForeignKey
ALTER TABLE "SevaContributionItem" ADD CONSTRAINT "SevaContributionItem_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "SevaActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SevaContributionClaim" ADD CONSTRAINT "SevaContributionClaim_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "SevaContributionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
