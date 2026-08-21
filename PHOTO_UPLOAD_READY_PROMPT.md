# Copy-Paste Ready Prompt - Photo Upload Implementation

## Prompt (Ready to Use with Claude/AI)

**Copy everything between the dashed lines and paste into Claude:**

---

I have successfully implemented a photo upload system in my Seva Blog application that allows uploading up to 12 media files per blog post. Each file gets a dynamic shareable URL.

**Current Implementation Details:**
- Backend: `/app/api/blog-posts/upload/route.ts`
- Upload UI: `/app/seva-blog/BlogPostFormModal.tsx` (lines 278-430)
- Display Component: `/app/seva-blog/BlogDriveMediaSection.tsx`
- Media Type Detection: `/lib/blogDriveMedia.ts`

**Storage Stack:**
- Production: Cloudflare R2 + Vercel Blob
- Development: Local filesystem
- Max file size: 4MB per file
- Supported types: Images (JPG/PNG/WebP/GIF), Videos (MP4/WebM), Audio (MP3/WAV), PDF

**What I need:**

I want to implement the same photo upload feature for [YOUR_FEATURE_NAME_HERE]. Please provide complete implementation for:

1. **Backend API** - `/app/api/[your-feature]/upload/route.ts`
   - Handle FormData with file field
   - Validate: 4MB max, allowed MIME types
   - Enforce 12-file limit per entity
   - Upload to R2 (prod) or local filesystem (dev)
   - Return: `{ url: "public-url" }`
   - Use unique folder per entity ID

2. **Upload Component** - `/app/[feature]/[Feature]MediaUploadForm.tsx`
   - File input + drag-and-drop support
   - Display: "X/12 files uploaded"
   - Upload on file selection
   - Show thumbnails
   - Remove file buttons
   - Error & validation messages
   - Loading state

3. **Display Component** - `/app/[feature]/[Feature]MediaSection.tsx`
   - Responsive gallery grid
   - Auto-detect media type:
     - Images: `<img>` with lazy loading
     - Videos: `<video>` with controls
     - Audio: `<audio>` with controls  
     - PDFs: `<iframe>` embed
   - Generate shareable link with #media anchor
   - Copy-to-clipboard button
   - Open/download link per file

4. **Database Schema** (Prisma)
   - Store media URL, MIME type, caption, sort order
   - Link to entity ID

5. **Environment Variables** needed (if any new ones)

Please reference the existing blog implementation for consistency with storage, error handling, and media rendering logic.

---

## Customization Guide

Replace these placeholders:

| Placeholder | Example |
|------------|---------|
| `[YOUR_FEATURE_NAME_HERE]` | "Community Events" or "Seva Gallery" |
| `[your-feature]` | "community-events" (kebab-case) |
| `[Feature]` | "CommunityEvents" (PascalCase) |

## Complete Example

If implementing for "Community Gallery", replace with:
- `[YOUR_FEATURE_NAME_HERE]` → "Community Gallery"
- `[your-feature]` → "community-gallery"
- `[Feature]` → "CommunityGallery"

Result paths:
- `/app/api/community-gallery/upload/route.ts`
- `/app/community-gallery/CommunityGalleryMediaUploadForm.tsx`
- `/app/community-gallery/CommunityGalleryMediaSection.tsx`

---

## After You Get the Response

1. ✅ Create the API endpoint file
2. ✅ Create the upload component
3. ✅ Create the display component
4. ✅ Update your Prisma schema
5. ✅ Add environment variables if needed
6. ✅ Update your feature's main form to include the upload component
7. ✅ Save media URLs to database on form submit
8. ✅ Load and display media on edit
9. ✅ Test locally and in production

---

## Quick Reference - Your Working Code

Your existing implementation in Seva Blog can be used as a reference template:

**Upload Endpoint Pattern:**
```typescript
// File validation
// Size check (4MB)
// MIME type whitelist
// R2 upload with timestamp-random naming
// Return public URL
```

**Upload UI Pattern:**
```typescript
// File input with onChange handler
// Fetch to /api/blog-posts/upload with FormData
// Track uploaded items in state
// Show count: items.length/12
// Display uploaded files as list/grid
```

**Display Pattern:**
```typescript
// Map over media items
// Check contentType to render appropriately
// Display in <details> collapsible section
// Generate shareable URL with #media anchor
// Copy-to-clipboard, open, and download buttons
```

---

## Pro Tips

💡 **Reuse Existing Code:** 95% of your upload endpoint code can be copy-pasted from blog implementation

💡 **CSS:** Match the styling from blog components for consistency

💡 **Testing:** Test with various file sizes, types, and exactly 12 files to hit the limit

💡 **Error Handling:** Include user-friendly messages for:
   - File too large
   - Unsupported file type
   - Hit 12-file limit
   - Upload failed
   - R2 not configured

💡 **Performance:** 
   - Lazy load images
   - Preload video/audio metadata only
   - Responsive images (srcset)

---

## Support

If Claude asks for clarification:
- Share the path to existing files: `/app/seva-blog/BlogPostFormModal.tsx`
- Provide database schema context
- Clarify which feature you're implementing for
- Specify any custom requirements
