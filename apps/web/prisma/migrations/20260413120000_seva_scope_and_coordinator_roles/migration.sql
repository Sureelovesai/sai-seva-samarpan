-- CreateEnum
CREATE TYPE "SevaActivityScope" AS ENUM ('CENTER', 'REGIONAL', 'NATIONAL');

-- AlterTable
ALTER TABLE "SevaActivity" ADD COLUMN "scope" "SevaActivityScope" NOT NULL DEFAULT 'CENTER';
ALTER TABLE "SevaActivity" ADD COLUMN "sevaUsaRegion" TEXT;

-- AlterTable
ALTER TABLE "RoleAssignment" ADD COLUMN "regions" TEXT;

-- AlterEnum
ALTER TYPE "AppRole" ADD VALUE 'REGIONAL_SEVA_COORDINATOR';
ALTER TYPE "AppRole" ADD VALUE 'NATIONAL_SEVA_COORDINATOR';

-- CreateIndex
CREATE INDEX "SevaActivity_scope_idx" ON "SevaActivity"("scope");
CREATE INDEX "SevaActivity_sevaUsaRegion_idx" ON "SevaActivity"("sevaUsaRegion");
