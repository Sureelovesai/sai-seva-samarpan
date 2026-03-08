# Resend Setup: Send Emails to Anyone (Volunteers & Coordinators)

To send emails to **any** volunteer or coordinator (not just your own address), you must **verify your domain** in Resend and use it as the "from" address. Without a verified domain, Resend only allows sending to the account owner's email.

---

## 1. Resend account and API key

1. Go to **[resend.com](https://resend.com)** and sign up or log in.
2. Open **API Keys** (sidebar or [resend.com/api-keys](https://resend.com/api-keys)).
3. Click **Create API Key**. Name it (e.g. "Seva Portal"), copy the key (starts with `re_`).  
   **Save it somewhere safe**; you won’t see it again.

---

## 2. Add and verify your domain in Resend

Resend needs **SPF** and **DKIM** DNS records so it can send on behalf of your domain. A **subdomain** (e.g. `send.srisathyasaigcf.org`) is recommended.

### In Resend

1. Go to **Domains** ([resend.com/domains](https://resend.com/domains)).
2. Click **Add Domain**.
3. Enter your domain:
   - **Option A:** Subdomain: `send.srisathyasaigcf.org` (recommended).
   - **Option B:** Root: `srisathyasaigcf.org` (you can use this if you prefer).
4. Click **Add**. Resend will show the DNS records you need.

### In your DNS provider (where srisathyasaigcf.org is managed)

Resend will show something like:

| Type | Name / Host | Value |
|------|-------------|--------|
| **MX** | `send` (or the subdomain you chose) | e.g. `feedback-smtp.us-east-1.amazonses.com` — **Priority 10** |
| **TXT** (SPF) | `send` | e.g. `v=spf1 include:amazonses.com ~all` |
| **TXT** (DKIM) | `resend._domainkey.send` (or similar) | Long string Resend gives you |

- Add **all** records Resend shows (MX, TXT for SPF, TXT for DKIM).
- For a **subdomain** like `send.srisathyasaigcf.org`, the **Name** is usually `send` (not the full domain).
- Save the records at your DNS provider.

### Verify in Resend

1. Back in Resend → **Domains** → your domain.
2. Click **Verify DNS Records** (or "Verify").
3. Wait a few minutes (up to 48 hours). When status is **Verified**, you can send from that domain.

Resend’s docs: [Managing Domains](https://resend.com/docs/dashboard/domains/introduction). If it doesn’t verify, see [Domain not verifying?](https://resend.com/knowledge-base/what-if-my-domain-is-not-verifying).

---

## 3. Set environment variables

### Local (e.g. `apps/web/.env.local` or project root `.env`)

```env
# Enable sending
EMAIL_ENABLED=true

# Resend API key (from step 1)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx

# From address: use your VERIFIED domain (step 2)
# Subdomain example:
EMAIL_FROM=Seva Portal <noreply@send.srisathyasaigcf.org>
# Or root domain if you verified srisathyasaigcf.org:
# EMAIL_FROM=Seva Portal <noreply@srisathyasaigcf.org>
```

- The **email part** of `EMAIL_FROM` (e.g. `noreply@send.srisathyasaigcf.org`) **must** use the domain you verified in Resend.
- The display name (e.g. "Seva Portal") can be anything.

### Vercel (production)

1. **Vercel** → your project → **Settings** → **Environment Variables**.
2. Add the same variables for **Production** (and **Preview** if you want):
   - `EMAIL_ENABLED` = `true`
   - `RESEND_API_KEY` = your API key
   - `EMAIL_FROM` = `Seva Portal <noreply@send.srisathyasaigcf.org>` (or your verified domain)
3. **Redeploy** so the new env vars are applied.

---

## 4. Quick checklist

| Step | Where | What |
|------|--------|------|
| 1 | Resend → API Keys | Create API key, copy it |
| 2 | Resend → Domains | Add domain (e.g. `send.srisathyasaigcf.org`) |
| 3 | DNS provider for srisathyasaigcf.org | Add MX + TXT (SPF) + TXT (DKIM) from Resend |
| 4 | Resend → Domains | Click Verify; wait until status = Verified |
| 5 | `.env.local` / Vercel env | Set `EMAIL_ENABLED=true`, `RESEND_API_KEY`, `EMAIL_FROM` with verified domain |
| 6 | Vercel | Redeploy if you added env vars there |

---

## 5. Test

- **Join Seva** as a volunteer using **another person’s email** (or a second inbox). They should get the confirmation.
- The **coordinator email** on that activity should get the “new volunteer joined” email.
- Check **Resend → Emails** for delivery status and any errors.

If emails don’t send: confirm domain is **Verified** in Resend, `EMAIL_FROM` uses that exact domain, and `RESEND_API_KEY` is correct in the environment where the app runs.
