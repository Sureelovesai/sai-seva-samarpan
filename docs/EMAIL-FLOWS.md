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

**Trigger:** Cron job calls the reminder endpoint **every hour**. The endpoint finds activities whose **true start** (`startDate` calendar day + `startTime` in `SEVA_REMINDER_TIMEZONE`, or `NEXT_PUBLIC_EVENT_TIMEZONE`, default `America/New_York`) falls between **23 and 25 hours from now** (UTC), and whose reminder has not been sent yet.  
**API:** `GET` or `POST /api/cron/seva-reminders`

**Emails sent:**

| Recipient   | When                    | Purpose |
|------------|--------------------------|--------|
| **Each volunteer** (for that activity) | Once per activity, 24h before start | Reminder: activity starts in ~24 hours, start time, location, coordinator contact |
| **Seva coordinator** (once per activity) | Same run | Reminder: activity starts in ~24 hours + list of all volunteers (name, email, phone) |

**Implementation:** `apps/web/app/api/cron/seva-reminders/route.ts`  
**Deduplication:** Each activity has `reminderSentAt`. When reminders are sent, it is set so the same activity is not processed again.

---

## 3. Portal events — 24 hours before start

**Trigger:** Same cron as seva (`GET` or `POST /api/cron/seva-reminders`, hourly).  
**Implementation:** `apps/web/lib/portalEventRemindersCron.ts` (invoked from the same route after seva processing).

**Rules:**

- Only **Published** events with `reminderSentAt` null are considered.
- Event **`startsAt`** (UTC in DB) must fall between **23 and 25 hours** from the cron run time.
- Emails go to each **YES** or **MAYBE** RSVP (one email per address). **NO** responses do not receive this reminder.
- **`PortalEvent.reminderSentAt`** is set after the batch so the event is not processed again.
- If an admin **changes `startsAt`** on an event, `reminderSentAt` is cleared so a new reminder can be sent for the new time (`apps/web/app/api/admin/portal-events/[id]/route.ts`).

**Email content:** Title, formatted start (`NEXT_PUBLIC_EVENT_TIMEZONE`), venue, link to `/events/[id]`, optional organizer email, guest counts.

RSVP confirmation emails (with calendar links) are unchanged; see `lib/portalEventRsvpEmails.ts`.

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
      "schedule": "0 * * * *"
    }
  ]
}
```

- `0 * * * *` = **every hour** at minute 0 (UTC). This is required: the handler only selects activities whose start is in a **2-hour** window about 24h ahead; a **once-daily** cron would almost never hit that window.  
- Vercel calls `https://your-domain.com/api/cron/seva-reminders` on that schedule.  
- With Root Directory = `apps/web`, this `vercel.json` is used automatically.

### Optional: protect the cron endpoint

Set `CRON_SECRET` in the environment. Then call the endpoint with either:

- Query: `?secret=<CRON_SECRET>`
- Or header: `Authorization: Bearer <CRON_SECRET>`

If `CRON_SECRET` is set and the request does not match, the endpoint returns 401.

---

## Summary

| Event              | Volunteer / participant email | Coordinator / organizer email |
|--------------------|-----------------|--------------------|
| **Join Seva**      | Yes (confirmation) | Yes (new signup notice) |
| **Seva 24h before** | Yes (reminder)  | Yes (reminder + volunteer list) |
| **Portal event RSVP** | Yes (confirmation + calendar links) | Yes if `organizerEmail` set |
| **Portal event 24h before** | Yes for YES/MAYBE (reminder) | Not duplicated (organizer already gets RSVP notices) |

Content of these emails can be adjusted later; the logic for when to send and to whom is in place.
