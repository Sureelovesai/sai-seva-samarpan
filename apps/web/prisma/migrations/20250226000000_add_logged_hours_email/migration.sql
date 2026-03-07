-- AlterTable
ALTER TABLE "LoggedHours" ADD COLUMN IF NOT EXISTS "email" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LoggedHours_email_idx" ON "LoggedHours"("email");
