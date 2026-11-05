// ============================================================================
// CODE SNIPPET 1: BlogPostFormModal.tsx - Replace Image Section
// ============================================================================
// Location: BlogPostFormModal.tsx, Lines 783-805
// This section handles the featured image upload and display

// FIND THIS (Current Code):
/*
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
*/

// REPLACE WITH THIS (New Code):
              <div>
                <label className="block text-sm font-medium text-[#6b5344]">
                  Featured Image (optional)
                </label>
                
                {imageUrl && imageUrl !== DEFAULT_PREVIEW_IMAGE ? (
                  <div className="mt-2 space-y-2">
                    {/* Image Preview */}
                    <div className="relative flex min-h-[140px] w-full max-w-sm items-center justify-center overflow-hidden rounded-lg bg-[#f8e4e1]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Featured image preview"
                        className="max-h-40 w-full object-cover"
                      />
                    </div>
                    
                    {/* Action Buttons: Change and Remove */}
                    <div className="flex gap-2">
                      {/* Change Image Button */}
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
                      
                      {/* Remove Image Button */}
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
                    {/* Hidden File Input */}
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

// ============================================================================
// KEY POINTS FOR SNIPPET 1:
// ============================================================================
// 1. Uses existing backdropImageFileInputRef (already exists in component)
// 2. Reuses handleImageChange() function (already exists)
// 3. Shows preview + buttons ONLY when image exists
// 4. Shows file input when NO image or DEFAULT image
// 5. DEFAULT_PREVIEW_IMAGE constant already defined at top of file
// 6. Both buttons disabled during upload (uploading state)
// 7. Change button shows "Uploading…" during upload
// 8. Remove button is red to indicate destructive action
// 9. No confirmation needed for removal (quick action)
// 10. Mobile-responsive (buttons stack on small screens via flex-1)


// ============================================================================
// CODE SNIPPET 2: route.ts - Update API PUT Handler
// ============================================================================
// Location: /api/blog-posts/[id]/route.ts, Lines 238-246
// This section handles saving image URL in the database

// FIND THIS (Current Code):
/*
    if (typeof body.imageUrl === "string") {
      updateData.imageUrl = body.imageUrl.trim();
    }
*/

// REPLACE WITH THIS (New Code):
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

// ============================================================================
// KEY POINTS FOR SNIPPET 2:
// ============================================================================
// 1. Explicitly handles imageUrl: null (for removal)
// 2. Handles empty strings as "no image"
// 3. Still validates URLs aren't empty after trim
// 4. Maintains backward compatibility
// 5. No database changes needed (imageUrl already nullable)
// 6. Works with existing upload endpoint at /api/blog-posts/upload


// ============================================================================
// VERIFICATION: These constants should already exist
// ============================================================================

// Check these are in your file:
// 1. DEFAULT_PREVIEW_IMAGE - defined around line 30
// 2. BACKDROP_IMAGE_ACCEPT - defined around line 37
// 3. backdropImageFileInputRef - useRef at top of component
// 4. handleImageChange() - function already exists
// 5. uploading state - useState already exists

// If any are missing, they're likely available but check context


// ============================================================================
// OPTIONAL: Enhanced Remove with Confirmation (Alternative)
// ============================================================================
// If you want a confirmation dialog before removing, use this instead:

/*
// Add state at top of component:
const [showRemoveImageConfirm, setShowRemoveImageConfirm] = useState(false);

// Then use this for Remove button instead:
<button
  type="button"
  disabled={uploading}
  onClick={() => setShowRemoveImageConfirm(true)}
  className="flex-1 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-wait"
>
  Remove
</button>

{showRemoveImageConfirm && (
  <div className="mt-2 rounded-lg border border-red-300 bg-red-50 p-3">
    <p className="mb-2 text-sm text-red-700">Remove this image? This cannot be undone.</p>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => {
          setImageUrl(DEFAULT_PREVIEW_IMAGE);
          setShowRemoveImageConfirm(false);
        }}
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
*/

// Use this if you want extra safety for users
// Otherwise, the simple Remove button is fine for quick actions
