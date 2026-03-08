-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED');

-- AlterTable: add status with default APPROVED so existing posts stay visible
ALTER TABLE "BlogPost" ADD COLUMN "status" "BlogPostStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "BlogPost_status_idx" ON "BlogPost"("status");
