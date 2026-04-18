-- 24h reminder cron deduplication (same pattern as SevaActivity.reminderSentAt)
ALTER TABLE "PortalEvent" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
