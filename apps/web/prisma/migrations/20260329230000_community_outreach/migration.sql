-- CreateEnum
CREATE TYPE "CommunityOutreachStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "CommunityOutreachProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "contactPhone" TEXT,
    "website" TEXT,
    "status" "CommunityOutreachStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewerNote" VARCHAR(500),

    CONSTRAINT "CommunityOutreachProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunityOutreachProfile_userId_key" ON "CommunityOutreachProfile"("userId");
CREATE INDEX "CommunityOutreachProfile_status_idx" ON "CommunityOutreachProfile"("status");
CREATE INDEX "CommunityOutreachProfile_city_idx" ON "CommunityOutreachProfile"("city");

ALTER TABLE "CommunityOutreachProfile" ADD CONSTRAINT "CommunityOutreachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SevaActivity" ADD COLUMN "organizationName" TEXT;
