# Quick Prompt for Photo Upload Implementation

Use this prompt with Claude/AI to implement photo uploads with dynamic URLs:

---

## Prompt Template

```
I have successfully implemented a photo upload system in my Seva Blog that allows users 
to upload up to 12 media files per blog post with dynamic shareable URLs. 

The implementation uses:
- Cloudflare R2 (production) + Vercel Blob storage
- Local filesystem fallback (development)
- Dynamic URL generation for sharing
- Support for images, videos, audio, and PDFs

Current implementation reference:
- Upload API: /app/api/blog-posts/upload/route.ts
- Upload UI: /app/seva-blog/BlogPostFormModal.tsx (lines 278-430)
- Display: /app/seva-blog/BlogDriveMediaSection.tsx
- Media detection: /lib/blogDriveMedia.ts

I need to implement the same feature for [FEATURE_NAME] with these requirements:

1. Backend API Endpoint at /app/api/[feature]/upload/route.ts
   - Accept FormData with file upload (up to 12 files per entity)
   - File validation: 4MB max, allowed types (images, videos, audio, pdf)
   - Store in R2 (or Vercel Blob in production)
   - Return { url: "public-url" } for each upload
   - Use unique folder per entity ID

2. Frontend Upload Component [Feature]MediaUploadForm.tsx
   - File input with drag-and-drop
   - Show count: "X/12 files"
   - Upload multiple files
   - Display thumbnails of uploaded files
   - Remove file buttons
   - Error messages and validation

3. Display Component [Feature]MediaSection.tsx
   - Responsive grid gallery
   - Detect media type and render appropriately (img, video, audio, iframe for PDF)
   - Generate shareable link with #media anchor
   - Copy-to-clipboard for sharing
   - Open/download links per file

4. Database Integration
   - Store URLs in database
   - Load existing media on edit
   - Support captions/descriptions

Please provide:
- Complete API endpoint code
- Upload component with all features
- Display/gallery component
- Instructions for database schema
- Environment variables needed

Reference the existing blog implementation for consistency.
```

---

## How to Use This Prompt

1. Replace `[FEATURE_NAME]` with your target feature (e.g., "Community Events", "Seva Activities", "Gallery")
2. Copy the entire prompt
3. Paste into Claude/AI
4. Follow the generated implementation
5. Adapt the paths and names to your feature

---

## Key Points to Remember

✅ **Storage**: Cloudflare R2 in prod, Vercel Blob fallback, local filesystem in dev
✅ **Limits**: 12 files max, 4MB per file
✅ **Media Types**: Images (JPG/PNG/WebP/GIF), Videos (MP4/WebM), Audio (MP3/WAV), PDF
✅ **URLs**: Dynamic shareable links with #media anchor
✅ **Reusable**: Copy from blog implementation for consistency

---

## Files to Copy From (Your Existing Implementation)

```
✓ /apps/web/app/api/blog-posts/upload/route.ts
  → Adapt to /app/api/[feature]/upload/route.ts

✓ /apps/web/app/seva-blog/BlogPostFormModal.tsx (upload logic)
  → Adapt to /app/[feature]/[Feature]MediaUploadForm.tsx

✓ /apps/web/app/seva-blog/BlogDriveMediaSection.tsx (display logic)
  → Adapt to /app/[feature]/[Feature]MediaSection.tsx

✓ /apps/web/lib/blogDriveMedia.ts (media type detection)
  → Reuse or reference for media rendering logic
```

---

## Example Usage

If implementing for a "Community Gallery" feature:

```
I need to implement photo uploads for Community Gallery similar to Seva Blog...
[Replace [FEATURE_NAME] with "Community Gallery" in the main prompt above]
```

Then adapt paths:
- API: `/app/api/community-gallery/upload/route.ts`
- Component: `/app/community-gallery/CommunityGalleryMediaUploadForm.tsx`
- Display: `/app/community-gallery/CommunityGalleryMediaSection.tsx`
