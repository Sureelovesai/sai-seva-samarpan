# Notifications Debug & Testing Guide

## ✅ What Was Fixed

### 1. **Firebase Messaging Service Worker Registration**
- Added proper registration of `/firebase-messaging-sw.js` in `firebase-client.ts`
- Firebase now handles background notifications correctly

### 2. **Firebase Client Initialization**
- Firebase is initialized immediately when app loads
- Service workers are registered early in the lifecycle

### 3. **Foreground Notification Handler**
- Added `ForegroundNotificationListener` component
- Displays notifications even when app is in focus

### 4. **Service Worker Configuration**
- Updated `/firebase-messaging-sw.js` with proper structure
- Added notification click handlers
- Proper action URL handling

---

## 🧪 Testing the Notification System

### **Step 1: Verify Firebase Configuration**

```bash
# Check that environment variables are set in .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sai-seva-portal
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
```

### **Step 2: Browser Console Debugging**

1. **Open DevTools** (F12)
2. **Go to Console tab**
3. **Look for these logs during app load:**

```
[Firebase] Client initialized successfully
[Firebase] Messaging service worker registered:
[App] Main Service Worker registered:
[FCM] Token obtained: (token preview)
[NotificationPrompt] Notifications already granted
```

### **Step 3: Check Service Workers**

1. **In DevTools**, go to **Application** → **Service Workers**
2. **You should see:**
   - `/sw.js` - Main PWA service worker ✓
   - `/firebase-messaging-sw.js` - Firebase messaging worker ✓

### **Step 4: Test Permission Flow**

1. **Clear site data** (if already granted):
   - DevTools → Application → Clear site data
2. **Reload page**
3. **You should see:**
   - Notification prompt after 2 seconds
   - Browser permission dialog
   - FCM token in console logs

### **Step 5: Send a Test Notification**

#### **Option A: Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (sai-seva-portal)
3. **Cloud Messaging** → **Send message**
4. Fill in title and body
5. Click on your user's device
6. Send

#### **Option B: API Route Test**

Create `/apps/web/app/api/test/send-notification.ts`:

```typescript
import { NextResponse } from "next/server";
import { sendNotificationToUser } from "@/lib/notification-service";

export async function POST(req: Request) {
  const { userId } = await req.json();

  try {
    await sendNotificationToUser(userId, {
      title: "Test Notification",
      body: "This is a test notification from the API",
      triggerType: "TEST",
      actionUrl: "/dashboard",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

Then test with:
```bash
curl -X POST http://localhost:3000/api/test/send-notification \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-user-id"}'
```

### **Step 6: Check Notification History**

Query the database:
```sql
SELECT * FROM "NotificationLog" ORDER BY "createdAt" DESC LIMIT 10;
SELECT * FROM "PushSubscription" WHERE "isActive" = true;
SELECT * FROM "NotificationPreference";
```

---

## 🐛 Common Issues & Solutions

### **Issue 1: "No FCM token obtained"**
**Causes:**
- Firebase not initialized
- VAPID key missing or invalid
- Browser doesn't support notifications
- Permissions denied

**Fix:**
```javascript
// Check VAPID key
console.log(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);

// Check browser support
if (!('Notification' in window)) {
  console.error('Notifications not supported');
}

// Check permission
console.log(Notification.permission);
```

### **Issue 2: "Firebase not initialized"**
**Cause:** Firebase config is empty or missing

**Fix:**
- Verify `.env.local` has all `NEXT_PUBLIC_FIREBASE_*` variables
- Restart dev server after changing env vars

### **Issue 3: Service Worker not registering**
**Cause:** Wrong file path or scope conflict

**Debug:**
```javascript
// In console
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Registered SWs:', regs.map(r => r.scope));
});
```

### **Issue 4: Notifications not showing**
**Cause:** Multiple issues possible

**Debug steps:**
1. Check DevTools → Application → Service Workers (both registered?)
2. Check DevTools → Console for errors
3. Verify browser is not in DND mode
4. Check notification preferences in DB
5. Check `PushSubscription.isActive = true`

### **Issue 5: Foreground notifications not showing**
**Cause:** `ForegroundNotificationListener` not working or not rendering

**Fix:**
```javascript
// Add this to your page to verify listener is running
console.log('Testing foreground listener');

// Send a test notification while app is focused
// Should see "Foreground message received" in console
```

---

## 📊 Database Schema Check

```sql
-- Check these tables exist with data
SELECT COUNT(*) as user_count FROM "User";
SELECT COUNT(*) as active_subs FROM "PushSubscription" WHERE "isActive" = true;
SELECT COUNT(*) as prefs FROM "NotificationPreference";
SELECT COUNT(*) as logs FROM "NotificationLog";

-- Check specific user
SELECT * FROM "PushSubscription" WHERE "userId" = 'your-user-id';
SELECT * FROM "NotificationPreference" WHERE "userId" = 'your-user-id';
```

---

## 🔍 Network Request Debugging

In DevTools → Network tab:

1. **POST /api/notifications/subscribe** - Should be 200 after enabling
2. **Any failed requests** - Check auth headers and request body
3. **Look at response** - Should confirm token registered

---

## ✨ Expected User Flow

1. User visits app
2. After 2 seconds, notification prompt appears
3. User clicks "Enable"
4. Browser asks for permission
5. User grants permission
6. Console shows: `[FCM] Token obtained`
7. Console shows: `[FCM] Token registered with backend`
8. Backend stores token in `PushSubscription` table
9. **Background**: When notification sent, user sees it even if app closed
10. **Foreground**: When notification sent while app open, user sees it + browser notification

---

## 📝 Checklist Before Going Live

- [ ] All environment variables set correctly
- [ ] Firebase project created and configured
- [ ] VAPID key generated in Firebase
- [ ] Both service workers registering
- [ ] FCM token getting generated
- [ ] Token stored in database
- [ ] Can send test notification
- [ ] Notification appears in browser
- [ ] Click handler works
- [ ] Preferences working
- [ ] Background notifications work
- [ ] Foreground notifications work

---

## 🚀 Next Steps

1. Test the full flow locally
2. Check browser console for any errors
3. Send test notifications
4. Verify database has subscriptions
5. Test in different browsers
6. Test on mobile (PWA)
7. Deploy to production

---

## 📞 Support

For issues:
1. Check console logs with `[Firebase]`, `[FCM]`, `[SW]` prefixes
2. Check DevTools → Network for failed requests
3. Verify database tables and data
4. Check Firebase Console for errors
