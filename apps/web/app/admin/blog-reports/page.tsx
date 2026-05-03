"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { GenerateBlogReportWizard } from "@/app/_components/GenerateBlogReportWizard";

type Row = {
  id: string;
  reportTitle: string | null;
  createdAt: string;
  dateFrom: string;
  dateTo: string;
  centerFilter: string | null;
  regionFilter: string | null;
  sevaCategoryFilter: string | null;
  targetWordCount: number;
  sourcePostCount: number;
};

export default function AdminBlogReportsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/blog-reports", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${res.status}`);
        }
        return data;
      })
      .then((data) => {
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load reports");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-amber-50/40 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-serif text-2xl font-bold text-amber-950 sm:text-3xl">Blog analytics reports</h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/seva-blog#stories"
              className="text-sm font-semibold text-amber-900 underline hover:no-underline"
            >
              ← Seva Blog
            </Link>
            <Link
              href="/admin/seva-dashboard"
              className="text-sm font-semibold text-amber-900 underline hover:no-underline"
            >
              ← Admin dashboard
            </Link>
          </div>
        </div>

        <section className="mb-10 rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-amber-950">Generate a new report</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Three steps: pick stories, add optional instructions, review and generate.
          </p>
          <div className="mt-4">
            <GenerateBlogReportWizard
              onSuccess={(reportId) => {
                load();
                router.push(`/blog-reports/${reportId}?from=admin`);
                router.refresh();
              }}
            />
          </div>
        </section>

        <section className="rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-amber-950">Saved reports</h2>
          {loading ? (
            <p className="mt-4 text-zinc-600">Loading…</p>
          ) : error ? (
            <p className="mt-4 text-red-700">{error}</p>
          ) : rows.length === 0 ? (
            <p className="mt-4 text-zinc-600">No reports yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-amber-100">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900">{r.reportTitle || "Untitled report"}</p>
                    <p className="text-sm text-zinc-600">
                      {r.createdAt.slice(0, 10)} · {r.sourcePostCount} posts · ~{r.targetWordCount} words
                      {r.sevaCategoryFilter ? ` · ${r.sevaCategoryFilter}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/blog-reports/${r.id}?from=admin`}
                    className="shrink-0 rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
