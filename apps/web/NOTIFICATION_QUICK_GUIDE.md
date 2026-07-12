# Notification System - Quick Reference Guide

## TL;DR - Your Scenario

**Setup:**
- Seva coordinator from Charlotte adds a new seva activity
- Volunteer joins the activity

**Who Gets Notified:**
1. ✅ **Charlotte Coordinator** - Gets notification (location match)
2. ✅ **All Admins** - Get notification (admin role)
3. ❌ Coordinator from other cities - NO notification (location mismatch)
4. ❌ Volunteer - NO notification (not coordinator/admin)

**Why:**
- Coordinators only notified for their city (city-based filtering)
- Admins notified globally (no location restriction)

---

## Default Notifications

**All notification types enabled by default:**
- ✅ New Activity notifications
- ✅ Volunteer Signup notifications ← **This one applies to your scenario**
- ✅ Reminder notifications
- ✅ Blog notifications
- ✅ Community Outreach notifications
- ✅ Event notifications

**No opt-in needed** - Users automatically get notifications for all types when they first join. They can customize later from the Preferences panel.

---

## Where to Test

1. **Notification Bell**: `/dashboard` (top right - shows unread count)
2. **Notification History**: `/dashboard/notifications` → "📬 Notification History"
3. **Preferences**: `/dashboard/notifications` → "⚙️ Preferences"

---

## Verify It's Working

### Test 1: As Coordinator
```
1. Go to /dashboard/notifications
2. Check Preferences → "Volunteer Signups" is ON ✅
3. Go to /seva-activities
4. Have a volunteer join your city activity
5. Refresh /dashboard/notifications
6. Should see: "New Signup for Your Activity" notification
```

### Test 2: As Admin
```
1. Go to /dashboard/notifications
2. Check Preferences → "Volunteer Signups" is ON ✅
3. Monitor while volunteer joins ANY activity
4. Should see: "New Volunteer Signup" notification
```

### Test 3: Cross-City Coordinator
```
1. Coordinator A manages: Charlotte
2. Coordinator B manages: Raleigh
3. Volunteer joins Charlotte activity
4. Result: Coordinator A sees it, Coordinator B doesn't ✅
```

---

## How It Works (Technical)

**When volunteer joins:**
```
POST /api/seva-signups
  ├─ Create signup in database
  ├─ Send email confirmation
  └─ Send push notifications:
      ├─ sendNotificationToLocation([city], "SEVA_COORDINATOR")
      │   └─ Only coordinators managing that city
      └─ sendNotificationToRole("ADMIN")
          └─ All admins globally
```

**Before sending to user:**
```
1. Check user preferences → "NEW_SIGNUP" trigger
2. If enabled → Send
3. If disabled → Skip
4. If no preference set → Send anyway (graceful fallback)
```

---

## Customization

Users can toggle notifications at `/dashboard/notifications` → **Preferences**:
- Turn OFF: "Volunteer Signups" → Won't receive NEW_SIGNUP notifications
- Turn OFF: "Activity Reminders" → Won't receive 24h-before reminders
- etc.

---

## Key Files

| File | What It Does |
|---|---|
| `/api/seva-signups/route.ts` | Triggers notifications when volunteer joins |
| `/lib/notification-service.ts` | Core notification logic + city-based filtering |
| `/api/notifications/preferences/route.ts` | Default preferences creation & updates |
| `/dashboard/notifications/page.tsx` | UI to view history & customize preferences |

---

## Status Summary

| Feature | Status |
|---|---|
| Coordinator-only notifications | ✅ Working |
| Admin global notifications | ✅ Working |
| City-based filtering | ✅ Working |
| Default preferences | ✅ Enabled |
| User customization | ✅ Available |
| Notification history | ✅ Displaying |
| Notification bell | ✅ Showing unread count |

**Everything is implemented and working!** Test it out at `/dashboard/notifications`.
