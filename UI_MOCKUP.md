# UI Mockup - Image Management Feature

## BEFORE (Current State)

```
┌─ Edit Blog Post ─────────────────────────────────┐
│                                                   │
│ Featured Image (optional)                         │
│ ┌─────────────────────────────────────────────┐  │
│ │ File input button                           │  │
│ │ [    Choose File    ]                        │  │
│ └─────────────────────────────────────────────┘  │
│                                                   │
│ (User cannot change or remove image after       │
│  initial upload - PROBLEM!)                      │
│                                                   │
│              [  Save Post  ]                      │
└─────────────────────────────────────────────────┘
```

### Problem:
- Once image is uploaded, there's no way to change it
- No way to remove an unwanted image
- Users stuck with "wrong" image

---

## AFTER (New Feature)

### Scenario 1: No Image Selected
```
┌─ Edit Blog Post ─────────────────────────────────┐
│                                                   │
│ Featured Image (optional)                         │
│ ┌─────────────────────────────────────────────┐  │
│ │ File input button                           │  │
│ │ [    Choose File    ]                        │  │
│ └─────────────────────────────────────────────┘  │
│ JPEG, PNG, WebP or GIF • Max 5MB                 │
│                                                   │
│              [  Save Post  ]                      │
└─────────────────────────────────────────────────┘
```

---

### Scenario 2: Image Selected (New State!)
```
┌─ Edit Blog Post ─────────────────────────────────┐
│                                                   │
│ Featured Image (optional)                         │
│ ┌─────────────────────────────────────────────┐  │
│ │                                             │  │
│ │         [Image Preview]                     │  │
│ │        Shows current image                  │  │
│ │                                             │  │
│ └─────────────────────────────────────────────┘  │
│ ┌──────────────────┬──────────────────┐          │
│ │  Change Image    │  Remove          │          │
│ └──────────────────┴──────────────────┘          │
│                                                   │
│              [  Save Post  ]                      │
└─────────────────────────────────────────────────┘
```

### Features:
- ✅ **Image Preview:** Shows current featured image
- ✅ **Change Image Button:** Opens file selector to replace image
- ✅ **Remove Button:** Clears the image (with quick action, no confirm)
- ✅ **Clean Layout:** Two action buttons side-by-side

---

## User Journey

### Creating a New Post
```
1. User clicks "Create Post" → Sees empty state
   ┌──────────────────────┐
   │ [Choose File...]     │  ← User uploads image
   └──────────────────────┘
   
2. After upload → Shows preview
   ┌──────────────────┐
   │ [Image Preview]  │
   │   [Change][Remove] │  ← Can change mind immediately
   └──────────────────┘
   
3. User clicks Save → Post created with image
```

---

### Editing Existing Post

#### Scenario A: Need to Fix Image
```
1. User edits post with "wrong" image
   ┌──────────────────┐
   │ [Wrong Image]    │
   │   [Change][Remove] │  ← Click Change
   └──────────────────┘
   
2. File picker opens → User selects new image
   ┌──────────────────┐
   │ [Uploading...]   │
   └──────────────────┘
   
3. New image displays
   ┌──────────────────┐
   │ [New Image]      │
   │   [Change][Remove] │  ← Save with new image
   └──────────────────┘
   
4. User saves → Post updated with new image ✓
```

#### Scenario B: Don't Want Image
```
1. User sees current image
   ┌──────────────────┐
   │ [Current Image]  │
   │   [Change][Remove] │  ← Click Remove
   └──────────────────┘
   
2. Image clears → Back to upload state
   ┌──────────────────┐
   │ [Choose File...] │  ← Can upload new one or leave empty
   └──────────────────┘
   
3. User saves → Post updated without image ✓
```

---

## Button States

### Normal State
```
┌──────────────────┬──────────────────┐
│  Change Image    │  Remove          │
└──────────────────┴──────────────────┘
  Background: #8b6b5c (brown)    | Border: red
  Text: white                    | Text: red
  Hover: opacity 90%             | Hover: light red bg
```

### Loading State (During Upload)
```
┌──────────────────┬──────────────────┐
│  Uploading…      │  Remove          │
└──────────────────┴──────────────────┘
  Opacity: 50% (disabled)
  Cursor: wait (loading animation)
```

### Remove Button Hover
```
┌──────────────────┬──────────────────┐
│  Change Image    │  Remove          │
└──────────────────┴──────────────────┘
                      ↑ Light red background
```

---

## Mobile Responsive View

### Mobile (Small Screen)
```
┌──────────────────────┐
│  Featured Image      │
│                      │
│ ┌──────────────────┐ │
│ │ [Image Preview]  │ │
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │  Change Image    │ │
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │  Remove          │ │
│ └──────────────────┘ │
│                      │
└──────────────────────┘
```

Buttons stack vertically on mobile

---

## Error Handling

### Upload Error
```
┌─────────────────────────────────┐
│ Featured Image (optional)       │
│ ┌───────────────────────────────┤
│ │ [Choose File...]              │
│ └───────────────────────────────┘
│ ❌ Image upload failed.          │  ← Error message shown
│    Try a different image.        │
│ JPEG, PNG, WebP or GIF           │
│                                  │
```

### File Too Large
```
❌ Image must be under 5MB.       │
```

### Invalid Format
```
❌ Please choose an image file    │
   (JPEG, PNG, WebP, GIF).        │
```

---

## Comparison: Old vs New

| Feature | Before | After |
|---------|--------|-------|
| Upload image | ✅ | ✅ |
| Change image | ❌ | ✅ NEW |
| Remove image | ❌ | ✅ NEW |
| See preview | ✅ | ✅ |
| Quick actions | ❌ | ✅ NEW |
| Mobile friendly | ✅ | ✅ |
| Error messages | ✅ | ✅ |

---

## Color Scheme

```
Primary Actions (Change):
- Background: #8b6b5c (warm brown)
- Text: white
- Hover: opacity 90%

Destructive Action (Remove):
- Background: white
- Border: #dc2626 (red)
- Text: #dc2626 (red)
- Hover: #fee2e2 (light red bg)

Preview Container:
- Background: #f8e4e1 (light beige)
- Border: #e8b4a0 (tan)
```

---

## Accessibility

✅ Clear button labels
✅ Disabled state indication
✅ Color + text (not just color for red button)
✅ Loading state feedback
✅ Error messages
✅ File input with accept types
✅ Alt text on images

---

## Interaction Flow

```
flowchart TD
    A["Edit Post"] --> B{"Image<br/>Exists?"}
    B -->|Yes| C["Show Preview<br/>+ Buttons"]
    B -->|No| D["Show Upload"]
    
    C --> E["User Action"]
    E -->|Change| F["Open File Picker"]
    E -->|Remove| G["Clear Image"]
    F --> H["Upload File"]
    H --> C
    G --> D
    
    D --> I["User Selects File"]
    I --> H
```

This makes the workflow clear and visual!
