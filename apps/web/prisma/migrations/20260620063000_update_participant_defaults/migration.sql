-- Update default values for participant collection fields to false
-- This ensures old activities (before this feature) show unchecked boxes by default

-- Alter defaults for adult collection fields
ALTER TABLE "SevaActivity" ALTER COLUMN "collectAdultName" SET DEFAULT false;
ALTER TABLE "SevaActivity" ALTER COLUMN "collectAdultEmail" SET DEFAULT false;
ALTER TABLE "SevaActivity" ALTER COLUMN "collectAdultPhone" SET DEFAULT false;

-- Alter defaults for kid collection fields
ALTER TABLE "SevaActivity" ALTER COLUMN "collectKidName" SET DEFAULT false;
ALTER TABLE "SevaActivity" ALTER COLUMN "collectKidGroup" SET DEFAULT false;
ALTER TABLE "SevaActivity" ALTER COLUMN "collectKidEmail" SET DEFAULT false;
ALTER TABLE "SevaActivity" ALTER COLUMN "collectKidPhone" SET DEFAULT false;

-- Alter defaults for guardian collection fields
ALTER TABLE "SevaActivity" ALTER COLUMN "collectGuardianName" SET DEFAULT false;
ALTER TABLE "SevaActivity" ALTER COLUMN "collectGuardianEmail" SET DEFAULT false;

-- Update existing rows that have TRUE values to FALSE (old activities should start unchecked)
UPDATE "SevaActivity" SET
  "collectAdultName" = false,
  "collectAdultEmail" = false,
  "collectAdultPhone" = false,
  "collectKidName" = false,
  "collectKidGroup" = false,
  "collectKidEmail" = false,
  "collectKidPhone" = false,
  "collectGuardianName" = false,
  "collectGuardianEmail" = false
WHERE "collectAdultName" = true
   OR "collectAdultEmail" = true
   OR "collectAdultPhone" = true
   OR "collectKidName" = true
   OR "collectKidGroup" = true
   OR "collectKidEmail" = true
   OR "collectGuardianName" = true
   OR "collectGuardianEmail" = true;
