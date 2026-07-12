# 📋 Notifications Testing - Master Plan

## 🎯 Overview

This document provides the complete roadmap for testing notifications across all platforms.

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **NOTIFICATIONS_FIXES_SUMMARY.md** | What was fixed and why |
| **NOTIFICATIONS_DEBUG_GUIDE.md** | Detailed debugging guide |
| **NOTIFICATIONS_CROSS_PLATFORM_TESTING.md** | Platform-specific testing steps |
| **MOBILE_NETWORK_SETUP.md** | How to access dev server from mobile |
| **TESTING_COMMANDS_REFERENCE.md** | Commands and scripts for testing |
| **NOTIFICATIONS_QUICK_REFERENCE.sh** | Quick commands and checklist |

**Start with:** `NOTIFICATIONS_FIXES_SUMMARY.md` to understand what was changed

---

## 🚀 Quick Start (5 minutes)

### **1. Start Dev Server**
```bash
cd c:\Projects\FullStack-App\apps\web
npm run dev -- --port 3000
```

### **2. Open Browser**
```
http://localhost:3000
```

### **3. Check Console**
```
DevTools (F12) → Console
Look for: [Firebase], [FCM], [SW] logs
```

### **4. Enable Notifications**
```
Notification prompt appears → Click "Enable"
Permission dialog → Click "Allow"
```

### **5. Verify Token**
```
Console should show: [FCM] Token obtained
Database should have entry in PushSubscription table
```

---

## 📱 Testing Phases

### **Phase 1️⃣ : Desktop (Today)**

**Platforms:** Chrome, Firefox, Safari
**Time:** ~30 minutes
**Goal:** Verify base functionality

**Steps:**
1. Start dev server
2. Open browser
3. Enable notifications
4. Verify console logs
5. Send test notification
6. Verify reception

**Success Criteria:**
- ✅ Permission prompt works
- ✅ Token generated
- ✅ Token registered in DB
- ✅ Test notification received
- ✅ Click handler works

**Docs:** `NOTIFICATIONS_DEBUG_GUIDE.md` → **Phase 1: Desktop Web Browsers**

---

### **Phase 2️⃣ : Mobile Web (Tomorrow)**

**Platforms:** Android Chrome, Android Firefox
**Time:** ~30 minutes
**Requirements:** Android device + same WiFi network

**Setup:**
1. Find machine IP (TESTING_COMMANDS_REFERENCE.md)
2. Connect mobile to same WiFi
3. Access `http://IP:3000` on mobile

**Steps:**
1. Follow same flow as desktop
2. Enable notifications on mobile
3. Send test notification
4. Verify mobile receives it

**Success Criteria:**
- ✅ App loads on mobile
- ✅ Permission prompt works
- ✅ Notification received
- ✅ Click opens app

**Docs:** `MOBILE_NETWORK_SETUP.md` + `NOTIFICATIONS_CROSS_PLATFORM_TESTING.md` → **Phase 2: Mobile Chrome/Firefox**

---

### **Phase 3️⃣ : PWA Android (Day After)**

**Platform:** PWA installed on Android
**Time:** ~30 minutes
**Requirements:** Previous phases passed

**Setup:**
1. Keep app installed from Phase 2
2. Install PWA (Menu → Install app)
3. Launch from app drawer

**Tests:**
1. **Foreground:** Send notification while app open → verify shows
2. **Background:** Close app → send notification → verify shows in drawer
3. **Click:** Click notification → verify app opens and navigates
4. **Offline:** Disable WiFi → send notification → enable WiFi → verify received

**Success Criteria:**
- ✅ Foreground notifications work
- ✅ Background notifications work
- ✅ Click handler works
- ✅ Offline handling works

**Docs:** `NOTIFICATIONS_CROSS_PLATFORM_TESTING.md` → **Phase 3: PWA on Android**

---

### **Phase 4️⃣ : iOS PWA (Optional - Later)**

**Platform:** iOS Safari PWA
**Time:** ~1 hour
**Note:** iOS has limitations, mostly graceful degradation

**Expected Limitations:**
- ⚠️ Limited service worker support
- ⚠️ Different notification behavior
- ⚠️ May need native APNs for reliability

**Docs:** `NOTIFICATIONS_CROSS_PLATFORM_TESTING.md` → **Phase 4: iOS PWA**

---

## 📊 Testing Matrix

Track your progress:

```
Phase 1: Desktop
┌─────────────┬────────┬────────┬────────┐
│ Platform    │ Test   │ Result │ Issues │
├─────────────┼────────┼────────┼────────┤
│ Chrome      │ ⏳     │ -      │ -      │
│ Firefox     │ ⏳     │ -      │ -      │
│ Safari      │ ⏳     │ -      │ -      │
└─────────────┴────────┴────────┴────────┘

Phase 2: Mobile Web
┌─────────────┬────────┬────────┬────────┐
│ Platform    │ Test   │ Result │ Issues │
├─────────────┼────────┼────────┼────────┤
│ Ch. Android │ ⏳     │ -      │ -      │
│ FF. Android │ ⏳     │ -      │ -      │
└─────────────┴────────┴────────┴────────┘

Phase 3: PWA
┌─────────────┬────────┬────────┬────────┐
│ Platform    │ Test   │ Result │ Issues │
├─────────────┼────────┼────────┼────────┤
│ PWA Android │ ⏳     │ -      │ -      │
└─────────────┴────────┴────────┴────────┘
```

---

## 🧪 Each Phase Includes

### **For Desktop (Phase 1):**
1. Chrome browser
2. Firefox browser
3. Safari browser (optional)

**For each browser:**
- [ ] DevTools console check
- [ ] Service workers registration
- [ ] Permission flow
- [ ] Token generation
- [ ] Token registration
- [ ] Test notification
- [ ] Click handler
- [ ] Database verification

### **For Mobile (Phase 2):**
1. Chrome on Android
2. Firefox on Android

**For each browser:**
- [ ] Network access (same WiFi)
- [ ] App loads correctly
- [ ] Console logs visible
- [ ] Permission flow
- [ ] Token generation
- [ ] Test notification
- [ ] Database verification

### **For PWA (Phase 3):**
1. Install PWA
2. Launch from drawer
3. Foreground test
4. Background test
5. Click handler test
6. Offline test

---

## 📝 Test Document Checklist

For each phase, document:

```markdown
# [Platform] - Notification Testing Report

## Environment
- Device: [e.g., Windows 10, Android 12, etc.]
- Browser: [e.g., Chrome 119, Firefox 121]
- Date: [YYYY-MM-DD]
- Tester: [Your name]

## Permission Flow
- [ ] Prompt appears after 2 seconds
- [ ] Click "Enable" works
- [ ] Browser permission dialog shows
- [ ] Can grant permission
- [ ] Console shows: [FCM] Token obtained
- [ ] Console shows: [FCM] Token registered

## Token Registration
- [ ] FCM token generated
- [ ] Token sent to backend
- [ ] Backend returns 200
- [ ] Database has entry
- [ ] isActive = true
- [ ] deviceName set correctly

## Notification Delivery
- [ ] Test notification sent
- [ ] Notification received on device
- [ ] Title displays correctly
- [ ] Body displays correctly
- [ ] Icon displays correctly
- [ ] Notification appears in correct location

## Interaction
- [ ] Can click notification
- [ ] App comes to foreground
- [ ] Navigates to correct URL
- [ ] Notification closes after click

## Issues Found
- Issue 1: [description]
- Issue 2: [description]

## Notes
[Any additional observations]

## Result
- [ ] PASS: All tests passed
- [ ] PARTIAL: Some tests failed
- [ ] FAIL: Critical failures
```

---

## 🔧 Tools You'll Need

### **Desktop:**
- Browser (Chrome, Firefox, Safari)
- DevTools (F12)
- Terminal (PowerShell/bash)
- Database client (to query results)

### **Mobile:**
- Android device or emulator
- WiFi network
- USB cable (for remote debugging, optional)
- Chrome with `chrome://inspect` (for debugging)

---

## ⚠️ Common Issues to Watch For

| Issue | Fix | Docs |
|-------|-----|------|
| No FCM token | Check VAPID key in env | DEBUG_GUIDE.md |
| Service worker not registering | Check /sw.js exists | DEBUG_GUIDE.md |
| Permission denied | Clear site data, try again | DEBUG_GUIDE.md |
| Can't access from mobile | Check machine IP and WiFi | MOBILE_NETWORK_SETUP.md |
| Notification not showing | Check browser DND mode | DEBUG_GUIDE.md |
| Click handler broken | Check service worker logs | DEBUG_GUIDE.md |

---

## 🎯 Success Criteria

### **Minimum (MVP) - Phase 1+2:**
- ✅ Desktop Chrome works
- ✅ Mobile Chrome works
- ✅ Notifications show on both
- ✅ Click handler works on both

### **Good - Phase 1+2+3:**
- ✅ All above working
- ✅ Desktop Firefox works
- ✅ Mobile Firefox works
- ✅ PWA Android works
- ✅ Background notifications work

### **Excellent - All Phases:**
- ✅ All above working
- ✅ Offline handling works
- ✅ Multi-device support verified
- ✅ iOS PWA partially working
- ✅ All documentation complete

---

## 📅 Suggested Timeline

| Day | Phase | Time | What |
|-----|-------|------|------|
| Today | 1 | 30 min | Desktop browsers |
| Tomorrow | 2 | 30 min | Mobile web |
| Day 3 | 3 | 30 min | PWA Android |
| Day 4+ | 4 | 1 hour | iOS PWA (optional) |

**Total:** ~2 hours to get Phase 1-3 working

---

## 💡 Pro Tips

1. **Test in order:** Desktop → Mobile Web → PWA → iOS
   - Later phases depend on earlier ones working
   - Helps isolate issues

2. **Document as you go:**
   - Take notes immediately
   - Makes troubleshooting easier

3. **Use same user account:**
   - Log in as same user across devices
   - Easier to verify token registration

4. **Check database after each phase:**
   - Query PushSubscription table
   - Verify tokens are stored

5. **Keep console open:**
   - Watch for errors in real-time
   - Easier to spot issues

6. **Screenshot successes:**
   - Document what works
   - Good for future reference

---

## 🆘 If You Get Stuck

1. **Read the docs:**
   - Start with NOTIFICATIONS_FIXES_SUMMARY.md
   - Then NOTIFICATIONS_DEBUG_GUIDE.md
   - Then NOTIFICATIONS_CROSS_PLATFORM_TESTING.md

2. **Check console logs:**
   - Look for `[Firebase]`, `[FCM]`, `[SW]` prefixes
   - These tell you what's happening

3. **Verify database:**
   - Check PushSubscription table
   - Should have entries for each device

4. **Check network requests:**
   - DevTools → Network
   - Watch for POST /api/notifications/subscribe
   - Should be 200 status

5. **Review env variables:**
   - Make sure all FIREBASE_* and NEXT_PUBLIC_FIREBASE_* are set
   - Restart dev server after changing

---

## ✅ Ready to Start?

1. **Read:** NOTIFICATIONS_FIXES_SUMMARY.md (5 min)
2. **Setup:** Start dev server (1 min)
3. **Test:** Desktop Phase 1 (10 min)
4. **Document:** Results (5 min)
5. **Next:** Mobile testing (tomorrow)

---

## 📞 Quick Links

- **Fixes Summary:** NOTIFICATIONS_FIXES_SUMMARY.md
- **Debug Guide:** NOTIFICATIONS_DEBUG_GUIDE.md
- **Cross-Platform:** NOTIFICATIONS_CROSS_PLATFORM_TESTING.md
- **Mobile Setup:** MOBILE_NETWORK_SETUP.md
- **Commands:** TESTING_COMMANDS_REFERENCE.md
- **Quick Ref:** NOTIFICATIONS_QUICK_REFERENCE.sh

---

**Status: Ready to test! 🚀**

**Last Updated:** July 12, 2026

**Next Action:** Start Phase 1 - Desktop Testing
