"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { PortalEventForm } from "@/app/admin/_components/PortalEventForm";

export default function AddEventPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-zinc-900">Add Event</h1>
          <Link
            href="/admin/events-dashboard"
            className="text-sm font-semibold text-sky-800 underline hover:no-underline"
          >
            ← Event Admin Dashboard
          </Link>
        </div>
        <PortalEventForm
          mode="create"
          onSaved={({ id }) => router.push(`/admin/manage-events/${id}`)}
        />
      </div>
    </div>
  );
}
