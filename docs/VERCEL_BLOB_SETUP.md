# Step-by-step: Enable image upload in production (Vercel Blob)

Follow these steps in the Vercel dashboard so **Upload Activity Image** works in production.

---

## 1. Open your project

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Open the **project** that hosts your app (the one you deploy for production).

---

## 2. Open Storage

1. In the left sidebar, click **Storage** (or **Storage** under your project if you’re already inside the project).
2. If you don’t see it, make sure you’re in the correct team/account and that the project has access to Vercel Blob (available on Pro and other paid plans; check [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for current limits).

---

## 3. Create a new Blob store

1. Click **Create Database** or **Add Storage** (wording may vary).
2. Choose **Blob** (Vercel Blob storage).
3. Click **Continue** (or equivalent).

---

## 4. Name the store and set access

1. **Store name:** Enter a name, e.g. `seva-activity-images` or `app-blob-store`.
2. **Access:** Choose **Public** so activity images can be shown without authentication (our upload API uses `access: 'public'`).
3. Click **Create** (or **Create store**).

---

## 5. Connect the store to your project

1. When asked **“Connect to project”** (or similar), select **your production project**.
2. Choose which **environments** get the token:
   - At least **Production** (required for prod uploads).
   - Optionally **Preview** (so preview deployments can upload too).
3. Confirm. Vercel will add the environment variable **`BLOB_READ_WRITE_TOKEN`** to the selected environments for this project.

---

## 6. Confirm the environment variable

1. In the project, go to **Settings** → **Environment Variables**.
2. Check that **`BLOB_READ_WRITE_TOKEN`** exists for **Production** (and Preview if you added it).
3. If it’s there, you’re done with this step. If **you don’t see it**, use the steps in the next section to add it manually.

---

## 6b. If `BLOB_READ_WRITE_TOKEN` is not in Environment Variables (add it manually)

Sometimes the token is not added to the project automatically. Add it yourself:

### A. Get the token from the Blob store

1. In the Vercel dashboard, go to **Storage** (left sidebar).
2. Click your **Blob store** (the one you created, e.g. `seva-activity-images`).
3. Open the **Settings** or **.** menu for that store.
4. Find the **Token** or **Read-Write Token** section.
5. Click **Reveal** or **Copy** to copy the token value (long string). Keep it secret.

If you don’t see a token there:

- Try **Connect to project** (or **Link project**) on the store page and select your project + **Production** (and **Preview** if you want). Save and check **Settings → Environment Variables** again.
- Or create a new Blob store and when prompted **“Connect to project”**, make sure you select your app and **Production**, then finish the flow.

### B. Add the token to your project

1. Open your **project** (your app), not the store.
2. Go to **Settings** → **Environment Variables**.
3. Click **Add New** (or **Add**).
4. **Name:** `BLOB_READ_WRITE_TOKEN` (exactly).
5. **Value:** paste the token you copied from the store.
6. **Environments:** check **Production** (and **Preview** if you want uploads there). Do **not** check Development unless you want to use the same token locally.
7. Save.
8. **Redeploy** the project (Deployments → … → Redeploy) so the new variable is used.

After this, the upload API will see `BLOB_READ_WRITE_TOKEN` in Production and uploads will work.

---

## 7. Redeploy

1. Go to the **Deployments** tab.
2. Open the **⋯** menu on the latest deployment and click **Redeploy** (or push a new commit to trigger a deploy).
3. Wait for the deployment to finish.

---

## 8. Test in production

1. Open your **production** URL (e.g. `https://your-app.vercel.app`).
2. Log in as an admin and go to **Add Seva Activity**.
3. Click **Upload Activity Image (Optional)** and choose an image (JPEG/PNG/WebP/GIF, max 4MB).
4. The image should upload and the field should show the new image URL. The image will be stored in Vercel Blob and served from a `*.blob.vercel-storage.com` URL.

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| **`BLOB_READ_WRITE_TOKEN` not in Environment Variables** | See **Section 6b** above: get the token from the Blob store (Storage → your store → Settings/Token), then add it manually in the project under Settings → Environment Variables. |
| No **Storage** in sidebar | Confirm your plan includes Blob; check [Vercel Blob](https://vercel.com/docs/storage/vercel-blob). |
| Upload still fails after setup | Ensure you **redeployed** after adding the env var. |
| “Upload failed” / 500 | In Vercel project → **Deployments** → select latest deployment → **Functions** → open the failing request and check logs for the exact error. |
| File too large | Keep images under **4 MB** (Vercel serverless body limit is 4.5 MB). |

---

## Summary

- **Storage** → Create **Blob** store → **Public** → Connect to **your project** (Production + optional Preview) → **Redeploy**.
- The app uses **`BLOB_READ_WRITE_TOKEN`** automatically; no manual copy/paste of the token is needed when using the dashboard connection.
