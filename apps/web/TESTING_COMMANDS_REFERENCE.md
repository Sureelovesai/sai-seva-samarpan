# Testing Commands & Quick Scripts

## 🚀 **Start Dev Server**

```bash
cd c:\Projects\FullStack-App\apps\web
npm run dev -- --port 3000
```

Expected output:
```
▲ Next.js 16.1.6
- Local:        http://localhost:3000
```

---

## 🖥️ **Desktop Testing**

### **Chrome**
```bash
# Windows
start chrome http://localhost:3000

# macOS
open -a Chrome http://localhost:3000

# Linux
google-chrome http://localhost:3000
```

Then:
1. Press F12 to open DevTools
2. Go to Console tab
3. Look for `[Firebase]` logs
4. Follow notification prompt

---

## 📱 **Mobile Network Access**

### **Get Your Machine IP**

**Windows:**
```powershell
ipconfig
# Look for IPv4 Address like 192.168.1.100
```

**macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Linux:**
```bash
hostname -I
```

### **Access from Mobile**

On mobile browser, type:
```
http://YOUR-IP:3000
# Example: http://192.168.1.100:3000
```

---

## 🧪 **Send Test Notifications**

### **API Test Endpoint**

```bash
# Test 1: Simple notification
curl -X POST http://localhost:3000/api/test/send-notification \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "title": "Test Notification",
    "body": "Testing from CLI",
    "actionUrl": "/dashboard"
  }'

# Test 2: With custom action URL
curl -X POST http://localhost:3000/api/test/send-notification \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "title": "Activity Update",
    "body": "New activity posted in your area",
    "actionUrl": "/activities"
  }'
```

**Note:** You need to get the session cookie from your browser after logging in

### **Get Session Cookie (Browser)**

In browser console:
```javascript
// Get session cookie
document.cookie
```

Look for cookie with name like `session` or `next-auth.session-token`

---

## 🔍 **Debugging Commands**

### **Check Running Processes**

```powershell
# Windows - Check if Node is running on port 3000
netstat -ano | findstr :3000

# Should show: TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    [PID]
```

### **Check Service Workers**

In browser console:
```javascript
// List all registered service workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => {
    console.log('Scope:', reg.scope);
    console.log('Active:', reg.active);
  });
});

// Get specific service worker
navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js').then(reg => {
  console.log('Firebase SW:', reg);
});
```

### **Check FCM Token**

In browser console:
```javascript
// Get Firebase messaging instance
const messaging = firebase.messaging();

// Get current token
messaging.getToken().then(token => {
  console.log('Current token:', token);
}).catch(err => {
  console.error('Error getting token:', err);
});
```

### **Check Browser Notification Permission**

In browser console:
```javascript
// Check notification permission status
console.log('Permission:', Notification.permission);
// Output: granted, denied, or default

// Request permission
Notification.requestPermission().then(permission => {
  console.log('Permission result:', permission);
});

// Show test notification
if (Notification.permission === 'granted') {
  new Notification('Test', { body: 'Browser notification test' });
}
```

---

## 📊 **Database Queries**

### **Check Subscriptions**

```sql
-- All active subscriptions
SELECT id, userId, fcmToken, deviceName, isActive, subscribedAt 
FROM "PushSubscription" 
WHERE isActive = true 
ORDER BY subscribedAt DESC;

-- Subscriptions for specific user
SELECT id, userId, fcmToken, deviceName, isActive, subscribedAt 
FROM "PushSubscription" 
WHERE userId = 'user-id-here'
ORDER BY subscribedAt DESC;

-- Count active subscriptions
SELECT COUNT(*) as active_count 
FROM "PushSubscription" 
WHERE isActive = true;
```

### **Check Notification Preferences**

```sql
-- All notification preferences
SELECT * FROM "NotificationPreference" 
ORDER BY "createdAt" DESC;

-- Preferences for specific user
SELECT * FROM "NotificationPreference" 
WHERE userId = 'user-id-here';
```

### **Check Notification Logs**

```sql
-- Recent notifications sent
SELECT id, userId, title, body, triggerType, createdAt 
FROM "NotificationLog" 
ORDER BY createdAt DESC 
LIMIT 20;

-- Notifications for specific user
SELECT id, userId, title, body, triggerType, createdAt 
FROM "NotificationLog" 
WHERE userId = 'user-id-here'
ORDER BY createdAt DESC;

-- Count notifications by trigger type
SELECT triggerType, COUNT(*) as count 
FROM "NotificationLog" 
GROUP BY triggerType 
ORDER BY count DESC;
```

---

## 🧭 **Testing Flow Checklist**

### **Phase 1: Setup (5 min)**
- [ ] Dev server running on 3000
- [ ] App loads at `http://localhost:3000`
- [ ] Open DevTools (F12)

### **Phase 2: Desktop Chrome (10 min)**
- [ ] Console shows `[Firebase]` logs
- [ ] Service workers registered
- [ ] Notification prompt appears
- [ ] Click "Enable"
- [ ] Permission dialog
- [ ] `[FCM] Token obtained` log
- [ ] Send test notification
- [ ] Notification appears
- [ ] Can click notification

### **Phase 3: Get Machine IP (2 min)**
- [ ] Run `ipconfig` (Windows) / `ifconfig` (Mac)
- [ ] Note IP address (e.g., 192.168.1.100)
- [ ] Verify mobile on same WiFi

### **Phase 4: Mobile Chrome (10 min)**
- [ ] Access `http://IP:3000` on mobile
- [ ] Same app loads on mobile
- [ ] DevTools inspection (optional)
- [ ] Follow notification flow
- [ ] Send test notification from desktop
- [ ] Receive on mobile

### **Phase 5: PWA Installation (10 min)**
- [ ] Keep app open on mobile
- [ ] Tap menu (⋮)
- [ ] "Install app"
- [ ] Confirm installation
- [ ] App appears in app drawer
- [ ] Launch from drawer
- [ ] Close app completely

### **Phase 6: PWA Notifications (10 min)**
- [ ] Send notification with app closed
- [ ] Notification appears in drawer
- [ ] Click notification
- [ ] App launches
- [ ] Navigates to correct page

### **Phase 7: Firefox Mobile (10 min)**
- [ ] Same steps as Chrome
- [ ] Same expected results
- [ ] May look slightly different

---

## 📝 **Test Result Template**

Save this for each test run:

```markdown
# Test Results - [DATE/TIME]

## Desktop Chrome
- Permission: [GRANTED/DENIED]
- Token: [OBTAINED/FAILED]
- Notification: [RECEIVED/NOT RECEIVED]
- Click Handler: [WORKS/BROKEN]
- Issues: [describe]
- Result: [PASS/FAIL]

## Mobile Chrome
- Network: [CONNECTED/NOT CONNECTED]
- App Load: [SUCCESS/FAILED]
- Token: [OBTAINED/FAILED]
- Notification: [RECEIVED/NOT RECEIVED]
- Issues: [describe]
- Result: [PASS/FAIL]

## PWA Android
- Install: [SUCCESS/FAILED]
- Background Notification: [RECEIVED/NOT RECEIVED]
- Click Handler: [WORKS/BROKEN]
- Issues: [describe]
- Result: [PASS/FAIL]

## Summary
- Platforms tested: [list]
- Overall status: [WORKING/PARTIALLY WORKING/BROKEN]
- Next steps: [describe]
```

---

## 🎯 **Common Test Scenarios**

### **Test 1: Full Permission Flow**
```
1. Clear site data (DevTools → Application → Clear site data)
2. Reload page
3. Wait 2 seconds
4. Notification prompt appears
5. Click "Enable"
6. Browser permission dialog
7. Click "Allow"
8. Check console for: [FCM] Token obtained
9. ✅ Pass: All steps complete
```

### **Test 2: Send & Receive Notification**
```
1. Have app open on device
2. Send test notification
3. Notification appears in system tray/drawer
4. ✅ Pass: Notification received
```

### **Test 3: Click Notification**
```
1. Send notification
2. Notification appears
3. Click on notification
4. App comes to foreground
5. App navigates to action URL
6. ✅ Pass: Navigation works
```

### **Test 4: Multiple Devices**
```
1. Log in on Desktop Chrome
2. Log in on Mobile Chrome
3. Each device gets unique token
4. Send notification
5. Both devices receive it
6. ✅ Pass: Multi-device works
```

### **Test 5: Offline Scenario**
```
1. Enable notifications
2. Put device in airplane mode
3. (App cached, offline.html shows)
4. Disable airplane mode
5. Send notification
6. Notification appears when back online
7. ✅ Pass: Offline handling works
```

---

## 🚀 **Performance Check**

```javascript
// In browser console - check performance
console.time('notification-flow');

// Request permission
Notification.requestPermission().then(() => {
  // Get token
  firebase.messaging().getToken().then(token => {
    // Register with backend
    fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fcmToken: token })
    }).then(() => {
      console.timeEnd('notification-flow');
      // Should be < 2 seconds total
    });
  });
});
```

---

## 📞 **Support Commands**

### **Check App Version**
```bash
# In web directory
npm list next react

# Should show:
# next@16.1.6
# react@19.2.3
```

### **Check Dependencies**
```bash
# Check if Firebase installed
npm list firebase firebase-admin

# Should show both versions
```

### **Clear Cache & Reinstall**
```bash
# If you get weird errors
cd c:\Projects\FullStack-App\apps\web
rm -r node_modules
rm package-lock.json
npm install
npm run dev -- --port 3000
```

---

## 📱 **Mobile Debugging Setup**

### **Android Chrome Remote Debugging**

**One-time setup:**
1. Connect phone via USB
2. On phone: Settings → Developer Options → USB Debugging
3. On desktop: Chrome → `chrome://inspect`
4. Check "Discover USB devices"

**Run debugging session:**
```bash
# Start dev server
npm run dev -- --port 3000

# Open chrome://inspect on desktop
# Find your device in the list
# Click "inspect" next to your tab
# DevTools opens showing mobile screen
```

---

## 🎯 **When Tests Complete**

Document:
- ✅ What worked
- ❌ What didn't
- 🐛 Issues found
- 💡 Next steps needed

---

**Ready to test! 🚀**
