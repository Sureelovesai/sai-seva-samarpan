# Seva Blog: Use default image for a post (control via database)

When a blog post has an **inappropriate image**, you can switch it to the **default placeholder image** by clearing its `imageUrl` in the database. The Seva Blog list and post page already show the default image when `imageUrl` is null.

---

## Option 1: Update via database (Prisma Studio or SQL)

1. **Prisma Studio** (easiest):
   - From repo root: `npx prisma studio` (or from `apps/web`: `npx prisma studio --schema=./prisma/schema.prisma`).
   - Open the **BlogPost** table.
   - Find the post (e.g. by title or date).
   - Set **imageUrl** to empty / null. Save.

2. **SQL** (if you use a DB client):
   - To clear image for one post by id:
     ```sql
     UPDATE "BlogPost" SET "imageUrl" = NULL WHERE id = 'the-post-id';
     ```
   - To clear by title (use the exact title):
     ```sql
     UPDATE "BlogPost" SET "imageUrl" = NULL WHERE title = 'Exact post title here';
     ```

---

## Option 2: Update via API (Admin only)

As an **Admin** or **Blog Admin**, you can PATCH the post to clear the image:

```http
PATCH /api/admin/blog-posts/{postId}
Content-Type: application/json

{ "imageUrl": null }
```

(Replace `{postId}` with the post’s id.)  
After this, the post will show the **default placeholder image** on the Seva Blog list and on the post page.

---

## Default image

The default image used when `imageUrl` is null is defined in the Seva Blog frontend (see `PLACEHOLDER_IMAGE` in `apps/web/app/seva-blog/page.tsx`). No code change is required to “use the default” for a post—only set `imageUrl` to null in the database or via the API above.
