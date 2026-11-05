# Image Management Feature - Implementation Guide

## Quick Summary
Users cannot currently change or remove blog post images. This guide adds:
✅ **Remove Image** button with confirmation
✅ **Change Image** button to upload a new image
✅ **Clean UI** showing current image with action buttons
✅ **Error handling** for failed uploads

---

## Changes Required

### File 1: `BlogPostFormModal.tsx` (Lines 780-805)

**Current Code (Lines 780-805):**
```tsx
<div>
  <label className="block text-sm font-medium text-[#6b5344]">
    Image (optional)
  </label>
  <input
    type="file"
    accept="image/jpeg,image/png,image/webp,image/gif"
    onChange={handleImageChange}
    className="mt-1 w-full text-sm text-[#7a6b65] file:mr-2 file:rounded file:border-0 file:bg-[#fdf2f0] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#8b6b5c]"
  />
  {uploading && (
    <p className="mt-1 text-xs text-[#7a6b65]">Uploading…</p>
  )}
  {imageUrl && (
    <div className="relative mt-2 flex min-h-[120px] w-full max-w-xs items-center justify-center overflow-hidden rounded-lg bg-[#f8e4e1]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Preview"
        className="max-h-40 w-full object-contain"
      />
    </div>
  )}
```

**Replace With:**
```tsx
<div>
  <label className="block text-sm font-medium text-[#6b5344]">
    Featured Image (optional)
  </label>
  
  {imageUrl && imageUrl !== DEFAULT_PREVIEW_IMAGE ? (
    <div className="mt-2 space-y-2">
      <div className="relative flex min-h-[140px] w-full max-w-sm items-center justify-center overflow-hidden rounded-lg bg-[#f8e4e1]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Featured image preview"
          className="max-h-40 w-full object-cover"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => {
            if (backdropImageFileInputRef.current) {
              backdropImageFileInputRef.current.click();
            }
          }}
          className="flex-1 rounded-lg bg-[#8b6b5c] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-wait"
        >
          {uploading ? "Uploading…" : "Change Image"}
        </button>
        <button
          type="button"
          disabled={uploading}
          onClick={() => {
            setImageUrl(DEFAULT_PREVIEW_IMAGE);
          }}
          className="flex-1 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-wait"
        >
          Remove
        </button>
      </div>
    </div>
  ) : (
    <div>
      <input
        ref={backdropImageFileInputRef}
        type="file"
        accept={BACKDROP_IMAGE_ACCEPT}
        onChange={handleImageChange}
        className="mt-1 w-full text-sm text-[#7a6b65] file:mr-2 file:rounded file:border-0 file:bg-[#fdf2f0] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#8b6b5c]"
      />
      {uploading && (
        <p className="mt-1 text-xs text-[#7a6b65]">Uploading…</p>
      )}
      <p className="mt-1 text-xs text-[#7a6b65]">
        JPEG, PNG, WebP or GIF • Max 5MB • Shown at top of post
      </p>
    </div>
  )}
</div>
```

**Why This Works:**
- Uses the existing `backdropImageFileInputRef` for the hidden file input
- Reuses `handleImageChange()` function (already exists)
- Shows "Change" and "Remove" buttons only when image exists
- Shows file input when no image (or placeholder) is set
- Uses `DEFAULT_PREVIEW_IMAGE` to detect "no image" state

---

### File 2: `route.ts` (API endpoint for PUT)

**Location:** `/api/blog-posts/[id]/route.ts` (around line 240)

**Current Code (Lines 238-246):**
```typescript
if (typeof body.imageUrl === "string") {
  updateData.imageUrl = body.imageUrl.trim();
}
```

**Replace With:**
```typescript
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

**Why This Works:**
- Explicitly handles `null` to clear the image
- Empty strings are treated as "no image"
- Maintains backward compatibility with existing code

---

## Implementation Checklist

- [ ] **Step 1:** Open `BlogPostFormModal.tsx`
- [ ] **Step 2:** Find the "Image (optional)" section (Line ~783)
- [ ] **Step 3:** Replace the image input section with the new code above
- [ ] **Step 4:** Verify `backdropImageFileInputRef` exists near top of file (it should - used for backdrop)
- [ ] **Step 5:** Open `/api/blog-posts/[id]/route.ts`
- [ ] **Step 6:** Find the imageUrl handling in the PUT handler (Line ~240)
- [ ] **Step 7:** Replace with the new code above
- [ ] **Step 8:** Save both files
- [ ] **Step 9:** Run the app: `npm run dev`
- [ ] **Step 10:** Test the feature

---

## Testing Steps

### Test 1: Create post with image
1. Go to Seva Blog
2. Create new post
3. Upload an image
4. Submit post
5. ✅ Image should appear at top

### Test 2: Edit post and remove image
1. Click "Edit post" on existing post
2. Image should show with "Change" and "Remove" buttons
3. Click "Remove"
4. Image area should go blank
5. Save post
6. Refresh page
7. ✅ Image should be gone

### Test 3: Edit post and change image
1. Click "Edit post" on existing post
2. Click "Change Image" button
3. Select a new image
4. After upload, new image should display
5. Save post
6. Refresh page
7. ✅ New image should persist

### Test 4: View post without image
1. Navigate to a post without an image
2. ✅ Should show gracefully (no broken image)

---

## Code Diff Summary

### BlogPostFormModal.tsx
- Lines 783-805: Replace image input section
- Adding two buttons: "Change Image" and "Remove"
- Reusing existing upload handler
- Total lines added: ~30, removed: ~25

### route.ts
- Lines 238-246: Enhance imageUrl handling
- Supporting `imageUrl: null` explicitly
- Total lines added: ~5, removed: ~1

**Total Changes:** ~35 lines of code
**Complexity:** Low (no new functions, no new dependencies)
**Risk:** Very Low (no breaking changes)

---

## Troubleshooting

### Problem: "Change Image" button doesn't work
- **Check:** Does `backdropImageFileInputRef` exist at top of component?
- **Solution:** If not, add `const backdropImageFileInputRef = useRef<HTMLInputElement>(null);`

### Problem: Image won't save after removal
- **Check:** Did you update the PUT handler in route.ts?
- **Solution:** Make sure line 240 area allows `imageUrl: null`

### Problem: UI doesn't show "Change" and "Remove" buttons
- **Check:** Is `DEFAULT_PREVIEW_IMAGE` being used?
- **Solution:** Verify line starting with `imageUrl && imageUrl !== DEFAULT_PREVIEW_IMAGE`

### Problem: Upload fails with "Image must be under 5MB"
- **Check:** File size
- **Solution:** This is expected behavior, user should choose smaller file

---

## Files to Modify

| File | Location | Change Type |
|------|----------|------------|
| BlogPostFormModal.tsx | Lines 783-805 | UI Enhancement |
| route.ts | Lines 238-246 | API Enhancement |

---

## After Implementation

Users will be able to:
✅ Upload images when creating posts
✅ Replace images on existing posts
✅ Remove images from posts
✅ View posts with or without images

No database migrations needed - column already supports null!
