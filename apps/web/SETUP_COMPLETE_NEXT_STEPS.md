# Phase 3 & Beyond: Complete Setup Checklist

## ✅ DONE: CRON_SECRET Created

Your secure token has been generated and added to `.env.local`:
```
CRON_SECRET=+KqxIDL9zusB83YPqDVheRrGg+7IjmbG61KY2PZ+BgY=
```

---

## 📋 NEXT STEPS

### Phase 3 Deployment (Reminders)

#### Step 1: Local Testing ✅ (Do This First)
```bash
# Test the reminder endpoint locally
curl -X POST http://localhost:3000/api/cron/activity-reminders \
  -H "X-Cron-Token: +KqxIDL9zusB83YPqDVheRrGg+7IjmbG61KY2PZ+BgY="
```

Expected response:
```json
{
  "success": true,
  "message": "Activity reminders sent",
  "stats": {
    "total": 0,
    "sent24h": 0,
    "sent12h": 0,
    "sent1h": 0,
    "errors": 0
  }
}
```

#### Step 2: Deploy to Production
```bash
# Build for production
npm run build

# Push to your Git repository
git add .
git commit -m "Phase 3: Add activity reminders"
git push origin main
```

#### Step 3: Add CRON_SECRET to Vercel
1. Go to **Vercel Dashboard** → Your Project
2. Go to **Settings** → **Environment Variables**
3. Add new variable:
   - **Name:** `CRON_SECRET`
   - **Value:** `+KqxIDL9zusB83YPqDVheRrGg+7IjmbG61KY2PZ+BgY=`
   - **Environments:** Select all (Development, Preview, Production)
4. Click **Save**
5. Redeploy your project

#### Step 4: Set Up Cron Job

**Option A: Vercel Cron (Recommended)**

Create/update `vercel.json` in your project root:
```json
{
  "crons": [
    {
      "path": "/api/cron/activity-reminders",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

Then push to Vercel:
```bash
git add vercel.json
git commit -m "Add Vercel cron for activity reminders"
git push origin main
```

**Option B: External Cron Service (if not using Vercel)**

Use **Easycron** (easycron.com) or similar:
1. Go to easycron.com
2. Create new cron job:
   - **URL:** `https://your-app.com/api/cron/activity-reminders`
   - **Request Method:** POST
   - **HTTP Basic Authentication:** (leave empty)
   - **Custom Headers:** Add one:
     - **Header:** `X-Cron-Token`
     - **Value:** `+KqxIDL9zusB83YPqDVheRrGg+7IjmbG61KY2PZ+BgY=`
   - **Cron Expression:** `*/30 * * * *` (every 30 minutes)
   - **Execution times:** You can pick specific hours or set it to run always
3. Click Save/Create

#### Step 5: Verify It's Working
```bash
# Check Vercel logs
vercel logs https://your-app.com/api/cron/activity-reminders

# Or manually trigger via curl
curl -X POST https://srisathyasaisevagcf.org/api/cron/activity-reminders \
  -H "X-Cron-Token: +KqxIDL9zusB83YPqDVheRrGg+7IjmbG61KY2PZ+BgY="
```

---

## 🧪 Testing Checklist

- [ ] **Local Test**: Curl endpoint locally, get success response
- [ ] **Build Check**: `npm run build` passes
- [ ] **Deploy**: Push to main, app deploys to Vercel
- [ ] **Env Var Added**: CRON_SECRET visible in Vercel Environment Variables
- [ ] **Cron Job Active**: vercel.json committed or external service configured
- [ ] **Manual Trigger**: Curl production endpoint, get success response
- [ ] **Create Test Activity**: In admin, create activity starting in ~1 hour
- [ ] **Wait & Verify**: Check logs/database for reminder being sent

---

## 📊 How to Monitor Reminders

### Check Recent Reminders in Database
```sql
-- See all reminders sent in last 24 hours
SELECT 
  id,
  "userId",
  title,
  body,
  "triggerType",
  "sentAt"
FROM "NotificationLog" 
WHERE "triggerType" = 'ACTIVITY_REMINDER' 
  AND "sentAt" > NOW() - INTERVAL '24 hours'
ORDER BY "sentAt" DESC;
```

### Check Vercel Logs
```bash
# View live logs
vercel logs --follow

# Or via dashboard: Vercel → Project → Analytics → Logs
```

### Check .env.local Setup
```bash
# Verify CRON_SECRET is set locally
grep CRON_SECRET .env.local
```

---

## 🚀 Phase 4: Frontend Components (Coming Next)

After reminders are working, implement:

1. **NotificationPrompt Component**
   - Asks users for push notification permission
   - Shows on app launch/login
   - Registers FCM token when granted

2. **NotificationCenter Component**
   - Shows notification history
   - Mark as read/unread
   - Shows unread badge

3. **NotificationPreferences Component**
   - User can toggle notification types on/off
   - Save preferences to database
   - Apply when sending notifications

---

## 📝 Files to Remember

| File | Purpose |
|------|---------|
| `.env.local` | Local environment variables (includes CRON_SECRET) |
| `vercel.json` | Vercel configuration with cron schedule |
| `lib/reminder-service.ts` | Core reminder logic |
| `app/api/cron/activity-reminders/route.ts` | Cron endpoint |
| `PHASE_3_REMINDERS_GUIDE.md` | Complete documentation |

---

## ⚠️ Important Notes

✅ **DO:**
- Keep CRON_SECRET secret (don't commit to Git or share publicly)
- Test locally before deploying to production
- Monitor logs to verify reminders are sending
- Set up both local and production CRON_SECRET

❌ **DON'T:**
- Use simple passwords like "123456"
- Share CRON_SECRET in chat, emails, or public repos
- Skip the local testing step
- Forget to add CRON_SECRET to Vercel environment variables

---

## 🔗 Quick Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Easycron:** https://easycron.com/
- **Your App:** https://srisathyasaisevagcf.org
- **Documentation:** See PHASE_3_REMINDERS_GUIDE.md

---

## ❓ Troubleshooting

### Reminders not sending?
1. Check CRON_SECRET matches in `.env.local` and Vercel
2. Verify cron job is actually running (check service logs)
3. Create test activity with `startDate` in next 1 hour
4. Manually trigger endpoint with curl
5. Check `NotificationLog` table for entries

### Getting "Unauthorized" error?
1. Verify X-Cron-Token header matches CRON_SECRET
2. Check for extra spaces or typos in token
3. Ensure header name is exactly `X-Cron-Token` (case-sensitive)

### Vercel says "Method Not Allowed"?
1. Endpoint must be POST (not GET)
2. Check route file exists: `app/api/cron/activity-reminders/route.ts`
3. Verify function is named `export async function POST()`

---

## 📞 Ready?

Once you complete all steps above, let me know and we can move to:
- **Phase 4:** Frontend notification UI components
- **Phase 5:** Full testing & polish

Good luck! 🚀
