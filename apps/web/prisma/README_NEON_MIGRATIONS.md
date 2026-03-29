# Prisma migrations with Neon

Neon (serverless Postgres) does not support Prisma's **shadow database** used by `migrate dev`. Use one of these instead:

## Option 1: Apply existing migrations (recommended)

From `apps/web` (with DB reachable):

```bash
npx prisma migrate deploy
npx prisma generate
```

This applies pending migrations to your main DB and does **not** use a shadow database.

## Option 2: Sync schema without migration history

If you only need the schema in sync and don't care about migration history:

```bash
npx prisma db push
npx prisma generate
```

## If you see "Can't reach database server" (P1001)

- **Neon**: Open your [Neon dashboard](https://console.neon.tech) and confirm the project is not paused (Neon pauses inactive projects).
- Ensure your machine can reach the internet and that no firewall blocks outbound PostgreSQL (port 5432).
- Run the command with network access (e.g. allow network in your IDE/terminal).

## Production (Vercel)

1. **Environment variables** on the Vercel project (Production + Preview if those envs use a real DB):
   - `DATABASE_URL` — Neon **pooled** connection string (or any URL your app uses at runtime).
   - `DIRECT_URL` — Neon **direct** connection string (non-pooler host). Strongly recommended so `prisma migrate deploy` does not hit P1017 during build.

2. **Deploy**: push to the branch connected to Production (or run **Promote to Production** in the Vercel dashboard). The web app **`npm run build`** runs `ensure-db-url-and-generate.cjs` without `--generate-only`, so it runs **`prisma migrate deploy`** when `DATABASE_URL` is set, then `prisma generate`, then `next build`. (`postinstall` only runs `prisma generate` so installs do not migrate.)

3. **Opt out of migrate-on-build** (if you only apply migrations manually): set `SKIP_PRISMA_MIGRATE_ON_BUILD=1` in Vercel, then run `npx prisma migrate deploy` from your machine or CI against prod before or after deploy.

4. **First-time / one-off**: you can still apply migrations before shipping code:
   ```bash
   cd apps/web
   npx prisma migrate deploy
   ```
   Use a prod `DATABASE_URL` / `DIRECT_URL` in your shell or `.env` (never commit secrets).
