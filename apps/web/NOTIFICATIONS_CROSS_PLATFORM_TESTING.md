# Notifications - Cross-Platform Testing Guide

## 📋 Overview

We'll test notifications on:
1. **Desktop Browsers** (Chrome, Firefox, Safari) ← Start here
2. **Mobile Chrome/Firefox** (Android)
3. **PWA on Android**
4. **iOS PWA** (later phase)

---

## 🖥️ **Phase 1: Desktop Web Browsers**

### **Setup**
```bash
# Ensure dev server running
npm run dev -- --port 3000

# Open: http://localhost:3000
```

### **Chrome (Desktop)**

**Step 1: Check Console**
```javascript
// Open DevTools (F12) → Console tab
// Look for these logs after page load:
[Firebase] Client initialized successfully
[Firebase] Messaging service worker registered
[App] Main Service Worker registered
[NotificationPrompt] Notifications already granted
```

**Step 2: Check Service Workers**
- DevTools → Application → Service Workers
- Should see:
  - `/sw.js` (Status: activated and running)
  - `/firebase-messaging-sw.js` (Status: activated and running)

**Step 3: Test Permission Flow**
- Clear site data: Application → Clear site data
- Reload page
- After 2 seconds, notification prompt should appear
- Click "Enable"
- Browser permission dialog appears
- Click "Allow"
- Check console for: `[FCM] Token obtained`
- Check console for: `[FCM] Token registered with backend`

**Step 4: Test Notification**

Option A - Firebase Console:
```
1. Go to https://console.firebase.google.com
2. Select project: sai-seva-portal
3. Cloud Messaging → Send message
4. Title: "Test Desktop"
5. Body: "Testing Chrome desktop"
6. Target: Select your user/device
7. Send
```

Option B - API Test:
```bash
curl -X POST http://localhost:3000/api/test/send-notification \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"userId": "your-user-id"}'
```

**Expected Results:**
- ✅ Notification appears in bottom right
- ✅ Can click notification
- ✅ Navigation works
- ✅ Console shows no errors

---

### **Firefox (Desktop)**

**Same steps as Chrome:**
1. F12 → Console
2. Check for logs
3. Clear site data
4. Enable notifications
5. Test notification
6. Verify receipt

**Known Firefox Behavior:**
- Notifications may appear differently (OS-style notification)
- May require additional permission
- Works the same as Chrome otherwise

---

### **Safari (Desktop)**

**Special Notes for Safari:**
- Safari has limited service worker support
- May not show notification prompt same way
- Still worth testing for graceful degradation

**Steps:**
1. Develop → Show Web Inspector
2. Check Console
3. Look for Safari-specific behaviors
4. Test if PWA can be installed

---

## 📱 **Phase 2: Mobile Chrome/Firefox (Android)**

### **Setup**

**Requirements:**
- Android device (or emulator)
- USB cable for development
- Chrome/Firefox installed on mobile
- Same network as dev machine

### **Option 1: Using Android Emulator**

```bash
# If using Android Studio emulator
# Make sure emulator has network access to your dev machine

# Find your machine IP
ipconfig getifaddr en0  # macOS
hostname -I             # Linux
ipconfig                # Windows (look for IPv4 Address)

# Access app via: http://YOUR-IP:3000
```

### **Option 2: Physical Android Device**

```bash
# 1. Find your machine IP (as above)
# 2. On phone, connect to same WiFi
# 3. Open Chrome/Firefox
# 4. Navigate to: http://YOUR-IP:3000
```

### **Testing on Mobile Chrome**

**Step 1: Initial Load**
```
- Open DevTools on Android Chrome:
  - On computer: chrome://inspect
  - Connect phone via USB with debugging enabled
  - Inspect the page
```

**Step 2: Console Logs**
- Should see same logs as desktop
- Look for: `[Firebase]`, `[FCM]`, `[SW]` prefixes

**Step 3: Request Permission**
- Notification prompt appears after 2 seconds
- Click "Enable"
- Mobile permission dialog appears
- Click "Allow notifications"

**Step 4: Check Token**
- Console should show: `[FCM] Token obtained`
- Different token than desktop (per-device)
- Console should show: `[FCM] Token registered with backend`

**Step 5: Test Notification**
```
# Send test notification from your dev machine
curl -X POST http://localhost:3000/api/test/send-notification \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"userId": "your-user-id"}'
```

**Expected Results:**
- ✅ Notification appears in mobile notification drawer
- ✅ Can click notification
- ✅ Opens app and navigates to correct URL
- ✅ Notification persists in drawer

**Debug Checklist:**
- [ ] Firebase initialized (`[Firebase]` logs)
- [ ] Service workers registered (`[SW]` logs)
- [ ] FCM token obtained (`[FCM]` logs)
- [ ] Token registered with backend
- [ ] Test notification sent successfully
- [ ] Notification received on device
- [ ] Click handler works

---

### **Testing on Mobile Firefox**

**Steps:**
1. Open Firefox on Android
2. Navigate to: http://YOUR-IP:3000
3. Follow same flow as Chrome
4. Firefox has similar notification support

**Differences:**
- May show notifications differently
- Timing might vary
- Otherwise should work similarly

---

## 📲 **Phase 3: PWA on Android**

### **What is PWA?**
PWA (Progressive Web App) means:
- Installing the web app as an app on your phone
- It appears in app drawer like native app
- Works offline (with caching)
- Same code, different installation method

### **Installation Steps**

**On Android Phone:**

1. **Open the app in Chrome:**
   - Navigate to: http://YOUR-IP:3000

2. **Look for Install Button:**
   - Should appear automatically OR
   - Menu (⋮) → Install app

3. **Click Install:**
   - Confirm installation
   - App installs in app drawer
   - May appear as "Sai Seva"

4. **Launch from App Drawer:**
   - Opens in standalone mode (no browser UI)
   - Runs as PWA

### **Testing Installed PWA**

**Step 1: Verify Installation**
- App appears in drawer
- Can be launched like native app
- No browser address bar

**Step 2: Enable Notifications**
- Same permission prompt
- Same FCM token registration
- Token stored in database

**Step 3: Test Foreground**
- Keep app open
- Send test notification
- Should see both:
  - System notification (top of screen)
  - In-app notification (if visible)

**Step 4: Test Background**
- Close/exit the PWA
- App still installed
- Send test notification
- Should see system notification
- Click to open app
- Should navigate to correct page

**Step 5: Test Offline**
- Disable WiFi/data on phone
- PWA should show cached version (offline.html)
- Notifications may queue
- When back online, they should sync

**Expected Results:**
- ✅ PWA installs successfully
- ✅ Notifications show even when app closed
- ✅ Clicking notification opens app
- ✅ Navigation works correctly
- ✅ Offline caching works

---

## 📊 **Testing Matrix**

Create a spreadsheet or checklist:

| Platform | Chrome | Firefox | Safari | Status | Issues |
|----------|--------|---------|--------|--------|--------|
| Desktop Web | ⏳ | ⏳ | ⏳ | Pending | - |
| Mobile Chrome | ⏳ | - | - | Pending | - |
| Mobile Firefox | - | ⏳ | - | Pending | - |
| PWA Android | ⏳ | ⏳ | - | Pending | - |

---

## 🔍 **What to Check on Each Platform**

### **Checklist for Each Test**

- [ ] **Permission Flow**
  - [ ] Prompt appears
  - [ ] Permission dialog shows
  - [ ] User can allow/deny
  
- [ ] **Token Generation**
  - [ ] Token obtained log visible
  - [ ] Console shows `[FCM] Token obtained`
  
- [ ] **Token Registration**
  - [ ] Backend call succeeds
  - [ ] Console shows `[FCM] Token registered`
  - [ ] Database has entry in `PushSubscription`
  
- [ ] **Notification Reception**
  - [ ] Notification appears
  - [ ] Title and body correct
  - [ ] Icon displays properly
  
- [ ] **Notification Interaction**
  - [ ] Can click notification
  - [ ] App opens (or focuses)
  - [ ] Navigates to correct URL
  - [ ] Notification closes
  
- [ ] **Console/Debugging**
  - [ ] No error messages
  - [ ] All expected logs appear
  - [ ] Proper log prefixes: `[Firebase]`, `[FCM]`, `[SW]`

---

## 📝 **Test Scenarios**

### **Scenario 1: Happy Path**
```
1. User opens app
2. Permission prompt appears
3. User grants permission
4. Token registered
5. Send notification
6. User receives and clicks
7. ✅ Everything works
```

### **Scenario 2: Permission Denied**
```
1. User opens app
2. Permission prompt appears
3. User denies permission
4. ❓ How does app handle this?
   - Graceful? Show message?
5. Later notifications don't show
```

### **Scenario 3: Offline Then Online**
```
1. App open, notifications enabled
2. User goes offline (disable WiFi)
3. App cached in Service Worker
4. Send notification (queued on server)
5. User comes back online
6. Notification delivered when online
```

### **Scenario 4: Multiple Devices**
```
1. User logs in on desktop
2. Desktop gets FCM token (Token A)
3. User logs in on phone
4. Phone gets FCM token (Token B)
5. Send notification
6. Both devices receive it
7. ✅ Multi-device support works
```

---

## 🐛 **Common Issues & Fixes**

### **Issue: Notification not appearing**
```
Debug:
1. Check console for errors
2. Verify token in database
3. Check notification preferences
4. Verify FCM setup in Firebase Console
5. Check browser notification settings (OS level)
```

### **Issue: Permission denied on first try**
```
Debug:
1. Check if browser already denied
2. Clear site data and retry
3. Check browser settings → Notifications
4. Try in incognito mode
```

### **Issue: Service Worker not registering**
```
Debug:
1. Check DevTools → Application → Service Workers
2. Look for errors in console
3. Verify /sw.js and /firebase-messaging-sw.js files exist
4. Check browser supports service workers (most do)
```

### **Issue: Token not registering with backend**
```
Debug:
1. Check network tab for POST /api/notifications/subscribe
2. Check response status (should be 200)
3. Check auth headers
4. Verify user is authenticated
```

---

## 📊 **Database Verification**

After testing, verify database has data:

```sql
-- Check subscriptions table
SELECT id, userId, fcmToken, deviceName, isActive, subscribedAt 
FROM "PushSubscription" 
ORDER BY subscribedAt DESC;

-- Check if tokens stored
SELECT COUNT(*) as active_tokens 
FROM "PushSubscription" 
WHERE isActive = true;

-- Check notification logs
SELECT id, userId, title, body, createdAt 
FROM "NotificationLog" 
ORDER BY createdAt DESC 
LIMIT 10;
```

---

## 🚀 **Phase 4: iOS PWA (Later)**

> We'll test this after Android is working

**iOS Special Considerations:**
- Limited service worker support
- Apple Push Notification (APNs) may be needed
- PWA installation different on iOS
- Safari on iOS has restrictions
- Notification behavior different

**When ready, we'll:**
1. Test on iOS Safari
2. Install PWA on iOS
3. Test notification reception
4. Handle iOS-specific limitations

---

## 📋 **Testing Order**

### **Day 1: Desktop Testing**
- [ ] Chrome desktop
- [ ] Firefox desktop
- [ ] Safari desktop (optional)

### **Day 2: Mobile Testing**
- [ ] Mobile Chrome on Android
- [ ] Mobile Firefox on Android

### **Day 3: PWA Testing**
- [ ] Install PWA on Android
- [ ] Test foreground notifications
- [ ] Test background notifications
- [ ] Test offline scenario

### **Day 4: Cross-Device**
- [ ] Test multiple devices
- [ ] Verify each gets unique token
- [ ] Send to all devices

### **Day 5: iOS Testing (Optional)**
- [ ] iOS Safari
- [ ] iOS PWA installation
- [ ] iOS notification handling

---

## ✅ **Success Criteria**

**Minimum (MVP):**
- ✅ Desktop Chrome works
- ✅ Mobile Chrome works
- ✅ PWA Android works

**Good:**
- ✅ Desktop Firefox works
- ✅ Mobile Firefox works
- ✅ Offline notifications queue

**Excellent:**
- ✅ All above working
- ✅ iOS PWA partially working
- ✅ Multi-device support

---

## 📝 **Notes for Tracking**

```
Desktop Chrome:
- Started: [date/time]
- Permission: [granted/denied]
- Token obtained: [yes/no]
- Notification received: [yes/no]
- Issues: [list any]
- Result: [PASS/FAIL]

Mobile Chrome:
- Device: [Android version]
- Started: [date/time]
- Permission: [granted/denied]
- Token obtained: [yes/no]
- Notification received: [yes/no]
- Issues: [list any]
- Result: [PASS/FAIL]

[Continue for each platform...]
```

---

## 🎯 **Next Steps**

1. **Set up dev machine IP**
   - Know how to access app from mobile

2. **Test on Desktop First**
   - Chrome, Firefox, Safari
   - Verify base functionality

3. **Move to Mobile**
   - Chrome/Firefox on Android
   - Verify token handling

4. **PWA Testing**
   - Install and launch as app
   - Test background notifications

5. **Document Results**
   - Track what works
   - Note any issues

---

## 💡 **Pro Tips**

- **Enable DevTools on Android:**
  - Desktop: `chrome://inspect`
  - Connect phone via USB
  - Enable USB debugging
  - Inspect your app

- **Test Multiple Users:**
  - Log in as different users
  - Each should get their own token
  - Can send to specific user

- **Monitor Network Requests:**
  - DevTools → Network tab
  - Watch for POST requests to `/api/notifications/subscribe`
  - Check response status

- **Check Service Worker Logs:**
  - DevTools → Application → Service Workers
  - Click service worker URL
  - See its console logs

- **Use Timestamps:**
  - Note exact times of testing
  - Match with server logs
  - Helps debug timing issues

---

**Status: Ready to test! 🚀**
