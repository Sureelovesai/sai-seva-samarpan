# Android Badge Debugging Guide

## Why Badge Shows on iOS but Not Android

The Badging API support differs between iOS and Android PWAs:

| Feature | iOS Safari | Android Chrome |
|---------|-----------|----------------|
| Badge API | ✅ Full Support | ⚠️ Limited (Chrome 81+) |
| Requirements | PWA installed | PWA installed + Android 12+ |
| Notification Permission | Optional | May be required |
| Display Method | Badge on app icon | Badge on app icon |

---

## How to Debug on Android

### 1. Check Browser Console (Recommended)
On your Android device, open the PWA:
1. Open Chrome DevTools (chrome://inspect)
2. Open the Sai Seva PWA
3. Go to **Console** tab
4. Look for logs starting with `[BadgeAPI]`

Expected output:
```
[BadgeAPI] ✅ Set badge to 15 {
  isStandalone: true,
  displayMode: "standalone",
  userAgent: "Mozilla/5.0 (Linux; Android 12; ...)"
}
```

### 2. Check Badge API Info
Run this in the browser console on Android:
```javascript
fetch('/api/notifications/history?unread=true')
  .then(r => r.json())
  .then(d => console.log('Unread count:', d.total || d.notifications?.length))
```

### 3. Verify Installation State
Check if PWA is installed correctly:
```javascript
console.log({
  isStandalone: window.navigator.standalone === true,
  badgeSupported: 'setAppBadge' in navigator,
  notificationPermission: Notification.permission
})
```

Expected for installed PWA:
```javascript
{
  isStandalone: true,        // ✅ PWA is installed
  badgeSupported: true,      // ✅ Badging API available
  notificationPermission: "granted"  // ✅ Notification permission granted
}
```

---

## Common Issues & Solutions

### Issue 1: `isStandalone: false` (Not Installed)
**Problem:** The badge won't work in web browser, only in installed PWA
**Solution:** 
- Install the PWA properly on home screen
- Use "Install app" option from browser menu
- Don't just bookmark the web page

### Issue 2: `badgeSupported: false`
**Problem:** Browser doesn't support Badging API
**Solution:**
- Requires Chrome 81+ on Android 12+
- Update your browser to latest version
- Use Android 12 or newer

### Issue 3: `notificationPermission: "denied"`
**Problem:** Notification permission not granted
**Solution:**
- Check app Settings → Notifications
- Grant notification permission
- May need to reinstall PWA after granting permission

### Issue 4: Badge Shows on Web, Not on Icon
**Problem:** Badge works in app but doesn't show on home screen icon
**Solution:**
1. Force update the PWA:
   - Open Settings → Apps → Sai Seva
   - Clear cache
   - Reinstall PWA

2. Check if your launcher supports badges:
   - Some Android launchers don't show app icon badges
   - Try different launcher (Nova, Pixel Launcher, etc.)

3. Check notification settings:
   - Badge might be disabled in system settings
   - Go to Settings → Notifications → App badges
   - Enable "Allow notification badges"

---

## Service Worker Badge Sync

The badge is updated from two places:

1. **From Client App** (NotificationBell component):
   - Fetches unread count every 10 seconds
   - Updates badge immediately
   - Works from main app context

2. **From Service Worker** (background):
   - Updates badge when push notification received
   - Fetches unread count from API
   - Works even when app is closed

Both methods use the same API call: `/api/notifications/history?unread=true`

---

## Testing the Badge

### Step 1: Clear and Reinstall PWA
1. Go to Settings → Apps → Sai Seva
2. Uninstall the app
3. Go back to website
4. Install PWA again using "Install app" menu

### Step 2: Grant Notifications Permission
1. When prompted, tap "Allow" for notifications
2. Check Settings → Notifications → Sai Seva → "Show badges" is enabled

### Step 3: Check Console Logs
1. Open chrome://inspect on computer
2. Connect Android device via USB
3. Select the PWA in DevTools
4. Go to Console tab
5. Refresh the page
6. Look for `[BadgeAPI] ✅ Set badge to X`

### Step 4: Verify Badge Updates
1. Open the PWA
2. Go to Notifications page
3. Mark a notification as read
4. Check console for badge update logs
5. Check app icon on home screen for badge number

---

## Expected Behavior

### Web Browser (Not Installed)
- Bell badge: ✅ Shows in header
- App icon badge: ❌ Not available (browser tabs don't have badges)
- Console: `[BadgeAPI] ⚠️ setAppBadge not available on this device`

### Installed PWA on Android 12+
- Bell badge: ✅ Shows in header
- App icon badge: ✅ Shows on home screen (if supported by launcher)
- Console: `[BadgeAPI] ✅ Set badge to X`

### Installed PWA on iOS
- Bell badge: ✅ Shows in header
- App icon badge: ✅ Shows on home screen
- Console: `[BadgeAPI] ✅ Set badge to X`

---

## If Badge Still Doesn't Show

**Collect this info and share:**
1. Android version (e.g., Android 12, 13, 14)
2. Chrome version (Settings → About Chrome)
3. Browser console output (chrome://inspect)
4. Is PWA installed? (check: `window.navigator.standalone`)
5. Is badge API supported? (check: `'setAppBadge' in navigator`)
6. Notification count (check: unread notifications)

**Check logs for:**
- `[BadgeAPI] ✅ Set badge to X` = Working ✅
- `[BadgeAPI] ⚠️ setAppBadge not available` = Not supported
- `[BadgeAPI] ❌ setAppBadge failed:` = Error occurred

---

## Browser Support Matrix

| Browser | Android | iOS | Notes |
|---------|---------|-----|-------|
| Chrome PWA | 81+ | N/A | Android 12+ recommended |
| Firefox | ❌ | N/A | Not supported |
| Samsung Internet | 14+ | N/A | Limited support |
| Safari | N/A | 15+ | Full support |
| Edge | 81+ | N/A | Same as Chrome |

---

## Next Steps

1. **Test on your Android device**
2. **Open console (chrome://inspect)**
3. **Share the exact error/log message**
4. **Let me know your Android version and Chrome version**
5. **We can then debug specifically for your device**
