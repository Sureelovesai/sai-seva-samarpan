# Vercel environment variables (production)

The app needs these in **Vercel → Project → Settings → Environment Variables** so APIs and login work.

## Apply schema to Neon (fix 500s)

If you see HTTP 500 on login, dashboard, or other pages while centers/services load fine, the **Neon database may be missing tables**. Apply the Prisma schema once:

1. In `apps/web`, create or use a `.env` with your **Neon pooled** URL:
   ```bash
   DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
   ```
2. From the repo root or `apps/web`:
   ```bash
   cd apps/web
   npx prisma db push
   ```
   (Or `npx prisma migrate deploy` if you use migrations.)
3. Redeploy on Vercel. All APIs that use `User`, `RoleAssignment`, `LoggedHours`, etc. should then work.

## Required

| Name           | Description |
|----------------|-------------|
| **DATABASE_URL** | PostgreSQL connection string for production (e.g. from Neon, Supabase, Railway, or your own Postgres). Example: `postgresql://user:password@host:5432/dbname?sslmode=require` **Neon:** Use the **pooled** URL (host has `-pooler`) and add `&connect_timeout=15` so the first request after cold start doesn’t time out. Example: `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require&connect_timeout=15` |

Without `DATABASE_URL`, all API routes that use the database (login, dashboard, etc.) will return **HTTP 500**.

## Recommended for production

| Name        | Description |
|-------------|-------------|
| **JWT_SECRET** | Long random string used to sign session cookies (e.g. `openssl rand -base64 32`). If not set, the app uses a default; set a strong secret in production. |

## Optional

| Name             | Description |
|------------------|-------------|
| CRON_SECRET      | Secret for protecting the cron endpoint `/api/cron/seva-reminders`. |
| NEXT_PUBLIC_EVENT_TIMEZONE | IANA zone (e.g. `America/New_York`) for portal event display and (by default) seva **24h reminder** scheduling (`startDate` + `startTime` interpreted in this zone). |
| SEVA_REMINDER_TIMEZONE | Optional override for reminders only if it must differ from `NEXT_PUBLIC_EVENT_TIMEZONE`. |
| EMAIL_ENABLED    | Set to `true` to enable email. |
| RESEND_API_KEY   | API key for Resend (if using email). |
| EMAIL_FROM       | From address for emails. |

---

After adding or changing variables, **redeploy** (Deployments → ⋮ → Redeploy, or push a commit) so the new env is used.
