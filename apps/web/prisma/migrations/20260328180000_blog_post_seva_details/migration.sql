-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN "sevaDate" TIMESTAMP(3),
ADD COLUMN "sevaCategory" TEXT,
ADD COLUMN "posterEmail" TEXT,
ADD COLUMN "posterPhone" TEXT;

-- CreateIndex
CREATE INDEX "BlogPost_sevaCategory_idx" ON "BlogPost"("sevaCategory");
