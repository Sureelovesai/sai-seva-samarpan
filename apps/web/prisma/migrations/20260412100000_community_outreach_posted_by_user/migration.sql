-- AlterTable
ALTER TABLE "SevaActivity" ADD COLUMN "communityOutreachPostedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "SevaActivity_communityOutreachPostedByUserId_idx" ON "SevaActivity"("communityOutreachPostedByUserId");

-- AddForeignKey
ALTER TABLE "SevaActivity" ADD CONSTRAINT "SevaActivity_communityOutreachPostedByUserId_fkey" FOREIGN KEY ("communityOutreachPostedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: best-effort match legacy rows by coordinator email
UPDATE "SevaActivity" sa
SET "communityOutreachPostedByUserId" = u.id
FROM "User" u
WHERE sa."listedAsCommunityOutreach" = true
  AND sa."communityOutreachPostedByUserId" IS NULL
  AND sa."coordinatorEmail" IS NOT NULL
  AND TRIM(sa."coordinatorEmail") <> ''
  AND LOWER(TRIM(sa."coordinatorEmail")) = LOWER(TRIM(u.email));
