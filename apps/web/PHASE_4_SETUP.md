# Phase 4: Frontend Firebase Setup Instructions

## What We Added

We've created all 4 missing frontend components for push notifications:

1. **firebase-client.ts** - Firebase client SDK initialization
2. **NotificationPrompt.tsx** - Component that requests notification permission on app load
3. **NotificationCenter.tsx** - Shows notification history to users
4. **NotificationPreferences.tsx** - Allows users to customize notification settings
5. **Updated service worker** - Handles push events from FCM
6. **Updated layout.tsx** - Integrated NotificationPrompt globally

## Required: Add Firebase Public Config to .env.local

Your `.env.local` file already has the server-side Firebase credentials. Now add the **public client-side** Firebase config:

### Where to Get These Values

1. Go to your Firebase Console: https://console.firebase.google.com/
2. Select your "sai-seva-portal" project
3. Click the gear icon (⚙) → Project Settings
4. Scroll to "Your apps" section
5. Click on your web app (should show `</>` icon)
6. Copy the Firebase config object

### What to Add to .env.local

Add these lines to your `.env.local`:

```bash
# Firebase Client SDK (public - safe to expose in browser)
NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="sai-seva-portal.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="sai-seva-portal"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="sai-seva-portal.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
NEXT_PUBLIC_FIREBASE_VAPID_KEY="YOUR_VAPID_KEY"
```

### Where to Find Each Value

Your Firebase config from console will look like:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "sai-seva-portal.firebaseapp.com",
  projectId: "sai-seva-portal",
  storageBucket: "sai-seva-portal.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

**For the VAPID key:**
1. In Firebase Console, go to Cloud Messaging tab
2. Under "Web configuration", find "Web Push certificates"
3. You should see a key pair - click "Generate Key Pair" if not present
4. Copy the "Public key" - this is your VAPID_KEY

## Testing Locally

After adding the environment variables:

1. **Restart dev server:**
   ```bash
   npm run dev
   ```

2. **Open the app** and you should see:
   - A notification permission prompt at the bottom-right after 2 seconds
   - Click "Enable" to grant permission

3. **Check browser DevTools** (F12 → Application tab):
   - Service Workers tab - verify SW is registered
   - Manifest tab - verify manifest loads
   - Push notifications should be enabled

4. **To test notifications manually** (from browser console):
   ```javascript
   // Get your FCM token
   const registration = await navigator.serviceWorker.ready;
   const token = await firebase.messaging().getToken({
     vapidKey: 'YOUR_VAPID_KEY'
   });
   console.log('FCM Token:', token);
   ```

## Components Overview

### NotificationPrompt
- Shows once per session
- Appears 2 seconds after app load
- Requests browser notification permission
- Registers FCM token with backend
- Auto-hides after success or user dismissal

### NotificationCenter
- Fetches notification history from `/api/notifications/history`
- Shows unread badge count
- Click to mark as read
- Click on notification to navigate to related content
- Shows emoji icons for different notification types

### NotificationPreferences
- Allows users to enable/disable notification types:
  - New Activities
  - New Signups
  - Activity Reminders
  - Blog Posts
  - Community Outreach
  - Events
- Changes sync immediately to backend
- Shows success/error messages

## Adding Components to Your Pages

You can use these components in your dashboard or settings pages:

```tsx
import { NotificationCenter } from "@/app/_components/NotificationCenter";
import { NotificationPreferences } from "@/app/_components/NotificationPreferences";

export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      
      <section>
        <h2>Notifications</h2>
        <NotificationPreferences />
      </section>
      
      <section>
        <h2>Notification History</h2>
        <NotificationCenter />
      </section>
    </div>
  );
}
```

## Service Worker Updates

The service worker now handles:
- **Push events** - Receives FCM messages and displays notifications
- **Notification clicks** - Navigates to the related content when user clicks notification
- **Notification close** - Logs when user dismisses notification

## Next Steps

1. ✅ Add public Firebase config to `.env.local`
2. ✅ Restart `npm run dev`
3. ✅ Test notification prompt appears
4. ✅ Grant permission and verify token is registered
5. ✅ Check backend logs to confirm token storage
6. ✅ Create an activity/signup/post to trigger a real notification
7. ✅ Verify notification appears in browser
8. ✅ Test notification click navigates correctly
9. ✅ Test NotificationCenter shows history
10. ✅ Test NotificationPreferences saves preferences

## Troubleshooting

### "Firebase not initialized" error
- Check all `NEXT_PUBLIC_FIREBASE_*` env vars are set
- Restart dev server after adding env vars
- Check Firebase console for correct project

### Notifications not received
- Verify user has active FCM token in `PushSubscription` table
- Check browser DevTools → Application → Notifications is enabled
- Verify backend sent notification to correct FCM token

### Permission prompt not showing
- Check browser DevTools console for errors
- Make sure Notifications are not already granted/denied
- Try incognito window

## Files Modified/Created

✅ Created: `lib/firebase-client.ts`
✅ Created: `app/_components/NotificationPrompt.tsx`
✅ Created: `app/_components/NotificationCenter.tsx`
✅ Created: `app/_components/NotificationPreferences.tsx`
✅ Updated: `public/sw.js` - Added push event handler
✅ Updated: `app/layout.tsx` - Added NotificationPrompt component
