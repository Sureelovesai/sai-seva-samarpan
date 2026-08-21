# Photo Upload Implementation Guide

## Overview
Implement a photo/media upload feature similar to the Seva Blog implementation:
- Up to 12 photos per entity
- Dynamic URLs generated and stored
- Cloudflare R2 (production) + Vercel Blob storage
- Local file system fallback for development
- Support for images, videos, audio, and PDFs

---

## Implementation Prompt for Claude/AI Assistant

### Context
We have successfully implemented a photo upload system in `Seva Blog` that allows users to upload up to 12 media files per blog post. Each file receives a dynamic URL that can be shared and accessed. The implementation uses:

**Production Storage:**
- Cloudflare R2 for cloud storage
- Vercel Blob as fallback
- Dynamic URL generation for sharing

**Development Storage:**
- Local file system (`public/uploads/`)

**Media Types Supported:**
- Images: JPG, PNG, WebP, GIF
- Videos: MP4, WebM
- Audio: MP3, WAV
- Documents: PDF

### Current Implementation Location
- **Upload Handler:** `/app/api/blog-posts/upload/route.ts`
- **UI Component:** `/app/seva-blog/BlogPostFormModal.tsx`
- **Display Component:** `/app/seva-blog/BlogDriveMediaSection.tsx`
- **Media Type Detection:** `/lib/blogDriveMedia.ts`

### What We Need to Implement
We need to implement the same photo upload feature for [TARGET_FEATURE] with the following requirements:

1. **Backend API Endpoint**
   - POST endpoint to handle file uploads
   - Support up to 12 files per entity
   - File validation (type, size, count)
   - Generate dynamic URLs
   - Store in R2 (production) or local filesystem (dev)
   - Return public URLs that can be accessed and shared

2. **Frontend Upload Component**
   - File input accepting multiple files (up to 12 total)
   - Progress indication during upload
   - Display uploaded files with thumbnails
   - Show file count (X/12)
   - Ability to remove uploaded files
   - Error handling and validation messages
   - Support drag-and-drop

3. **Display/Gallery Component**
   - Show uploaded media in a responsive grid
   - Support images, videos, audio, and PDFs
   - Generate shareable link with #anchor to media section
   - Open/download links for each file
   - Copy-to-clipboard functionality for sharing
   - Smooth scroll navigation to media section

4. **Storage Configuration**
   - Use Cloudflare R2 in production (similar to existing R2 setup)
   - Vercel Blob as secondary storage option
   - Local filesystem for development
   - File naming: `{timestamp}-{randomId}.{ext}`
   - Max file size: 4MB per file
   - Unique folder per entity (like blog post ID)

### Key Implementation Details from Existing Code

#### File Accept Types
```
"image/*,video/*,audio/*,.pdf"
```

#### Allowed MIME Types
```
image/jpeg, image/png, image/webp, image/gif, video/mp4, 
video/webm, audio/mpeg, audio/wav, application/pdf
```

#### File Size Limits
- Individual file: 4MB (Vercel serverless limit: 4.5MB)
- Total payload: 4.5MB

#### URL Generation
- Production: `https://r2-bucket-url/media/{filename}` or Vercel Blob URL
- Development: `/uploads/{feature-name}/{filename}`

#### Media Display Logic
- Images: `<img>` tag with lazy loading
- Videos: `<video>` with controls and metadata preload
- Audio: `<audio>` with controls
- PDFs: `<iframe>` for embedded viewing
- Other: Download link

### Step-by-Step Implementation Guide

#### 1. Create Backend API Endpoint
Create `/app/api/{feature}/upload/route.ts` with:
- POST handler for FormData
- File validation (type, size)
- Check 12-file limit
- Upload to R2 with unique folder per entity
- Return public URL

```typescript
// POST /api/{feature}/upload
// Request: FormData with "file" field
// Response: { url: "https://..." } or { error: "..." }
```

#### 2. Create Upload Component
Build a reusable component (`{Feature}MediaUploadForm.tsx`) with:
- File input with drag-drop
- Multiple file selection
- Show count: "X/12"
- Upload on selection
- Display uploaded files
- Remove button per file
- Error messages
- Loading/progress state

#### 3. Create Display Component
Build display component (`{Feature}MediaSection.tsx`) with:
- Responsive grid layout
- Media type detection and appropriate rendering
- Share link with #media anchor
- Copy-to-clipboard
- Open/download links
- Smooth scroll to section

#### 4. Connect to Entity Form
In the entity creation/edit form:
- Include the upload component
- Save returned URLs to database
- Load and display existing media on edit

#### 5. Database Schema
Add to your entity table:
```typescript
// In Prisma schema
{Feature}MediaItems: {
  id: String @id @default(cuid())
  url: String  // Full URL (public)
  caption?: String  // Optional caption
  contentType: String  // MIME type (for display logic)
  sortOrder: Int  // Display order
  createdAt: DateTime @default(now())
}
```

### Environment Configuration
Ensure these are set in `.env`:

```
# For R2 (Production)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket
R2_PUBLIC_URL=https://your-bucket-url

# For Vercel Blob (Alternative)
BLOB_READ_WRITE_TOKEN=your_token

# For Local Storage
NEXT_PUBLIC_UPLOAD_DIR=/uploads/{feature}
```

### Testing Checklist
- [ ] Single file upload works
- [ ] Multiple file upload (up to 12)
- [ ] File size validation (max 4MB)
- [ ] File type validation
- [ ] Drag-and-drop functionality
- [ ] Display in grid layout
- [ ] Play videos/audio with controls
- [ ] View PDFs in iframe
- [ ] Download links work
- [ ] Share link with #anchor works
- [ ] Copy-to-clipboard works
- [ ] Remove uploaded file works
- [ ] Error messages display correctly
- [ ] 12-file limit enforced
- [ ] Works in production (R2)
- [ ] Works in development (local)

### Reference Files to Review
1. `apps/web/app/api/blog-posts/upload/route.ts` - Upload endpoint
2. `apps/web/app/seva-blog/BlogPostFormModal.tsx` - Upload UI (lines 278-430)
3. `apps/web/app/seva-blog/BlogDriveMediaSection.tsx` - Display component
4. `apps/web/lib/blogDriveMedia.ts` - Media type detection

### Troubleshooting
- **R2 not configured:** Falls back to Vercel Blob, then filesystem
- **4MB limit exceeded:** Split large uploads or reduce resolution
- **URLs not accessible:** Check R2 permissions and public bucket settings
- **Media won't display:** Check MIME type detection in `inferR2Category()`

---

## Ready to Implement

### Action Items
1. Choose which feature needs photo upload: [TARGET_FEATURE]
2. Decide if you want R2, Vercel Blob, or both
3. Update database schema to store media URLs
4. Create the API endpoint (copy from blog-posts/upload)
5. Create upload component (adapt from BlogPostFormModal)
6. Create display component (adapt from BlogDriveMediaSection)
7. Connect to feature form
8. Test in dev and production

---

## Optional Enhancements
- Image compression before upload
- Crop/resize before upload
- Reorder media (drag to arrange)
- Add watermarks
- Generate thumbnails
- Add alt-text for images
- Analytics on media views
- CDN caching headers
- Automatic cleanup of old uploads
