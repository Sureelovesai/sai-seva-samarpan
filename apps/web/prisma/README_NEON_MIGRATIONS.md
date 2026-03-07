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
