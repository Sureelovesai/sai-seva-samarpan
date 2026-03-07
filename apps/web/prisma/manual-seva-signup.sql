-- Run this in Neon SQL Editor (or any PostgreSQL client) if migrate dev can't reach the DB.
-- Creates the SevaSignup enum and table for Join Seva sign-ups.

DO $$ BEGIN
  CREATE TYPE "SevaSignupStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SevaSignup" (
  "id"            TEXT NOT NULL,
  "activityId"    TEXT NOT NULL,
  "volunteerName" TEXT NOT NULL,
  "email"         TEXT NOT NULL,
  "phone"         TEXT,
  "status"        "SevaSignupStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SevaSignup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SevaSignup_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "SevaActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SevaSignup_activityId_idx" ON "SevaSignup"("activityId");
CREATE INDEX IF NOT EXISTS "SevaSignup_status_idx" ON "SevaSignup"("status");
CREATE INDEX IF NOT EXISTS "SevaSignup_createdAt_idx" ON "SevaSignup"("createdAt");
