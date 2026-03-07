"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const ALLOWED_ORIGINS = [
  "https://www.srisathyasaiglobalcouncil.org",
  "https://www.sssgcf.org",
  "https://ssssoindia.org",
];

function isValidUrl(url: string | null): url is string {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return ALLOWED_ORIGINS.some(
      (origin) =>
        parsed.origin === origin ||
        parsed.href === origin ||
        parsed.href.startsWith(origin + "/")
    );
  } catch {
    return false;
  }
}

function ExternalContent() {
  const searchParams = useSearchParams();
  const rawUrl = searchParams.get("url");
  const url = rawUrl ? decodeURIComponent(rawUrl) : null;

  if (!isValidUrl(url)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-center text-zinc-600">This link is not available to view here.</p>
        <Link
          href="/"
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[400px] flex-col">
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-slate-50"
          >
            Open in new tab
          </a>
          <Link
            href="/"
            className="shrink-0 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-slate-50"
          >
            ← Back to site
          </Link>
        </div>
      </div>
      <iframe
        title="External content"
        src={url}
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}

export default function ExternalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-zinc-500">Loading…</p>
        </div>
      }
    >
      <ExternalContent />
    </Suspense>
  );
}
