-- CreateTable
CREATE TABLE "SevaActivityGroup" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" "SevaActivityScope" NOT NULL DEFAULT 'CENTER',
    "city" TEXT NOT NULL,
    "sevaUsaRegion" TEXT,
    "status" "SevaActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SevaActivityGroup_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "SevaActivity" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE INDEX "SevaActivity_groupId_idx" ON "SevaActivity"("groupId");

CREATE INDEX "SevaActivityGroup_scope_idx" ON "SevaActivityGroup"("scope");
CREATE INDEX "SevaActivityGroup_city_idx" ON "SevaActivityGroup"("city");
CREATE INDEX "SevaActivityGroup_sevaUsaRegion_idx" ON "SevaActivityGroup"("sevaUsaRegion");
CREATE INDEX "SevaActivityGroup_status_idx" ON "SevaActivityGroup"("status");

-- AddForeignKey
ALTER TABLE "SevaActivity" ADD CONSTRAINT "SevaActivity_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SevaActivityGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
