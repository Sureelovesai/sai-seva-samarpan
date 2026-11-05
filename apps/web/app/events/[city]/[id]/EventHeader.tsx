"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";
import { useLayoutEffect } from "react";

interface User {
  id: string;
  email: string;
  roles?: string[];
}

export function EventHeader({
  eventId,
  eventTitle,
  city,
}: {
  eventId: string;
  eventTitle: string;
  city: string;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user || null))
      .catch(() => setUser(null));
  }, [mounted]);

  const isAdmin = user?.roles?.includes("ADMIN") || user?.roles?.includes("EVENT_ADMIN");

  async function handleDelete() {
    if (!confirm(`Delete "${eventTitle}"? All sign-ups for this event will be removed.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/portal-events/${encodeURIComponent(eventId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Delete failed");
      }
      router.push(`/events/${city}`);
    } catch (e: unknown) {
      alert((e as Error)?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  // Render empty space on server and before mount to prevent hydration mismatch
  return (
    <div suppressHydrationWarning className="mb-3 flex items-center justify-between gap-2">
      <div className="flex-1" />
      {mounted && isAdmin ? (
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
        >
          <span aria-hidden>🗑</span>
          {deleting ? "Deleting…" : "Delete event"}
        </button>
      ) : null}
    </div>
  );
}
