# Phase 2: Notification Recipients - Visual Summary

## How Location Works for Notifications

Users must have a registered **location/city** to receive location-specific notifications.

### User Registration with Location
```
When a user signs up, they register with a city:
- Volunteer: Registers with city "San Jose" → location = "San Jose"
- Coordinator: Registers with cities "San Jose, Chicago" → locations = ["San Jose", "Chicago"]
- Admin/BlogAdmin: No city requirement → receives GLOBAL notifications
```

---

## Notification Flow for Each Event

### 1️⃣ NEW_ACTIVITY - New Activity Published
```
Admin creates activity in "San Jose"
                    ↓
        ┌───────────┴───────────┬───────────┐
        ↓                       ↓           ↓
   VOLUNTEERS            COORDINATORS      ADMIN
   in "San Jose"         in "San Jose"     (everywhere)
        ✅                      ✅              ✅
   Get notified         Get notified    Get notified
   
   VOLUNTEERS            COORDINATORS
   in "Chicago"          in "Chicago"
        ❌                      ❌
   NO notification      NO notification
   
   Not logged in users
        ❌
   NO notification
```

---

### 2️⃣ NEW_SIGNUP - Volunteer Joins Activity
```
Volunteer joins activity in "San Jose"
                    ↓
        ┌───────────┴───────────┬───────────┐
        ↓                       ↓           ↓
   COORDINATORS         OTHER VOLUNTEERS   ADMIN
   in "San Jose"        in "San Jose"      (everywhere)
        ✅                      ❌              ✅
   Get notified         NO notification   Get notified
   
   COORDINATORS
   in "Chicago"
        ❌
   NO notification
```

---

### 3️⃣ BLOG_POST - New Blog Post Submitted
```
User submits blog post
        ↓
   ALL BLOG_ADMIN worldwide
        ✅
   Get notified
   
   ALL ADMIN worldwide
        ✅
   Get notified
   
   Other roles
        ❌
   NO notification
```

---

### 4️⃣ PARTNER_APP - New Organization Profile
```
NGO submits profile
        ↓
   ALL ADMIN worldwide
        ✅
   Get notified
   
   Other roles
        ❌
   NO notification
```

---

### 5️⃣ EVENT_SIGNUP - New Event Registration
```
User registers for event
        ↓
   ALL EVENT_ADMIN worldwide
        ✅
   Get notified
   
   Other roles
        ❌
   NO notification
```

---

## Key Rules

### ✅ Location-Aware Notifications
- NEW_ACTIVITY: Volunteers & Coordinators in that city
- NEW_SIGNUP: Coordinators in that city

**Requirement:** User must have location/city set in profile

### ✅ Global Notifications (All users with role)
- BLOG_POST: All BLOG_ADMIN + ADMIN
- PARTNER_APP: All ADMIN
- EVENT_SIGNUP: All EVENT_ADMIN

**No location requirement**

### ✅ Who Gets Notifications
- ✅ Logged-in users with matching location/role
- ❌ Not-logged-in users (anonymous)
- ❌ Users without matching location/role

---

## Database Schema

### User Location
```prisma
model User {
  id       String
  location String?    // City where user is registered
}
```

### Coordinator Cities
```prisma
model RoleAssignment {
  id     String
  email  String
  role   String      // "SEVA_COORDINATOR"
  cities String?     // "San Jose, Chicago, Houston" (comma-separated)
}
```

---

## Testing Guide

### Test NEW_ACTIVITY Location Filter
```
1. Create User A in "San Jose" (VOLUNTEER)
2. Create User B in "Chicago" (VOLUNTEER)
3. Admin creates activity in "San Jose"
   → User A gets notification ✅
   → User B gets NO notification ✅
4. Check NotificationLog table
   → User A should have entry
   → User B should NOT have entry
```

### Test NEW_SIGNUP Location Filter
```
1. Create Coordinator C with cities "San Jose, Houston"
2. Create Coordinator D with cities "Boston"
3. Create activity in "San Jose"
4. Volunteer joins the activity
   → Coordinator C gets notification ✅
   → Coordinator D gets NO notification ✅
5. Check NotificationLog table
   → Coordinator C should have entry
   → Coordinator D should NOT have entry
```

### Test BLOG_POST Global
```
1. Create Admin E anywhere
2. Create BlogAdmin F anywhere
3. User submits blog post
   → Admin E gets notification ✅
   → BlogAdmin F gets notification ✅
   → No location check needed
```

---

## Common Questions

### Q: Will unregistered users get notifications?
**A:** No. Users must be logged in with a registered location/role to receive location-aware notifications.

### Q: What if a user has no location?
**A:** They won't receive location-specific notifications (NEW_ACTIVITY, NEW_SIGNUP), but will receive global ones (BLOG_POST, etc).

### Q: Can a volunteer receive NEW_ACTIVITY for other cities?
**A:** No. Only volunteers with matching registered city receive it.

### Q: Can I change notification recipients?
**A:** Yes! Modify the notification call in the API route:
- Use `sendNotificationToRole()` for global
- Use `sendNotificationToLocation()` for location-aware
- Use `sendNotificationToUser()` for specific user

---
