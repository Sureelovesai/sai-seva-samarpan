# 🔍 Root Cause: Why Coordinators Can't See Edit Button for Their Posts

## The Real Problem

The API is **NOT returning the `authorId`** to the frontend!

So the frontend:
- ✅ Knows the user is a COORDINATOR
- ❌ **Does NOT know who created the post**
- ❌ Cannot verify if the user is the post author
- ✅ Shows Edit button to ALL Coordinators (wrong!)

## Current Flow

### What The Backend Has (Database Query)
```typescript
// Line 25-32 in /api/blog-posts/[id]/route.ts
const post = await prisma.blogPost.findUnique({
  where: { id },
  include: {
    reactions: true,
    author: { select: { name: true, firstName: true, lastName: true, email: true } },
  },
});
```

**The database has:**
- ✅ `post.authorId` - Who created the post (DATABASE HAS THIS!)
- ✅ `post.author.name` - Author name
- ✅ `post.author.email` - Author email

### What The API Returns (Line 60-80)
```typescript
return NextResponse.json({
  id: post.id,
  title: post.title,
  content: post.content,
  // ... other fields ...
  authorName: post.authorName || ...,  // Returns NAME
  createdAt: post.createdAt,
  // ❌ NO authorId!
});
```

**The API returns:**
- ✅ `authorName` (just the name, not ID)
- ❌ **NOT `authorId`** (THIS IS THE BUG!)

### What Frontend Knows (Line 120-130)
```typescript
useEffect(() => {
  fetch("/api/auth/me", { credentials: "include" })
    .then((data) => {
      const roles = data?.user?.roles || [];
      setCanEditBlog(
        roles.includes("ADMIN") || 
        roles.includes("BLOG_ADMIN") ||
        roles.includes("COORDINATOR")  // Shows Edit for ALL Coordinators!
      );
    })
}, []);
```

**Frontend knows:**
- ✅ Current user's ID (`data?.user?.id`)
- ✅ Current user's roles
- ❌ **NOT the post author ID** (API didn't send it!)

---

## The Fix

We need to:

1. **Add `authorId` to API response** 
   - Modify the API to return `authorId` along with `authorName`

2. **Compare IDs in frontend**
   - Check if `post.authorId === currentUserId`
   - Show Edit button only if user is author OR is Admin/BlogAdmin

---

## Solution - Two Changes

### Change 1: API Route
**File:** `app/api/blog-posts/[id]/route.ts` (Line ~60-80)

**Add authorId to response:**
```typescript
return NextResponse.json({
  id: post.id,
  title: post.title,
  content: post.content,
  articleCanvas: normalizeArticleCanvasPresentation(post.articleCanvas ?? null),
  imageUrl: post.imageUrl,
  driveMediaLinks: normalizeStoredDriveMedia(post.driveMediaLinks),
  section: post.section,
  authorId: post.authorId,  // ADD THIS LINE
  authorName: post.authorName || ...,
  createdAt: post.createdAt,
  likeCount,
  dislikeCount,
  emojiCounts,
  myReaction,
});
```

### Change 2: Frontend Type
**File:** `app/seva-blog/post/[id]/page.tsx` (Line ~20-35)

**Update Post type:**
```typescript
type Post = {
  id: string;
  title: string;
  content: string;
  articleCanvas?: unknown;
  imageUrl: string | null;
  driveMediaLinks?: unknown;
  section: string;
  authorId: string | null;        // ADD THIS LINE
  authorName: string | null;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  emojiCounts: Record<string, number>;
  myReaction: { type: string; emojiCode?: string } | null;
};
```

### Change 3: Frontend Permission Logic
**File:** `app/seva-blog/post/[id]/page.tsx` (Line ~120-135)

**Compare author IDs:**
```typescript
useEffect(() => {
  fetch("/api/auth/me", { credentials: "include" })
    .then((res) => (res.ok ? res.json() : { user: null }))
    .then((data) => {
      const roles: string[] = Array.isArray(data?.user?.roles) ? data.user.roles : [];
      const userId = data?.user?.id;
      
      // Show Edit if:
      // 1. User is Admin/BlogAdmin (can edit any post)
      // 2. User is Coordinator AND created this post (can edit own posts)
      const isAdmin = roles.includes("ADMIN") || roles.includes("BLOG_ADMIN");
      const isAuthor = roles.includes("COORDINATOR") && post?.authorId === userId;
      
      setCanEditBlog(isAdmin || isAuthor);
    })
    .catch(() => setCanEditBlog(false));
}, [post?.authorId]);  // Update dependency
```

---

## Why This Works

### Before Fix:
```
Coordinator views post:
  ✅ Check: Is user COORDINATOR? YES
  ❌ NO WAY TO CHECK: Is user the author?
  ❌ Result: Show Edit button to ALL Coordinators (WRONG!)
```

### After Fix:
```
Coordinator views post:
  ✅ Check: Is user COORDINATOR? YES
  ✅ Check: post.authorId === currentUserId? 
     - YES → Show Edit button ✅
     - NO → Hide Edit button ✅
  ✅ Result: Only show Edit for THEIR OWN posts (CORRECT!)
```

---

## Complete Example

**Scenario: Three Coordinators, One Admin**

| User | Role | Views Post By | Edit Button Shows |
|------|------|-------|-----------|
| Coordinator A | COORDINATOR | Coordinator A | ✅ YES (author) |
| Coordinator B | COORDINATOR | Coordinator A | ❌ NO (not author) |
| Admin | ADMIN | Coordinator A | ✅ YES (is admin) |

---

## How to Identify Posts

**The Solution:** Use `authorId` to match with `currentUserId`

```typescript
// Is this user the post author?
const isPostAuthor = post.authorId === currentUser.id;

// Can they edit?
const canEdit = isAdmin || (isCoordinator && isPostAuthor);
```

---

## Implementation Plan

### Step 1: Update API
```bash
File: app/api/blog-posts/[id]/route.ts
Add: authorId to JSON response
Risk: Very Low (new field, backward compatible)
```

### Step 2: Update Type
```bash
File: app/seva-blog/post/[id]/page.tsx
Add: authorId to Post type
Risk: Very Low (just adds field)
```

### Step 3: Update Permission Logic
```bash
File: app/seva-blog/post/[id]/page.tsx
Update: Comparison logic
Risk: Very Low (clear logic)
```

---

## Summary

**Current Issue:**
- API doesn't return `authorId`
- Frontend can't check who created the post
- Shows Edit button to all Coordinators

**Solution:**
- Return `authorId` from API
- Compare IDs in frontend
- Show Edit only for authors + admins

**Impact:**
- ✅ Coordinators see Edit ONLY for their own posts
- ✅ Admins see Edit for ALL posts
- ✅ Other Coordinators can't edit each other's posts
- ✅ Secure and correct behavior

---

**Ready to implement?** 🚀

