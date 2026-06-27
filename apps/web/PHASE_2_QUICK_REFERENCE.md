# Phase 2 Quick Reference: Notification Recipients

| Event | Route | Trigger | Recipients | Scope |
|-------|-------|---------|------------|-------|
| **NEW_ACTIVITY** | `POST /api/admin/seva-activities` | Admin publishes new activity | • Volunteers registered in activity's city<br>• Coordinators in activity's city<br>• **ALL ADMIN users** | Location + Global |
| **NEW_SIGNUP** | `POST /api/seva-signups` | Volunteer signs up for activity | • Coordinators in activity's city<br>• **ALL ADMIN users** | Location + Global |
| **BLOG_POST** | `POST /api/blog-posts` | New blog post submitted | • ALL blog admins<br>• ALL admins | Global |
| **PARTNER_APP** | `POST /api/community-outreach/profile` | New org profile submitted | • ALL admins | Global |
| **EVENT_SIGNUP** | `POST /api/portal-events/[id]/signup` | New event signup | • ALL event admins | Global |

## Key Difference: Location-Aware vs Global

### ✅ NEW_SIGNUP is LOCATION-AWARE (What you asked about)
```
Volunteer joins "Beach Cleanup" in San Jose
↓
✅ Coordinators with "San Jose" in their cities → GET NOTIFIED
❌ Coordinators with "Chicago", "NY", etc → NO NOTIFICATION
```

### ✅ Other notifications are GLOBAL or MIXED
```
Blog post submitted
↓
✅ ALL BLOG_ADMIN users worldwide → GET NOTIFIED
✅ ALL ADMIN users worldwide → GET NOTIFIED
```

## Customization

To change a notification scope, modify the seva-signups route (line 89-103):

Currently uses:
```typescript
await sendNotificationToLocation([sevaActivity.city], {...}, "SEVA_COORDINATOR");
```

To send to ALL coordinators instead:
```typescript
await sendNotificationToRole("SEVA_COORDINATOR", {...});
```

To send to specific coordinators by email:
```typescript
// Get coordinators with specific cities first, then send individually
```
