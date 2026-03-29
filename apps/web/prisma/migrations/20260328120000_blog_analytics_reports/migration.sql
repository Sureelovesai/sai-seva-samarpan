-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN "centerCity" TEXT;

-- CreateIndex
CREATE INDEX "BlogPost_centerCity_idx" ON "BlogPost"("centerCity");

-- CreateTable
CREATE TABLE "BlogAnalyticsReport" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "centerFilter" TEXT,
    "regionFilter" TEXT,
    "targetWordCount" INTEGER NOT NULL DEFAULT 500,
    "userInstructions" TEXT,
    "generatedBody" TEXT NOT NULL,
    "editedBody" TEXT,
    "sourcePostIds" JSONB NOT NULL,
    "reportTitle" TEXT,

    CONSTRAINT "BlogAnalyticsReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlogAnalyticsReport_createdAt_idx" ON "BlogAnalyticsReport"("createdAt");

-- CreateIndex
CREATE INDEX "BlogAnalyticsReport_createdById_idx" ON "BlogAnalyticsReport"("createdById");

-- AddForeignKey
ALTER TABLE "BlogAnalyticsReport" ADD CONSTRAINT "BlogAnalyticsReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
