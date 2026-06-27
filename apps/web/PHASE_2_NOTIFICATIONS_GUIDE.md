# Phase 2: Real-Time Notification Triggers

## Overview
Phase 2 implements automatic push notifications when key events occur in your Sai Seva Portal. Notifications are sent to relevant users based on their roles and locations.

## Notification Triggers & Recipients

### 1. **NEW_ACTIVITY** - New Seva Activity Created
**Route:** `POST /api/admin/seva-activities`  
**Trigger:** When an admin/coordinator creates a new PUBLISHED seva activity  
**Recipients:**
- **VOLUNTEER role users** whose location matches the activity's city
- **SEVA_COORDINATOR role users** in the activity's city
- **ALL ADMIN role users** (global, any location)

**Example:**
- Admin creates a "Beach Cleanup" activity in "San Jose"
- ✅ Volunteers registered with "San Jose" get notified
- ✅ Coordinators with "San Jose" in their city list get notified
- ✅ ALL admins worldwide get notified
- ❌ Volunteers in other cities don't get it
- ❌ Coordinators in other cities don't get it
- ❌ Not-yet-registered users don't get it

---

### 2. **NEW_SIGNUP** - New Volunteer Registration
**Route:** `POST /api/seva-signups`  
**Trigger:** When a volunteer signs up for an activity  
**Recipients:**
- **SEVA_COORDINATOR role users** whose city matches the activity's city
- **ALL ADMIN role users** (global, any location)

**Example:**
- A volunteer signs up for "Beach Cleanup" in San Jose
- ✅ Only coordinators with "San Jose" in their city list get notified
- ✅ ALL admins worldwide get notified
- ❌ Coordinators in other cities don't get it
- ❌ Other volunteers don't get it

---

### 3. **BLOG_POST** - New Blog Post Pending Approval
**Route:** `POST /api/blog-posts`  
**Trigger:** When someone submits a new blog post (status = PENDING_APPROVAL)  
**Recipients:**
- **All BLOG_ADMIN role users** (global notification)
- **All ADMIN role users** (global notification)

**Example:**
- User submits blog post "Community Service Story"
- ✅ All blog admins get notified
- ✅ All admins get notified
- ❌ Other roles don't get it

---

### 4. **PARTNER_APP** - New Partner Profile Pending Review
**Route:** `POST /api/community-outreach/profile`  
**Trigger:** When someone submits a new organization profile  
**Recipients:**
- **All ADMIN role users** (global notification)

**Example:**
- NGO submits their organization profile
- ✅ All admins get notified
- ❌ Other roles don't get it

---

### 5. **EVENT_SIGNUP** - New Event Registration
**Route:** `POST /api/portal-events/[id]/signup`  
**Trigger:** When someone signs up for a portal event  
**Recipients:**
- **All EVENT_ADMIN role users** (global notification)

**Example:**
- User registers for a center event
- ✅ All event admins get notified
- ❌ Other roles don't get it

---

## Location-Aware vs Global Notifications

### Location-Aware (City-based)
Only users with the activity's city in their registered location receive the notification:
- **NEW_ACTIVITY** (volunteers in that city + coordinators in that city)
- **NEW_SIGNUP** (coordinators in activity's city only)

### Location-Aware + Global (City-based + All Admins)
Some notifications are sent to both:
- **NEW_ACTIVITY** (location-aware to volunteers/coordinators + global to ADMIN)
- **NEW_SIGNUP** (location-aware to coordinators + global to ADMIN)

---

## How to Modify Recipients

### To make a notification location-aware:
Use `sendNotificationToLocation()` in your route:
```typescript
import { sendNotificationToLocation } from "@/lib/notification-service";

await sendNotificationToLocation(
  [activityCity],  // array of cities
  {
    title: "New Activity in Your City",
    body: "...",
    triggerType: "NEW_ACTIVITY",
    relatedId: id,
    actionUrl: "/path",
  },
  "SEVA_COORDINATOR"  // role to filter
);
```

### To send to all users with a role:
Use `sendNotificationToRole()` in your route:
```typescript
import { sendNotificationToRole } from "@/lib/notification-service";

await sendNotificationToRole(
  "BLOG_ADMIN",  // role
  {
    title: "New Blog Post",
    body: "...",
    triggerType: "BLOG_POST",
    relatedId: id,
    actionUrl: "/path",
  }
);
```

### To send to specific user:
Use `sendNotificationToUser()` in your route:
```typescript
import { sendNotificationToUser } from "@/lib/notification-service";

await sendNotificationToUser(
  userId,  // specific user ID
  {
    title: "Your Activity",
    body: "...",
    triggerType: "NEW_ACTIVITY",
    relatedId: id,
    actionUrl: "/path",
  }
);
```

---

## Notification Preferences

Users can customize which notifications they receive. The system checks preferences before sending.

**Preference Keys:**
- `newActivityNotifications` - NEW_ACTIVITY, ACTIVITY_REMINDER
- `signupNotifications` - NEW_SIGNUP
- `blogNotifications` - BLOG_POST, BLOG_COMMENT
- `communityOutreachNotifications` - PARTNER_APP
- `eventNotifications` - EVENT_SIGNUP
- `reminderNotifications` - All reminder types

---

## Error Handling

All notifications have graceful error handling:
- ✅ If notification fails, the API request still succeeds
- ✅ Errors are logged to console for debugging
- ✅ Notifications without Firebase credentials still work (logged to DB)
- ✅ No user-facing errors

---

## Testing

### Local Testing:
1. Ensure Firebase credentials are NOT set (notifications will log but not send)
2. Create activity/signup/blog post
3. Check `NotificationLog` table in database to verify logging

### Production Testing:
1. Set Firebase credentials in `.env.local`
2. Create activity/signup/blog post
3. Check mobile app for push notifications
4. Verify correct recipients based on city/role

---

## Next Steps

**Phase 3:** Implement scheduled reminders (24h, 12h, 1h before activities)  
**Phase 4:** Create notification UI components (Notification Center, Preferences)  
**Phase 5:** Frontend Firebase setup + service worker push handling
