"use client";

import { useState } from "react";
import { AppShell } from "../../../_components/AppShell";

export default function AdminCreateSevaPage() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Service");
  const [date, setDate] = useState("2026-02-25");
  const [slots, setSlots] = useState("10");

  return (
    <AppShell title="Create / Add Seva" subtitle="Create a seva (UI only for now).">
      <form
        className="grid gap-3 md:max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          alert("UI only: later this will POST to the API");
        }}
      >
        <div>
          <label className="text-sm font-medium">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Seva title…"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Where…"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="text-sm font-medium">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {["Service", "Teaching", "Cleaning", "Food", "Medical", "Other"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-medium">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-sm font-medium">Slots</label>
            <input
              type="number"
              min={0}
              value={slots}
              onChange={(e) => setSlots(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>

        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900">
          Create Seva
        </button>
      </form>
    </AppShell>
  );
}
