# Phase 3 Quick Reference: Activity Reminders

## What It Does
Automatically sends push notifications to volunteers and coordinators:
- ⏰ 24 hours before activity
- ⏰ 12 hours before activity
- ⏰ 1 hour before activity

## Recipients
| Group | When | Where |
|-------|------|-------|
| **Volunteers** | Activity starts in 24h/12h/1h | City-specific |
| **Coordinators** | Activity starts in 24h/12h/1h | City-specific |
| **Admins** | ❌ Don't get reminders | N/A |

## Setup (2 Steps)

### Step 1: Add Environment Variable
```bash
# .env.local
CRON_SECRET=your-secret-token-here
```

### Step 2: Set Up Cron

**For Vercel** (add `vercel.json`):
```json
{
  "crons": [{
    "path": "/api/cron/activity-reminders",
    "schedule": "*/30 * * * *"
  }]
}
```

**For Others** (use external service like Easycron):
```
POST https://your-app.com/api/cron/activity-reminders
Header: X-Cron-Token: your-secret-token-here
Frequency: Every 30 minutes
```

## Test It

### Manual Test
```bash
curl -X POST http://localhost:3000/api/cron/activity-reminders \
  -H "X-Cron-Token: test-token"
  -H "Content-Type: application/json"
```

Make sure to set `CRON_SECRET=test-token` in `.env.local` first.

## Files
- ✅ `lib/reminder-service.ts` - Core reminder logic
- ✅ `app/api/cron/activity-reminders/route.ts` - API endpoint

## How It Works

```
Every 30 minutes:
  1. Get all PUBLISHED, active activities
  2. For each activity:
     a. Calculate hours until start
     b. If 23.5-24.5 hours away → Send 24h reminder
     c. If 11.5-12.5 hours away → Send 12h reminder
     d. If 0.5-1.5 hours away → Send 1h reminder
  3. Return statistics
```

## Response Example

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

## Monitoring

### Check Recent Reminders
```sql
SELECT * FROM "NotificationLog" 
WHERE "triggerType" = 'ACTIVITY_REMINDER' 
ORDER BY "sentAt" DESC 
LIMIT 20;
```

### Check Logs
```
[Cron] Starting activity reminder job...
[Reminder] Sent 24 hours reminder for Beach Cleanup in San Jose
[Reminder] Summary: 24h=2, 12h=1, 1h=3, errors=0
```

## Requirements for Reminders to Send

✅ Activity must be:
- Status = "PUBLISHED"
- isActive = true
- startDate set (not null)
- startDate in future

✅ Volunteers must have:
- Registered with city matching activity's city

✅ Coordinators must have:
- City in their cities list matching activity's city

## Common Issues

### Reminders Not Sending?
1. Check CRON_SECRET is set correctly
2. Verify cron job is running
3. Check activity status & dates
4. Check user locations are registered

### Too Many Reminders?
- Reduce time window in reminder-service.ts
- Add deduplication check
- Increase cron frequency or reduce window

---

## Next: Phase 4

Create UI components:
- NotificationPrompt (request permission)
- NotificationCenter (show history)
- NotificationPreferences (user settings)
