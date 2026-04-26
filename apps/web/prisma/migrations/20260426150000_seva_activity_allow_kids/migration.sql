-- Add per-activity flag to enable/disable kids in Join Seva.
ALTER TABLE "SevaActivity"
ADD COLUMN "allowKids" BOOLEAN NOT NULL DEFAULT true;
