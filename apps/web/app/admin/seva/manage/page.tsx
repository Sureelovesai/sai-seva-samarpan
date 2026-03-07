"use client";

import { useMemo, useState } from "react";
import { AppShell } from "../../../_components/AppShell";
import { mockSevas } from "../../../_components/mockData";

export default function ManageSevaPage() {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    return mockSevas.filter((s) => s.title.toLowerCase().includes(q.toLowerCase()));
  }, [q]);

  return (
    <AppShell title="Manage Seva" subtitle="Edit/delete will be wired to API later.">
      <div className="grid gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search seva…"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm md:w-80 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="text-sm text-zinc-600 dark:text-zinc-400">{rows.length} result(s)</div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr className="text-zinc-600 dark:text-zinc-300">
                <th className="p-3">Title</th>
                <th className="p-3">Date</th>
                <th className="p-3">Location</th>
                <th className="p-3">Category</th>
                <th className="p-3">Slots</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="p-3 font-medium">{s.title}</td>
                  <td className="p-3">{s.date}</td>
                  <td className="p-3">{s.location}</td>
                  <td className="p-3">{s.category}</td>
                  <td className="p-3">{s.slotsAvailable}</td>
                  <td className="p-3 text-right">
                    <button
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                      onClick={() => alert("UI only: edit modal later")}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td className="p-4 text-zinc-600 dark:text-zinc-400" colSpan={6}>
                    No matching seva found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
