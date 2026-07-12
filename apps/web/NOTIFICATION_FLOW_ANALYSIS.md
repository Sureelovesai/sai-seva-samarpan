# Notification Flow Analysis & Default Preferences

## Current Status ✅

The notification system is **working correctly**. When a volunteer joins a seva activity:

### 1. **Who Gets Notifications**

#### For COORDINATOR Role:
- **Location-based filtering**: Notified only if the coordinator manages that specific city
- Code: `sendNotificationToLocation([sevaActivity.city], {...}, "SEVA_COORDINATOR")`
- Checks RoleAssignment.cities for matching city

#### For ADMIN Role:
- **Global notification**: All admins notified regardless of location
- Code: `sendNotificationToRole("ADMIN", {...})`

### 2. **Notification Content**

**For Coordinators:**
```
Title: "New Signup for Your Activity"
Body: "{VolunteerName} signed up for {ActivityTitle}"
TriggerType: "NEW_SIGNUP"
Action URL: "/admin/seva-signups"
```

**For Admins:**
```
Title: "New Volunteer Signup"
Body: "{VolunteerName} registered for {ActivityTitle} ({City})"
TriggerType: "NEW_SIGNUP"
Action URL: "/admin/seva-signups"
```

### 3. **Notification Trigger Flow**

```
User joins activity on /seva-activities
        ↓
POST /api/seva-signups
        ↓
createVolunteerSignup() [Database]
        ↓
sendSevaJoinSignupEmails() [Email notifications]
        ↓
sendNotificationToLocation() [COORDINATOR - city-specific]
sendNotificationToRole() [ADMIN - global]
        ↓
sendNotificationToUser() [For each coordinator/admin]
        ↓
Check user preferences (NEW_SIGNUP trigger type)
        ↓
Get FCM tokens and send via Firebase Messaging
        ↓
Log in NotificationLog table
```

---

## Default Notification Preferences

### Current Behavior

When a user first accesses notifications, the system creates default preferences:

```typescript
// In /api/notifications/preferences/route.ts
if (!prefs) {
  prefs = await prisma.notificationPreference.create({
    data: { userId: session.sub },  // All fields default to true
  });
}
```

**All notification types default to ENABLED (true):**
- ✅ `newActivityNotifications` - NEW_ACTIVITY
- ✅ `signupNotifications` - NEW_SIGNUP (Volunteer joins)
- ✅ `reminderNotifications` - ACTIVITY_REMINDER, EVENT_REMINDER
- ✅ `blogNotifications` - BLOG_POST, BLOG_COMMENT
- ✅ `communityOutreachNotifications` - PARTNER_APP
- ✅ `eventNotifications` - EVENT_SIGNUP

### Preference Check in Notification Service

```typescript
// In notification-service.ts
if (checkPreference) {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (prefs) {
    const prefsEnabled = getPreferenceForTrigger(prefs, payload.triggerType);
    if (!prefsEnabled) {
      console.log(`[Notification] Skipped - user preferences disabled`);
      return; // Skip if preference disabled
    }
  }
}
```

**If NO preferences exist yet:** Notification is sent anyway (graceful fallback)

---

## Notification Preferences Schema

```prisma
model NotificationPreference {
  id                                String  @id @default(cuid())
  userId                            String  @unique
  newActivityNotifications          Boolean @default(true)
  signupNotifications               Boolean @default(true)    // ← For volunteer joins
  reminderNotifications             Boolean @default(true)
  blogNotifications                 Boolean @default(true)
  communityOutreachNotifications    Boolean @default(true)
  eventNotifications                Boolean @default(true)
  createdAt                         DateTime @default(now())
  updatedAt                         DateTime @updatedAt
}
```

---

## Trigger Type Mapping

| Trigger Type | Preference Field | When Sent |
|---|---|---|
| `NEW_ACTIVITY` | newActivityNotifications | New seva activity created |
| `NEW_SIGNUP` | signupNotifications | Volunteer joins activity ✅ |
| `ACTIVITY_REMINDER` | reminderNotifications | 24h before activity |
| `EVENT_REMINDER` | reminderNotifications | Event reminder |
| `BLOG_POST` | blogNotifications | New blog post |
| `BLOG_COMMENT` | blogNotifications | Comment on blog |
| `PARTNER_APP` | communityOutreachNotifications | Community outreach event |
| `EVENT_SIGNUP` | eventNotifications | Event signup |

---

## Scenario: Volunteer Joins Activity

### Setup:
- **Coordinator A** manages: "Charlotte" city
- **Coordinator B** manages: "Raleigh" city  
- **Admin X** has ADMIN role
- **Volunteer V** joins activity in Charlotte

### Expected Behavior:

1. **Coordinator A** ✅ Gets notification
   - Reason: Manages Charlotte city
   - Condition: Has SEVA_COORDINATOR role + city matches

2. **Coordinator B** ❌ NO notification
   - Reason: Manages Raleigh, not Charlotte
   - Location filter excludes them

3. **Admin X** ✅ Gets notification
   - Reason: Has ADMIN role (global scope)
   - Condition: Has ADMIN role

4. **Volunteer V** ❌ NO notification
   - Reason: Not a coordinator or admin
   - Not targeted by notification functions

---

## Default Preferences Implementation

### Current:
- **Implicit defaults**: All notification types enabled by default (true)
- Users get preferences auto-created on first access

### What This Means:
✅ A **new coordinator** joining the system will receive NEW_SIGNUP notifications immediately  
✅ No explicit opt-in required  
✅ Users can customize from `/dashboard/notifications` Preferences panel

---

## Testing the Flow

### Step 1: Verify Coordinator Receives Notification
```bash
# As a coordinator managing Charlotte
# Join activity in Charlotte
# Check: /dashboard/notifications → should see "New Signup" notification
```

### Step 2: Verify Admin Receives Notification
```bash
# As an admin
# Monitor while volunteer joins anywhere
# Check: /dashboard/notifications → should see signup notification
```

### Step 3: Verify Notification Preferences Work
```bash
# Go to /dashboard/notifications → Preferences tab
# Toggle "Volunteer Signups" OFF
# Have another volunteer join
# Result: No new signup notification (NEW_SIGNUP disabled)
```

### Step 4: Verify Different City Coordinators Don't Get Notified
```bash
# As coordinator for Raleigh
# Volunteer joins activity in Charlotte  
# Result: No notification (location filter blocks it)
```

---

## Code Locations

| File | Purpose |
|---|---|
| `/api/seva-signups/route.ts` | Sends notifications when volunteer joins |
| `/lib/notification-service.ts` | Core notification logic + preference checking |
| `/api/notifications/preferences/route.ts` | Manages user preferences |
| `prisma/schema.prisma` | NotificationPreference model |
| `/api/notifications/history/route.ts` | Shows notification history |

---

## Summary

✅ **Coordinator-Only Notifications**: Implemented via `sendNotificationToLocation()` with city filtering  
✅ **Admin Global Notifications**: Implemented via `sendNotificationToRole("ADMIN")`  
✅ **Default Preferences**: All enabled by default (true)  
✅ **Preference Checking**: Active in `sendNotificationToUser()` before sending  
✅ **User Customization**: Available at `/dashboard/notifications` Preferences panel
