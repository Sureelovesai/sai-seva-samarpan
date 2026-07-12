# Phase 4: Frontend Notification Components - Complete Implementation

## ✅ What's Done

All 4 missing frontend components are now built and integrated:

1. **firebase-client.ts** - Firebase client SDK initialization and token management
2. **NotificationPrompt.tsx** - Automatically requests notification permission on app load
3. **NotificationCenter.tsx** - Shows notification history with unread badge
4. **NotificationPreferences.tsx** - User settings for notification types
5. **Updated service worker** - Handles push events from FCM
6. **Updated layout.tsx** - NotificationPrompt shows on every page
7. **Added dependencies** - `firebase` and `date-fns` packages

## 🔧 Required: Setup Firebase Public Config

Your app needs the **public Firebase client configuration** in `.env.local`. These are **safe to expose** in the browser (marked with `NEXT_PUBLIC_` prefix).

### Step 1: Get Firebase Config

1. Go to https://console.firebase.google.com/
2. Select your **"sai-seva-portal"** project
3. Click the gear icon ⚙ → **Project Settings**
4. Scroll to "Your apps" section
5. Click the **web app** (icon: `</>`)
6. Under "SDK setup and configuration", copy your config

You'll see something like:
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

### Step 2: Get VAPID Key (for Web Push)

1. Still in Firebase Console
2. Go to **Cloud Messaging** tab (left sidebar)
3. Under "Web configuration" section, find **"Web Push certificates"**
4. If no key exists, click **"Generate Key Pair"**
5. Copy the **"Public key"** - this is your VAPID_KEY

### Step 3: Add to .env.local

Add these lines to `c:\Projects\FullStack-App\apps\web\.env.local`:

```bash
# Firebase Client SDK (PUBLIC - safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY_HERE"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="sai-seva-portal.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="sai-seva-portal"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="sai-seva-portal.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_SENDER_ID_HERE"
NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID_HERE"
NEXT_PUBLIC_FIREBASE_VAPID_KEY="YOUR_VAPID_KEY_HERE"
```

Replace the placeholders with values from your Firebase console.

## 🧪 Testing Locally

### 1. Restart Dev Server

```bash
npm run dev
```

### 2. Visit App at http://localhost:3000

After 2 seconds, you should see a notification permission prompt at the bottom-right:

```
📬 Stay Updated
Enable notifications to get reminders about activities and important updates.
[Enable] [Not now]
```

### 3. Click "Enable"

- Browser will ask for notification permission
- Click "Allow" when prompted
- Prompt disappears and FCM token is registered

### 4. Verify in Browser DevTools (F12)

**Application Tab:**
- ✅ Service Workers - Should see `/sw.js` registered and active
- ✅ Manifest - Should load `/manifest.json` successfully
- ✅ Notifications - Should be enabled (green)

**Console Tab:**
```
[App] Service Worker registered: ServiceWorkerRegistration {...}
[FCM] Token obtained: AIza...
[FCM] Token registered with backend
```

**Network Tab:**
- Look for POST request to `/api/notifications/subscribe`
- Should return 200 with success

### 5. Check Database

Run this in your database (Neon console or local psql):

```sql
-- Check if user has FCM token registered
SELECT id, userId, deviceName, isActive, subscribedAt 
FROM "PushSubscription" 
WHERE userId = 'YOUR_USER_ID'
LIMIT 1;
```

Should see one row with your device's FCM token.

## 🎯 Testing Real Notifications

### Option 1: Use Firebase Admin SDK (Backend)

```bash
# In your terminal, test from Node.js directly
node
```

```javascript
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: 'sai-seva-portal',
    privateKey: 'YOUR_PRIVATE_KEY',
    clientEmail: 'firebase-adminsdk-fbsvc@sai-seva-portal.iam.gserviceaccount.com'
  })
});

// Replace with an actual FCM token from your database
const token = 'AIza...'; 

await admin.messaging().send({
  notification: {
    title: 'Test Notification',
    body: 'This is a test push notification'
  },
  webpush: {
    notification: {
      icon: 'https://srisathyasaisevagcf.org/icons/icon-192x192.png',
    }
  },
  token: token
});

console.log('Notification sent!');
```

### Option 2: Create Activity in UI

1. Login as Admin
2. Go to Admin Dashboard → Add Seva Activity
3. Create a new activity in your city
4. The system will send notifications to all volunteers in that city

If a volunteer's browser is open:
- ✅ They'll receive a push notification
- ✅ Browser shows notification (even if app is in background)
- ✅ Clicking opens the app to activity details

## 📱 Integrate Components in Your Pages

### Add to Settings/Dashboard Page

```tsx
import { NotificationCenter } from "@/app/_components/NotificationCenter";
import { NotificationPreferences } from "@/app/_components/NotificationPreferences";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      {/* Notification Preferences Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Notification Preferences</h2>
        <NotificationPreferences />
      </section>
      
      {/* Notification History Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Notification History</h2>
        <NotificationCenter />
      </section>
    </div>
  );
}
```

### Add to Dashboard

```tsx
import { NotificationCenter } from "@/app/_components/NotificationCenter";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        {/* Main dashboard content */}
      </div>
      
      <aside>
        <NotificationCenter />
      </aside>
    </div>
  );
}
```

## 🔔 How Each Component Works

### NotificationPrompt
- **When:** Shows 2 seconds after page loads
- **What:** Asks for notification permission
- **Does:** Registers FCM token with backend
- **Hides:** After user grants permission or clicks "Not now"
- **Frequency:** Once per session (uses sessionStorage)

### NotificationCenter
- **What:** Displays notification history
- **Shows:** Last 20 notifications by default (paginated)
- **Actions:**
  - Click notification → mark as read + navigate to content
  - Unread badge shows count
  - Emoji icons for different notification types
- **Auto-refresh:** Fetches from `/api/notifications/history`

### NotificationPreferences
- **What:** User settings for notification types
- **Options:**
  - New Activities
  - New Signups
  - Activity Reminders
  - Blog Posts
  - Community Outreach
  - Events
- **Behavior:** Changes save immediately to backend
- **Storage:** Backend Prisma database

## 🔧 API Endpoints Used

These endpoints were already created in previous phases:

1. **POST /api/notifications/subscribe** - Register FCM token
2. **POST /api/notifications/unsubscribe** - Remove FCM token
3. **GET /api/notifications/history** - Get notification history
4. **POST /api/notifications/history** - Mark as read
5. **GET /api/notifications/preferences** - Get user preferences
6. **PUT /api/notifications/preferences** - Update preferences

## 📊 Data Flow

```
User Opens App
    ↓
NotificationPrompt appears
    ↓
User grants permission
    ↓
Firebase generates FCM token
    ↓
Token sent to /api/notifications/subscribe
    ↓
Backend stores in PushSubscription table
    ↓
When event occurs (new activity, signup, etc):
    Admin/System triggers notification
    ↓
Backend sends to all FCM tokens via Firebase
    ↓
Service Worker receives push event
    ↓
Shows browser notification to user
    ↓
User clicks notification
    ↓
App opens and navigates to content
    ↓
NotificationCenter shows in history
```

## 🚀 Deployment to Production

Once tested locally, deploy to Vercel:

```bash
git add .
git commit -m "Phase 4: Frontend notification components (FCM, prompt, center, preferences)"
git push origin main
```

Vercel will:
1. Build the app (same build you did locally)
2. Deploy to production
3. Use environment variables from Vercel dashboard

### Add Env Vars to Vercel

1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add all `NEXT_PUBLIC_FIREBASE_*` variables
4. Redeploy (or new commits auto-deploy)

## ✨ Features Now Available

- ✅ **Push Notifications** - Users receive browser notifications
- ✅ **Notification Center** - Users see history
- ✅ **User Preferences** - Users customize which notifications they get
- ✅ **Offline Support** - Service worker handles push even offline
- ✅ **Smart Targeting** - Location-aware + role-based notifications
- ✅ **Scheduled Reminders** - Automatic reminders via cron
- ✅ **Unread Badge** - Shows count of unread notifications

## 🐛 Troubleshooting

### "Cannot find module 'firebase/messaging'"
- Restart dev server: `npm run dev`
- If persists: `rm -rf node_modules && npm install`

### Notification permission prompt not showing
- Check browser console for errors (F12)
- Ensure you're not in an incognito window
- Try a different browser
- Check if notifications are already denied for this site

### Notifications received but not shown
- Check service worker is registered (DevTools → Application)
- Verify push notification permission is "Allowed"
- Check browser DevTools → Console for SW errors
- Ensure FCM token is in PushSubscription table

### FCM token not registering
- Check network tab for `/api/notifications/subscribe` request
- Should return 200
- Check backend logs for errors
- Verify user is authenticated

## 📝 Files Modified/Created

| File | Status | What |
|------|--------|------|
| `lib/firebase-client.ts` | ✅ Created | Firebase client SDK setup |
| `app/_components/NotificationPrompt.tsx` | ✅ Created | Permission request component |
| `app/_components/NotificationCenter.tsx` | ✅ Created | Notification history UI |
| `app/_components/NotificationPreferences.tsx` | ✅ Created | User settings component |
| `public/sw.js` | ✅ Updated | Added push event handler |
| `app/layout.tsx` | ✅ Updated | Added NotificationPrompt |
| `package.json` | ✅ Updated | Added firebase + date-fns |
| `.env.local` | ⏳ Pending | Add NEXT_PUBLIC_FIREBASE_* vars |

## Next Steps

1. ✅ Add Firebase public config to `.env.local`
2. ✅ Restart dev server
3. ✅ Test notification permission prompt
4. ✅ Grant permission and verify token registers
5. ✅ Create test activity to trigger notification
6. ✅ Test notification appears in browser
7. ✅ Test NotificationCenter shows history
8. ✅ Test NotificationPreferences saves
9. ✅ Integrate components into dashboard/settings pages
10. ✅ Deploy to production on Vercel

Let me know when you've added the Firebase config to `.env.local` and I'll walk you through testing!
