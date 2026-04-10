-- AlterTable
ALTER TABLE "EventSignup" ADD COLUMN "accompanyingAdults" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EventSignup" ADD COLUMN "accompanyingKids" INTEGER NOT NULL DEFAULT 0;

-- Legacy: single "accompanying" count becomes adults (kids unknown)
UPDATE "EventSignup" SET "accompanyingAdults" = "accompanyingCount";

-- AlterTable
ALTER TABLE "EventSignup" DROP COLUMN "accompanyingCount";
