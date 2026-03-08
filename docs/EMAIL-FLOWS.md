# Email Flows: Join Seva & 24h Reminders

This document describes when emails are sent and how to enable/schedule them.

---

## 1. On "Join Seva" (volunteer signs up)

**Trigger:** User submits the "Join Seva" form on the Seva Activities page (`/seva-activities`).  
**API:** `POST /api/seva-signups`

**Emails sent:**

| Recipient   | When                    | Purpose |
|------------|--------------------------|--------|
| **Volunteer** | Immediately after signup | Confirmation: "You've joined [activity]. You will receive a reminder 24 hours before..." |
| **Seva coordinator** | Immediately after signup (if activity has `coordinatorEmail`) | Notification: "A new volunteer has signed up" with volunteer name, email, phone, activity title, start, location |

**Implementation:** `apps/web/app/api/seva-signups/route.ts`

---

## 2. 24 hours before the activity

**Trigger:** Cron job calls the reminder endpoint (e.g. every hour). The endpoint finds activities whose start is in the next 23–25 hours and whose reminder has not been sent yet.  
**API:** `GET` or `POST /api/cron/seva-reminders`

**Emails sent:**

| Recipient   | When                    | Purpose |
|------------|--------------------------|--------|
| **Each volunteer** (for that activity) | Once per activity, 24h before start | Reminder: activity starts in ~24 hours, start time, location, coordinator contact |
| **Seva coordinator** (once per activity) | Same run | Reminder: activity starts in ~24 hours + list of all volunteers (name, email, phone) |

**Implementation:** `apps/web/app/api/cron/seva-reminders/route.ts`  
**Deduplication:** Each activity has `reminderSentAt`. When reminders are sent, it is set so the same activity is not processed again.

---

## Enabling emails

Emails are sent via [Resend](https://resend.com). To enable:

1. **Environment variables** (in `.env` / `.env.local` or Vercel):
   - `EMAIL_ENABLED=true`
   - `RESEND_API_KEY=<your Resend API key>`
   - Optional: `EMAIL_FROM` (e.g. `Seva <noreply@yourdomain.com>`); default is Resend’s onboarding address.

2. **Resend:** Create an account, get an API key, and (for production) verify your domain so you can send from your own address.

If `EMAIL_ENABLED` is not `true` or `RESEND_API_KEY` is missing, `sendEmail` in `lib/email.ts` skips sending (no error; returns `{ ok: false, skipped: true }`).

---

## Scheduling the 24h reminder cron

The 24h reminders only run when something calls `/api/cron/seva-reminders`.

### Vercel Cron (already configured)

`apps/web/vercel.json` already defines:

```json
{
  "crons": [
    {
      "path": "/api/cron/seva-reminders",
      "schedule": "0 0 * * *"
    }
  ]
}
```

- `0 0 * * *` = once per day at midnight (UTC).  
- For finer 24h windows (e.g. activities starting at different times), you can change to **hourly**: `"schedule": "0 * * * *"` (every hour at minute 0).  
- Vercel calls `https://your-domain.com/api/cron/seva-reminders` on that schedule.  
- With Root Directory = `apps/web`, this `vercel.json` is used automatically.

### Optional: protect the cron endpoint

Set `CRON_SECRET` in the environment. Then call the endpoint with either:

- Query: `?secret=<CRON_SECRET>`
- Or header: `Authorization: Bearer <CRON_SECRET>`

If `CRON_SECRET` is set and the request does not match, the endpoint returns 401.

---

## Summary

| Event              | Volunteer email | Coordinator email |
|--------------------|-----------------|--------------------|
| **Join Seva**      | Yes (confirmation) | Yes (new signup notice) |
| **24h before start** | Yes (reminder)  | Yes (reminder + volunteer list) |

Content of these emails can be adjusted later; the logic for when to send and to whom is in place.
