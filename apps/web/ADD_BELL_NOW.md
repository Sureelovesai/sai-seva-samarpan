# ⚡ Quick Action: Add Notification Bell to Header

## 🎯 What You Need to Do

### **Step 1: Find Your Header File**

Search for one of these files in your project:
```
app/_components/SiteHeader.tsx
app/_components/Navigation.tsx
app/components/Header.tsx
app/layout.tsx
```

Or search for where your main navigation/header is defined.

### **Step 2: Add Import**

At the top of the file, add:
```typescript
import { NotificationBell } from "@/app/_components/NotificationBell";
```

### **Step 3: Add to Navigation JSX**

Find where your nav links are, like:
```typescript
<nav className="flex items-center gap-4">
  <Link href="/dashboard">Dashboard</Link>
  <Link href="/activities">Activities</Link>
  {/* ← Add this line below */}
  <NotificationBell />
</nav>
```

### **Step 4: Save and Test**

Reload your page and you should see:
- 🔔 Bell icon in header
- 🔴 Red badge with count (if unread)
- ✨ Clicking goes to notifications page

---

## 📝 Full Example

If you can't find your header, here's a complete example:

```typescript
// app/components/Header.tsx
"use client";

import { NotificationBell } from "@/app/_components/NotificationBell";
import Link from "next/link";

export function Header() {
  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold">
          Sai Seva
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-6">
          <Link href="/activities">Activities</Link>
          <Link href="/dashboard">Dashboard</Link>
          <NotificationBell />  {/* ← Add here */}
        </nav>
      </div>
    </header>
  );
}
```

---

## ✅ Done!

That's all you need to do. Your notification bell will:
- 🔔 Show in the header
- 🔴 Display unread count
- ⏱️ Update every 30 seconds
- 🔗 Link to notifications page

---

**That's it! Just add 2 lines of code! 🚀**
