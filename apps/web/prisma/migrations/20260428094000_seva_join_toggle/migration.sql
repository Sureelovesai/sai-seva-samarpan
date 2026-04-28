-- Add per-activity toggle for Join Seva vs item-only sign-up.
ALTER TABLE "SevaActivity"
ADD COLUMN "joinSevaEnabled" BOOLEAN NOT NULL DEFAULT true;
