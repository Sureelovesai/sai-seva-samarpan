"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CITIES } from "@/lib/cities";
import { EventsPageShell } from "./EventsPageShell";

export default function EventsLandingPage() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const handleCitySelect = (cityName: string) => {
    setSelectedCity(cityName);
    router.push(`/events/${cityName.toLowerCase().replace(/\s+/g, "-")}`);
  };

  return (
    <EventsPageShell>
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:pt-14">
        <header className="px-1 py-2 sm:py-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Events Signup
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
            Select your center to view upcoming events in your area.
          </p>
        </header>

        <div className="mt-12">
          <h2 className="mb-6 text-lg font-semibold text-slate-800">
            Choose Your Center
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CITIES.map((cityName) => (
              <button
                key={cityName}
                onClick={() => handleCitySelect(cityName)}
                disabled={selectedCity === cityName}
                className="group relative overflow-hidden rounded-lg border-2 border-sky-300 bg-gradient-to-br from-sky-50 to-cyan-50 px-6 py-4 text-left font-semibold text-slate-900 transition-all hover:border-sky-500 hover:shadow-md hover:cursor-pointer disabled:opacity-70"
              >
                <span className="relative z-10 flex items-center justify-between">
                  {cityName}
                  <span className="ml-2 text-lg transition-transform group-hover:translate-x-1">→</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-sky-100 to-transparent opacity-0 transition-opacity group-hover:opacity-50" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-lg border border-amber-200 bg-amber-50 px-6 py-4">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">Don't see your center?</span> Please contact the admin to add your center to the system.
          </p>
        </div>
      </div>
    </EventsPageShell>
  );
}
