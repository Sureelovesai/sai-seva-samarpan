-- Add participant configuration columns to SevaActivity
ALTER TABLE "SevaActivity" ADD COLUMN "participantTypes" TEXT NOT NULL DEFAULT 'adults,kids';
ALTER TABLE "SevaActivity" ADD COLUMN "collectAdultName" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SevaActivity" ADD COLUMN "collectAdultEmail" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SevaActivity" ADD COLUMN "collectAdultPhone" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SevaActivity" ADD COLUMN "collectKidName" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SevaActivity" ADD COLUMN "collectKidGroup" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SevaActivity" ADD COLUMN "collectKidEmail" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SevaActivity" ADD COLUMN "collectKidPhone" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SevaActivity" ADD COLUMN "collectGuardianName" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SevaActivity" ADD COLUMN "collectGuardianEmail" BOOLEAN NOT NULL DEFAULT true;

-- Create indexes for new columns
CREATE INDEX "SevaActivity_participantTypes_idx" ON "SevaActivity"("participantTypes");
