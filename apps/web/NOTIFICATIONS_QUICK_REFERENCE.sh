#!/bin/bash

# Notifications System - Quick Reference & Commands

## 🚀 Quick Start

# 1. Start dev server on port 3000
npm run dev -- --port 3000

# 2. Clear all site data (browser console will ask for permission fresh)
# DevTools → Application → Clear site data

# 3. Reload and check console for logs
# Look for: [Firebase] [FCM] [SW] prefixes

## 📱 Testing Commands

# Test notification permission status
node -e "console.log(typeof Notification !== 'undefined' ? 'Supported' : 'Not supported')"

# Check registered service workers (run in browser console)
# navigator.serviceWorker.getRegistrations().then(r => console.log(r.map(x => x.scope)))

# Check FCM token (run in browser console)
# firebase.messaging().getToken().then(token => console.log(token))

## 🗄️ Database Queries

# Check active subscriptions
# SELECT COUNT(*) FROM "PushSubscription" WHERE "isActive" = true;

# Check specific user subscriptions
# SELECT * FROM "PushSubscription" WHERE "userId" = 'user-id';

# Check notification preferences
# SELECT * FROM "NotificationPreference" WHERE "userId" = 'user-id';

# Check notification history
# SELECT * FROM "NotificationLog" ORDER BY "createdAt" DESC LIMIT 20;

## 🔧 Debugging Steps

echo "=== Notification System Debug ==="
echo ""
echo "1. Check Firebase Configuration"
echo "   - Verify NEXT_PUBLIC_FIREBASE_* env vars"
echo "   - Verify FIREBASE_* server env vars"
echo ""

echo "2. Check Service Workers"
echo "   - Open DevTools → Application → Service Workers"
echo "   - Should see: /sw.js and /firebase-messaging-sw.js"
echo ""

echo "3. Check Browser Console"
echo "   - Look for [Firebase] logs"
echo "   - Look for [FCM] logs"
echo "   - Look for [SW] logs"
echo ""

echo "4. Send Test Notification"
echo "   - Use Firebase Console or"
echo "   - Use API: POST /api/test/send-notification"
echo ""

echo "5. Check Database"
echo "   - Verify PushSubscription records"
echo "   - Verify tokens are active"
echo ""

## 🐛 Common Issues

echo ""
echo "=== Troubleshooting ==="
echo ""

echo "Issue: No FCM token"
echo "  → Check VAPID key in env"
echo "  → Check Notification.permission"
echo "  → Check Firebase init logs"
echo ""

echo "Issue: Service Worker not registering"
echo "  → Check /sw.js and /firebase-messaging-sw.js exist"
echo "  → Check browser console for errors"
echo "  → Try: navigator.serviceWorker.getRegistrations()"
echo ""

echo "Issue: Notifications not showing"
echo "  → Check PushSubscription isActive = true"
echo "  → Check NotificationPreference settings"
echo "  → Check browser DND mode"
echo "  → Check notification permissions granted"
echo ""

## 📋 Files Modified

echo ""
echo "=== Modified Files ==="
echo ""
echo "✏️  lib/firebase-client.ts"
echo "    - Added service worker registration"
echo "    - Enhanced logging"
echo ""
echo "✏️  app/_components/NotificationPrompt.tsx"
echo "    - Added Firebase initialization"
echo "    - Better error handling"
echo ""
echo "✨ app/_components/ForegroundNotificationListener.tsx"
echo "    - NEW component for foreground messages"
echo ""
echo "✏️  app/layout.tsx"
echo "    - Added ForegroundNotificationListener"
echo ""
echo "✏️  public/firebase-messaging-sw.js"
echo "    - Cleaned up configuration"
echo "    - Enhanced handlers"
echo ""

## 📚 Documentation Files

echo ""
echo "=== Documentation ==="
echo ""
echo "📖 NOTIFICATIONS_FIXES_SUMMARY.md"
echo "   - Overview of all fixes"
echo ""
echo "📖 NOTIFICATIONS_DEBUG_GUIDE.md"
echo "   - Detailed testing and debugging guide"
echo ""

## ✅ Pre-Deployment Checklist

echo ""
echo "=== Pre-Deployment Checklist ==="
echo ""
echo "[ ] Dev server tested locally"
echo "[ ] Notification prompt shows"
echo "[ ] Permission dialog works"
echo "[ ] FCM token generated"
echo "[ ] Token stored in database"
echo "[ ] Can send test notification"
echo "[ ] Notification shows on device"
echo "[ ] Click handler works"
echo "[ ] Background notifications work"
echo "[ ] Foreground notifications work"
echo "[ ] Database populated correctly"
echo "[ ] No console errors"
echo "[ ] Environment variables set"
echo "[ ] Firebase credentials valid"
echo ""

echo "=== All systems ready! ==="
