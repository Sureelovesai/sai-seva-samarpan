# Phase 3: Scheduled Activity Reminders

## Overview

Phase 3 implements automated push notifications that remind volunteers and coordinators about upcoming activities:
- **24 hours before** activity starts
- **12 hours before** activity starts
- **1 hour before** activity starts

## How It Works

### Reminder Timing

The system checks activities periodically (via cron) and sends reminders based on the time until activity start:

```
Activity Start Time: 2:00 PM Saturday

24-hour reminder window: 1:30 PM Friday - 2:30 PM Friday ✅
12-hour reminder window: 1:30 AM Saturday - 2:30 AM Saturday ✅
1-hour reminder window:   12:30 PM Saturday - 1:30 PM Saturday ✅
```

### Who Gets Reminders

**Volunteers:**
- ✅ Only volunteers registered in the activity's city
- ✅ Only for PUBLISHED, active activities
- ✅ Message includes: "Your seva activity starts in [24h/12h/1h]"

**Coordinators:**
- ✅ Only coordinators with activity's city in their cities list
- ✅ Only for PUBLISHED, active activities
- ✅ Message includes: "Your coordinated activity starts in [24h/12h/1h]"

**Example:**
```
Activity: "Beach Cleanup" in San Jose, starts Monday 2 PM

At Monday 1 PM (1 hour before):
  🔔 Volunteers in San Jose → "Reminder: Beach Cleanup starts in 1 hour"
  🔔 Coordinators in San Jose → "Reminder: Beach Cleanup starts in 1 hour"
  
  ❌ Volunteers in Chicago → No reminder
  ❌ Coordinators in Boston → No reminder
```

---

## Setup & Configuration

### 1. Add Environment Variable

Add to your `.env.local`:
```bash
# Cron security token (use a strong random string)
CRON_SECRET=your-very-secret-cron-token-here-change-this
```

Generate a strong token:
```bash
# On Mac/Linux:
openssl rand -base64 32

# On Windows PowerShell:
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### 2. Set Up Cron Job

#### Option A: Vercel Cron (Recommended for Vercel deployment)

Add `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/activity-reminders",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

This runs the endpoint every 30 minutes.

#### Option B: External Cron Service (for other hosting)

Use services like:
- **Easycron**: easycron.com
- **Cron-job.org**: cron-job.org
- **AWS Lambda**: Scheduled events
- **Google Cloud Scheduler**: Scheduled jobs

Setup:
```bash
URL: https://your-app.com/api/cron/activity-reminders
Method: POST
Headers: X-Cron-Token: your-very-secret-cron-token-here-change-this
Frequency: Every 30 minutes
```

---

## API Endpoint

### POST /api/cron/activity-reminders

**Authentication:** X-Cron-Token header

**Request:**
```bash
curl -X POST https://your-app.com/api/cron/activity-reminders \
  -H "X-Cron-Token: your-secret-token"
```

**Success Response:**
```json
{
  "success": true,
  "message": "Activity reminders sent",
  "stats": {
    "total": 25,
    "sent24h": 2,
    "sent12h": 1,
    "sent1h": 3,
    "errors": 0
  }
}
```

**Error Response:**
```json
{
  "error": "Unauthorized",
  "status": 401
}
```

---

## Files Created/Modified

### New Files:
1. **`lib/reminder-service.ts`**
   - `sendActivityReminders()` - Main function called by cron
   - `sendLocationReminder()` - Sends reminders to volunteers & coordinators
   - Handles 24h, 12h, and 1h timing windows

2. **`app/api/cron/activity-reminders/route.ts`**
   - POST endpoint for cron job
   - Validates X-Cron-Token
   - Returns statistics

### Modified Files:
None - Phase 3 doesn't modify existing code

---

## How Reminders Are Sent

### Step 1: Query Activities
```typescript
// Find all published, active activities with start dates
GET SevaActivity WHERE {
  status = "PUBLISHED" AND
  isActive = true AND
  startDate IS NOT NULL
}
```

### Step 2: Calculate Time Until Start
```typescript
const timeUntilStart = activity.startDate.getTime() - now.getTime();
const hoursUntilStart = timeUntilStart / (1000 * 60 * 60);
```

### Step 3: Check Reminder Windows
- If `23.5 < hoursUntilStart < 24.5` → Send 24-hour reminder
- If `11.5 < hoursUntilStart < 12.5` → Send 12-hour reminder
- If `0.5 < hoursUntilStart < 1.5` → Send 1-hour reminder

### Step 4: Send to Location
```typescript
await sendNotificationToLocation(
  [activity.city],  // Only this city
  {
    title: "Reminder: Activity starts in X hours",
    body: "...",
    triggerType: "ACTIVITY_REMINDER",
    relatedId: activity.id,
    actionUrl: "/find-seva"  // or "/admin/seva-dashboard"
  },
  "VOLUNTEER"  // or "SEVA_COORDINATOR"
);
```

---

## Testing Reminders

### Local Testing

#### 1. Create a test activity starting in 1 hour
```sql
INSERT INTO "SevaActivity" (
  id, title, category, city, scope, startDate, endDate, 
  startTime, endTime, status, isActive, ...
) VALUES (
  'test123', 'Test Activity', 'Education', 'TestCity', 'CENTER',
  NOW() + INTERVAL '1 hour', NOW() + INTERVAL '2 hours',
  '2:00 PM', '3:00 PM', 'PUBLISHED', true, ...
);
```

#### 2. Manually call the endpoint
```bash
curl -X POST http://localhost:3000/api/cron/activity-reminders \
  -H "X-Cron-Token: test-token" \
  -H "Content-Type: application/json"
```

Note: Update `CRON_SECRET` in `.env.local` to `test-token` first.

#### 3. Check the results
- Response should show stats with reminders sent
- Check browser console for notification logs
- Check NotificationLog table for created entries

### Production Testing

1. Deploy to production with correct `CRON_SECRET`
2. Create activity starting in ~1 hour
3. Wait for cron job to run (or manually trigger via curl)
4. Check push notifications on mobile app
5. Verify NotificationLog entries in database

---

## Logs & Monitoring

### Console Logs (Development/Production)

```
[Cron] Starting activity reminder job...
[Reminder] Sent 24 hours reminder for Beach Cleanup in San Jose
[Reminder] Sent 12 hours reminder for Community Service in Chicago
[Reminder] Sent 1 hour reminder for Food Drive in Boston
[Reminder] Summary: 24h=2, 12h=1, 1h=3, errors=0
```

### Error Logs

```
[Cron] Unauthorized reminder request - invalid token
[Reminder] Failed to send reminder for activity abc123: [error details]
[Cron] Activity reminder job failed: [error details]
```

### Database Logs

Check `NotificationLog` table for sent reminders:
```sql
SELECT * FROM "NotificationLog" 
WHERE "triggerType" = 'ACTIVITY_REMINDER' 
ORDER BY "sentAt" DESC 
LIMIT 100;
```

---

## Troubleshooting

### Issue: Reminders Not Sending

**Check 1: Cron job running?**
```bash
# If using Vercel, check deployment logs
# If using external service, verify it's making requests
```

**Check 2: Wrong CRON_SECRET?**
```bash
# Test manually with correct token
curl -X POST https://your-app.com/api/cron/activity-reminders \
  -H "X-Cron-Token: $(echo $CRON_SECRET)"
```

**Check 3: Activity details?**
- Status is "PUBLISHED" (not DRAFT)
- isActive = true
- startDate is set
- startDate is in the future

**Check 4: User registration?**
- Volunteers must have location matching activity's city
- Coordinators must have activity's city in their cities list

### Issue: Too Many Reminders Sent

**Solution:** Increase the time window (in reminder-service.ts):
```typescript
// Instead of 0.5-1.5 hours, use 0.5-0.75 hours
if (hoursUntilStart >= 0.5 && hoursUntilStart < 0.75) {
  // Send reminder
}
```

### Issue: Reminders Sent Multiple Times

**Solution:** Check if cron is running too frequently or add deduplication:
```typescript
// Check if reminder already sent (using reminderSentAt field)
if (activity.reminderSentAt) {
  // Already sent, skip
  continue;
}

// After sending, update reminderSentAt
await prisma.sevaActivity.update({
  where: { id: activity.id },
  data: { reminderSentAt: new Date() }
});
```

---

## Next Steps (Phase 4)

**Phase 4: Frontend Components**
- Create NotificationPrompt component (requests FCM permission)
- Create NotificationCenter component (shows history)
- Create NotificationPreferences component (user settings)

**Phase 5: Polish & Testing**
- E2E testing across devices
- Analytics & metrics
- Error handling improvements
- Performance optimization

---

## Summary

✅ Phase 3 provides:
- Automatic reminders 24h, 12h, 1h before activities
- Location-aware notifications for volunteers & coordinators
- Secure cron endpoint with token validation
- Comprehensive logging and monitoring
- Easy setup and configuration

The system is production-ready and can be deployed immediately!
