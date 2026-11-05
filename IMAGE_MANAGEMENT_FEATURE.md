# Blog Post Image Management Feature

## Current Situation
- Blog posts have a **featured image** (`imageUrl`) that cannot be changed once set
- Users need the ability to **remove** and **replace** the image
- This is a common UX requirement for blog/content management systems

## What Needs to Be Changed

### 1. **Frontend UI (BlogPostFormModal.tsx)**
Current state: Users select an image during post creation but cannot modify it in edit mode.

**Required Changes:**
- Add a "Remove Image" button next to the image preview
- Add a "Change Image" button to replace the current image
- Show image preview with clear visual states:
  - Default placeholder
  - Uploaded image
  - Loading state during upload
  - Error state

### 2. **API Endpoint (/api/blog-posts/[id]/route.ts)**
Current state: The PUT endpoint accepts `imageUrl` in the body but there's no explicit way to clear it.

**Required Changes:**
- Allow `imageUrl: null` to explicitly clear the image
- Support image upload directly during edit
- Add validation for image URLs

### 3. **Database (Already Supports)**
The Prisma schema already supports `imageUrl` as nullable:
```prisma
imageUrl  String?
```
✅ No schema changes needed!

---

## Implementation Steps

### Step 1: Update BlogPostFormModal.tsx UI

**Add these new features to the image section:**

```typescript
// New state for controlling image operations
const [showRemoveImageConfirm, setShowRemoveImageConfirm] = useState(false);
const [imageOperationLoading, setImageOperationLoading] = useState(false);
const backdropImageFileInputRef = useRef<HTMLInputElement>(null);

// New handler to remove image
async function handleRemoveImage() {
  setImageUrl("");
  setShowRemoveImageConfirm(false);
}

// Enhance handleImageChange to work in edit mode
async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  
  if (!file.type.startsWith("image/")) {
    setError("Please choose an image file (JPEG, PNG, WebP, GIF).");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    setError("Image must be under 5MB.");
    return;
  }
  
  setError(null);
  setImageOperationLoading(true);
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/blog-posts/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.detail
        ? `${data.error}: ${data.detail}`
        : data.error || "Image upload failed.";
      throw new Error(msg);
    }
    setImageUrl(data.url);
  } catch (err) {
    const errMsg = (err as Error).message;
    setError(errMsg);
  } finally {
    setImageOperationLoading(false);
  }
}
```

**Add UI components:**

```tsx
<div className="rounded-lg border border-[#e8b4a0] bg-[#fdf2f0] p-4">
  <label className="mb-2 block text-sm font-semibold text-[#6b5344]">
    Featured Image
  </label>
  
  {imageUrl && imageUrl !== DEFAULT_PREVIEW_IMAGE ? (
    <div className="mb-3 space-y-2">
      <div className="relative h-40 w-full overflow-hidden rounded-lg bg-[#f8e4e1]">
        <img
          src={imageUrl}
          alt="Preview"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={imageOperationLoading}
          onClick={() => {
            if (backdropImageFileInputRef.current) {
              backdropImageFileInputRef.current.click();
            }
          }}
          className="flex-1 rounded-lg bg-[#8b6b5c] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {imageOperationLoading ? "Uploading..." : "Change Image"}
        </button>
        <button
          type="button"
          disabled={imageOperationLoading}
          onClick={() => setShowRemoveImageConfirm(true)}
          className="flex-1 rounded-lg border border-red-400 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Remove Image
        </button>
      </div>
      
      {showRemoveImageConfirm && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3">
          <p className="text-sm text-red-800 mb-2">
            Are you sure you want to remove this image?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleRemoveImage()}
              className="flex-1 rounded bg-red-600 px-2 py-1 text-sm font-semibold text-white hover:bg-red-700"
            >
              Yes, Remove
            </button>
            <button
              type="button"
              onClick={() => setShowRemoveImageConfirm(false)}
              className="flex-1 rounded border border-red-300 bg-white px-2 py-1 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="rounded-lg border-2 border-dashed border-[#e8b4a0] bg-[#f8e4e1] p-4 text-center">
      <button
        type="button"
        onClick={() => {
          if (backdropImageFileInputRef.current) {
            backdropImageFileInputRef.current.click();
          }
        }}
        disabled={imageOperationLoading}
        className="text-[#8b6b5c] hover:underline disabled:opacity-50"
      >
        {imageOperationLoading ? "Uploading..." : "Upload an image"}
      </button>
      <p className="mt-2 text-xs text-[#7a6b65]">
        JPEG, PNG, WebP or GIF • Max 5MB • Recommended: 1200×600px
      </p>
    </div>
  )}
  
  <input
    ref={backdropImageFileInputRef}
    type="file"
    accept={BACKDROP_IMAGE_ACCEPT}
    onChange={handleImageChange}
    className="hidden"
  />
</div>
```

### Step 2: Update API Endpoint

Modify `/api/blog-posts/[id]/route.ts` to better handle image updates:

```typescript
// In PUT handler, enhance imageUrl handling:
if (body.imageUrl !== undefined) {
  // Allow null to remove image, or string to set new URL
  if (body.imageUrl === null) {
    updateData.imageUrl = null;
  } else if (typeof body.imageUrl === "string") {
    const trimmed = body.imageUrl.trim();
    if (trimmed.length === 0) {
      updateData.imageUrl = null;
    } else {
      updateData.imageUrl = trimmed;
    }
  }
}
```

### Step 3: Testing the Feature

**Test Cases:**
1. ✅ Create a post with an image
2. ✅ Edit the post and remove the image
3. ✅ Replace removed image with a new one
4. ✅ Replace existing image with a new image
5. ✅ View post with/without image
6. ✅ Verify image persists after save

**API Testing (using curl or Postman):**
```bash
# Replace image
curl -X PUT http://localhost:3000/api/blog-posts/{id} \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://new-image-url.jpg"}'

# Remove image
curl -X PUT http://localhost:3000/api/blog-posts/{id} \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": null}'
```

---

## File Structure for Changes

```
apps/web/
├── app/
│   ├── seva-blog/
│   │   └── BlogPostFormModal.tsx        ← UPDATE: Add image management UI
│   └── api/
│       └── blog-posts/
│           ├── [id]/route.ts            ← UPDATE: Enhance imageUrl handling
│           └── upload/route.ts          ← No changes needed
└── prisma/
    └── schema.prisma                    ← No changes needed (supports null imageUrl)
```

---

## Benefits of This Implementation

✅ **User-Friendly**: Clear buttons to change or remove images
✅ **No Database Changes**: Already supports nullable imageUrl
✅ **No New API**: Uses existing POST `/api/blog-posts/upload` and PUT `[id]`
✅ **Non-Destructive**: Confirmation dialog before removing images
✅ **Fast Iteration**: Upload directly without full form submission
✅ **Consistent**: Matches existing upload patterns

---

## Summary

The feature is **100% achievable** with minimal code changes:
1. Add UI buttons and preview in BlogPostFormModal.tsx
2. Enhance image handling in the PUT API endpoint
3. No database or schema changes required

**Time Estimate**: 2-3 hours for implementation + testing
**Complexity**: Low to Medium
**Risk**: Very Low (no breaking changes)
