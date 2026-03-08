# Deploying Changes to Vercel

This guide describes how to get code changes from your machine to production on Vercel (and your custom domain).

---

## Prerequisites

- Git installed and the project cloned (e.g. `c:\Projects\FullStack-app`)
- Vercel project connected to GitHub repo: **Sureelovesai/sai-seva-samarpan**
- Production branch: **main**

---

## Steps to Deploy Changes to Vercel

### 1. Make your code changes

Edit files in the project as needed (e.g. in `apps/web` for the Next.js app).

### 2. Stage changes

From the **project root** (e.g. `c:\Projects\FullStack-app`):

```bash
git add .
```

To stage only specific files:

```bash
git add apps/web/app/page.tsx
```

### 3. Commit

```bash
git commit -m "Short description of what you changed"
```

Examples:

- `git commit -m "Update homepage hero text"`
- `git commit -m "Fix login redirect"`
- `git commit -m "Add new API route for export"`

### 4. Push to GitHub

```bash
git push
```

If your branch is not yet set to track `origin/main`:

```bash
git push -u origin main
```

### 5. Vercel auto-deploys

- Vercel is connected to **Sureelovesai/sai-seva-samarpan**.
- A push to **main** triggers a new deployment automatically.
- Check status: **Vercel Dashboard** → your project → **Deployments**.
- When the deployment shows **Ready**, your changes are live at:
  - **https://fullstack-app-dusky.vercel.app**
  - **https://srisathyasaigcf.org** (if the custom domain is configured)

---

## Quick reference

| Step | Command / action |
|------|-------------------|
| 1. Stage all changes | `git add .` |
| 2. Commit | `git commit -m "Your message"` |
| 3. Push | `git push` |
| 4. Deploy | Automatic on push to `main` |

---

## Optional: Redeploy without code changes

To trigger a new deployment without changing code (e.g. to pick up env var changes):

**From Vercel:**

1. **Dashboard** → your project → **Deployments**.
2. Click the **⋯** on the latest deployment.
3. Click **Redeploy**.

**From Git:**

```bash
git commit -m "Redeploy" --allow-empty
git push
```

---

## Troubleshooting

- **Deployment not starting:** Confirm the push went to **main** and that the repo connected in Vercel is **Sureelovesai/sai-seva-samarpan** (Settings → Git).
- **Build fails:** Check the **Build Logs** for that deployment in Vercel.
- **Site still shows old content:** Wait for the latest deployment to be **Ready**, then hard refresh (Ctrl+Shift+R) or clear cache.
- **Env vars (e.g. DATABASE_URL):** Set in **Vercel** → project → **Settings** → **Environment Variables**, then redeploy.

---

## Related

- **Root directory:** Project is built from **apps/web** (set in Vercel → Settings → General).
- **Custom domain:** **srisathyasaigcf.org** is configured in Vercel → Domains; DNS must point to Vercel for it to work.
