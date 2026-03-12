-- Add BLOG_ADMIN to AppRole enum (omit if already applied)
ALTER TYPE "AppRole" ADD VALUE 'BLOG_ADMIN';

-- Allow multiple roles per person: drop unique on email, add unique on (email, role)
ALTER TABLE "RoleAssignment" DROP CONSTRAINT IF EXISTS "RoleAssignment_email_key";
CREATE UNIQUE INDEX "RoleAssignment_email_role_key" ON "RoleAssignment"("email", "role");
