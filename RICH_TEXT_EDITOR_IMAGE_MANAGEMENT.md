# Rich Text Editor - Image Management Enhancement

## 🎯 Problem Analysis

In `RichTextEditor.tsx`, users can:
- ✅ Insert images into the article content
- ✅ Choose image layout (full-width, centered, float-left, float-right)
- ✅ Set width, spacing, and margins
- ❌ **CANNOT remove images after insertion**
- ❌ **CANNOT replace images**
- ❌ **CANNOT edit image properties after insertion**

**Impact:** Users stuck with unwanted images or must delete entire image and re-add it from scratch.

---

## 🔍 Current Code Analysis

### Image Insertion Flow (Works ✅)

```typescript
// Line 490-505: Image gets inserted with placement options
editor.chain()
  .focus()
  .insertContent({
    type: "image",
    attrs: { src: pendingImageSrc, style, alt: "" },
  })
  .run();
```

**Issue:** Images inserted with `alt: ""` (empty) and no way to edit later.

### Current Image Node (Lines 110-119)

```typescript
const BlogImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style as string };
        },
      },
    };
  },
});
```

**Limitation:** Only has `src`, `alt`, and `style`. No edit UI for existing images.

---

## ✨ Solution Overview

### What We Need to Add

1. **Image Selection Detection**
   - Detect when user clicks/selects an image in the editor
   - Show floating toolbar with edit options

2. **Floating Image Toolbar**
   - 🗑️ **Remove** - Delete the image
   - 🔄 **Replace** - Upload new image in place
   - ✏️ **Edit** - Change alt text, layout, sizing
   - 🔗 **Link** - Make image clickable

3. **Image Properties Panel**
   - Alt text input
   - Layout selector (reuse existing options)
   - Width adjuster
   - Spacing controls
   - Alignment options

---

## 🛠️ Implementation Plan

### Phase 1: Add Image Selection Detection

```typescript
// NEW: Add to useEditor effect
useEffect(() => {
  if (!editor || editor.isDestroyed) return;

  const onSelectionUpdate = () => {
    const node = editor.state.selection.$anchor.parent;
    
    // Check if selected node is an image
    if (node.type.name === "image") {
      const imageAttrs = editor.state.selection.$anchor.parent.attrs;
      setSelectedImage({
        src: imageAttrs.src,
        alt: imageAttrs.alt || "",
        style: imageAttrs.style || "",
        position: editor.state.selection.from,
      });
    } else {
      setSelectedImage(null);
    }
  };

  editor.on("selectionUpdate", onSelectionUpdate);
  return () => editor.off("selectionUpdate", onSelectionUpdate);
}, [editor]);
```

### Phase 2: Add State for Selected Image

```typescript
// NEW: Add state variables
const [selectedImage, setSelectedImage] = useState<{
  src: string;
  alt: string;
  style: string;
  position: number;
} | null>(null);

const [imageEditOpen, setImageEditOpen] = useState(false);
const [imageProp_Alt, setImageProp_Alt] = useState("");
const [imageProp_Layout, setImageProp_Layout] = useState<ImagePlacementLayout>("full");
```

### Phase 3: Add Remove Function

```typescript
// NEW: Remove selected image
const removeSelectedImage = useCallback(() => {
  if (!editor || !selectedImage) return;
  
  editor
    .chain()
    .focus()
    .deleteRange({ from: selectedImage.position, to: selectedImage.position + 1 })
    .run();
  
  setSelectedImage(null);
}, [editor, selectedImage]);
```

### Phase 4: Add Replace Function

```typescript
// NEW: Replace image under cursor
const replaceSelectedImage = useCallback(async (file: File) => {
  if (!editor || !selectedImage) return;
  
  try {
    const url = await uploadOneInlineImage(file);
    
    editor
      .chain()
      .focus()
      .setImageBlockAt(selectedImage.position, { src: url })
      .run();
    
    setSelectedImage(null);
  } catch (err) {
    window.alert(err instanceof Error ? err.message : "Upload failed");
  }
}, [editor, selectedImage, uploadOneInlineImage]);
```

### Phase 5: Render Floating Toolbar

```typescript
// NEW: Floating toolbar when image selected
{selectedImage && (
  <div
    className="absolute z-50 flex gap-1 rounded-lg border border-[#8b7355] bg-white shadow-lg"
    style={{
      // Position near the selected image
      top: `${imageToolbarPos.top}px`,
      left: `${imageToolbarPos.left}px`,
    }}
  >
    <button
      type="button"
      onClick={() => setImageEditOpen(true)}
      title="Edit image properties"
      className="px-2 py-1 hover:bg-[#fdf2f0]"
    >
      ✏️ Edit
    </button>
    
    <button
      type="button"
      onClick={() => {
        replaceImageFileInputRef.current?.click();
      }}
      title="Replace with new image"
      className="px-2 py-1 hover:bg-[#fdf2f0]"
    >
      🔄 Replace
    </button>
    
    <button
      type="button"
      onClick={removeSelectedImage}
      title="Delete image"
      className="px-2 py-1 text-red-600 hover:bg-red-50"
    >
      🗑️ Remove
    </button>
  </div>
)}
```

### Phase 6: Image Edit Panel

```typescript
// NEW: Edit properties modal
{imageEditOpen && selectedImage && (
  <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-md rounded-lg border border-[#d4c4b8] bg-white p-4 shadow-2xl">
      <h3 className="mb-3 text-sm font-bold text-[#4a3f3a]">Edit Image</h3>
      
      {/* Alt Text */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-[#6b5344] mb-1">
          Alt text (for accessibility)
        </label>
        <input
          type="text"
          value={imageProp_Alt}
          onChange={(e) => setImageProp_Alt(e.target.value)}
          placeholder="Describe the image"
          className="w-full rounded border border-[#e8b4a0] px-2 py-1.5 text-sm"
        />
      </div>
      
      {/* Layout */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-[#6b5344] mb-1">
          Layout
        </label>
        <div className="grid grid-cols-2 gap-1">
          {IMAGE_LAYOUT_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`rounded border px-2 py-1 text-xs ${
                imageProp_Layout === id
                  ? "border-[#8b7355] bg-[#fdf2f0]"
                  : "border-[#c4b8a8] bg-white hover:bg-[#faf7f5]"
              }`}
              onClick={() => setImageProp_Layout(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Buttons */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setImageEditOpen(false)}
          className="px-3 py-1.5 border border-[#c4b8a8] rounded text-xs font-semibold hover:bg-[#f5ebe6]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            // Save changes
            updateSelectedImage(imageProp_Alt, imageProp_Layout);
            setImageEditOpen(false);
          }}
          className="px-3 py-1.5 border border-[#8b7355] bg-[#fdf2f0] rounded text-xs font-semibold hover:bg-[#f5ebe6]"
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 📋 Complete Implementation Checklist

- [ ] **Step 1:** Add state variables (selectedImage, imageEditOpen, etc.)
- [ ] **Step 2:** Add image selection detection in editor effects
- [ ] **Step 3:** Add removeSelectedImage function
- [ ] **Step 4:** Add replaceSelectedImage function  
- [ ] **Step 5:** Add updateSelectedImage function
- [ ] **Step 6:** Add floating toolbar JSX
- [ ] **Step 7:** Add edit panel JSX
- [ ] **Step 8:** Add CSS for floating toolbar positioning
- [ ] **Step 9:** Test locally with various images
- [ ] **Step 10:** Test Remove functionality
- [ ] **Step 11:** Test Replace functionality
- [ ] **Step 12:** Test Edit functionality
- [ ] **Step 13:** Deploy

---

## 🎯 User Experience Flow

### Scenario 1: Remove Image

```
1. User clicks image in editor
   ↓
2. Floating toolbar appears with [Edit] [Replace] [Remove] buttons
   ↓
3. User clicks [Remove]
   ↓
4. Image disappears from editor ✓
5. User saves blog post
   ↓
6. Image is gone when post loads ✓
```

### Scenario 2: Replace Image

```
1. User clicks wrong image in editor
   ↓
2. Floating toolbar appears
   ↓
3. User clicks [Replace]
   ↓
4. File picker opens
   ↓
5. User selects new image
   ↓
6. Upload happens
   ↓
7. New image replaces old one in same spot ✓
8. Layout/sizing preserved ✓
```

### Scenario 3: Edit Alt Text

```
1. User clicks image in editor
   ↓
2. Floating toolbar appears
   ↓
3. User clicks [Edit]
   ↓
4. Properties panel opens
   ↓
5. User enters alt text "A sunset over the ocean"
   ↓
6. User clicks [Save]
   ↓
7. Alt text saved to image ✓
8. User saves blog post
   ↓
9. Alt text persists when post loads ✓
```

---

## 🔧 Key Code Locations

| Function | Location | Purpose |
|----------|----------|---------|
| `removeSelectedImage` | NEW | Delete image at cursor |
| `replaceSelectedImage` | NEW | Upload new image in place |
| `updateSelectedImage` | NEW | Update alt text & layout |
| `selectedImage` state | NEW | Track which image is selected |
| Floating toolbar | NEW | Show edit options |
| Image selection detection | Line ~330 (modify effect) | Detect when user clicks image |

---

## 💻 Technical Details

### Using TipTap Commands

```typescript
// Delete: remove image at specific position
editor.chain().deleteRange({ from, to }).run()

// Update: modify image attributes
editor.chain()
  .updateAttributes("image", { alt: newAlt, style: newStyle })
  .run()

// Focus: ensure editor has focus after interaction
editor.chain().focus().run()
```

### Image Attributes Structure

```typescript
{
  src: "https://...",        // Image URL
  alt: "Alt text",           // Accessibility text
  style: "display:block;...", // CSS styling (layout, width, spacing)
}
```

---

## 🧪 Testing Scenarios

### Test 1: Select and Remove Image
1. Add image to article
2. Click the image
3. See floating toolbar
4. Click "Remove"
5. ✅ Image disappears

### Test 2: Replace Image
1. Add image to article
2. Click the image
3. Click "Replace"
4. Upload new image
5. ✅ New image replaces old one
6. ✅ Layout preserved

### Test 3: Edit Alt Text
1. Add image to article
2. Click the image
3. Click "Edit"
4. Enter alt text
5. Click "Save"
6. Save blog post
7. ✅ Alt text persists in database

### Test 4: Multiple Images
1. Add 3 images to article
2. Click middle image
3. Remove it
4. ✅ Only middle image removed
5. ✅ Other two remain

### Test 5: Edit and Save
1. Add image
2. Click and edit alt text
3. Save blog post
4. Edit blog post again
5. ✅ Alt text is still there

---

## 📊 Impact Analysis

| Aspect | Details |
|--------|---------|
| **Lines of Code** | ~400-500 new lines |
| **Files Modified** | 1 (RichTextEditor.tsx) |
| **Database Changes** | 0 (already stores alt text) |
| **Breaking Changes** | 0 (fully backward compatible) |
| **Complexity** | Medium |
| **Risk Level** | Low-Medium |

---

## ✅ Success Criteria

After implementation:
- ✅ Users can click images to select them
- ✅ Floating toolbar appears when image selected
- ✅ Users can remove individual images
- ✅ Users can replace images without deleting
- ✅ Users can edit alt text and layout
- ✅ Changes persist after save
- ✅ No breaking changes to existing images
- ✅ Works on desktop and mobile

---

## 🚀 Next Steps

1. **Understand** this specification
2. **Implement** Phase 1-6 in RichTextEditor.tsx
3. **Test** each scenario locally
4. **Deploy** when ready
5. **Monitor** for issues

---

## 💡 Notes

- This is **different from featured image** management
- This is **different from media gallery** management
- This is specifically for **images inserted into article content**
- Uses existing **TipTap image extension**
- Works with existing **upload endpoint**
- Stores **alt text in database** (already supported)

---

**Status:** Ready for implementation  
**Priority:** High (solves real user problem)  
**Complexity:** Medium (more complex than featured image feature)
