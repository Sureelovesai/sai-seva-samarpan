"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PortalEventForm } from "@/app/admin/_components/PortalEventForm";

export default function AddEventPage() {
  const router = useRouter();
  const [allowedCities, setAllowedCities] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        const user = data?.user;
        // If user has coordinatorCities, filter to those cities; otherwise null (show all)
        if (user?.coordinatorCities && Array.isArray(user.coordinatorCities)) {
          setAllowedCities(user.coordinatorCities);
        } else {
          setAllowedCities(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setAllowedCities(null);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white py-8">
        <div className="mx-auto max-w-4xl px-4">
          <p className="text-center text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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
          allowedCities={allowedCities}
        />
      </div>
    </div>
  );
}
