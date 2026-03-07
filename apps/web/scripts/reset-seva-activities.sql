-- Reset everything so you can start fresh:
-- - Seva activities & signups → Total/Active activities (Home, Seva Admin Dashboard) = 0
-- - Logged hours → Total Hours Served & Total Seva Activities (My Seva Dashboard) = 0
-- Run from apps/web: npm run reset-seva-activities
DELETE FROM "SevaSignup";
DELETE FROM "SevaActivity";
DELETE FROM "LoggedHours";
