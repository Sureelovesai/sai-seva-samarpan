"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { inferR2Category, type BlogDriveMediaItem } from "@/lib/blogDriveMedia";

function R2MediaOne({ item }: { item: BlogDriveMediaItem }) {
  const cat = inferR2Category(item.url, item.contentType);
  const title = item.caption || "Uploaded media";

  return (
    <div className="rounded-xl border border-[#e8b4a0] bg-[#fefaf8] p-4">
      {item.caption ? (
        <p className="mb-3 text-sm font-medium text-[#6b5344]">{item.caption}</p>
      ) : null}
      {cat === "image" ? (
        <div className="overflow-hidden rounded-lg bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={title} className="max-h-[70vh] w-full object-contain" loading="lazy" />
        </div>
      ) : null}
      {cat === "video" ? (
        <video
          src={item.url}
          controls
          className="w-full max-w-3xl rounded-lg bg-black"
          preload="metadata"
        />
      ) : null}
      {cat === "audio" ? (
        <audio src={item.url} controls className="w-full max-w-xl" preload="metadata" />
      ) : null}
      {cat === "pdf" ? (
        <div className="aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-lg border border-[#e8b4a0] bg-white">
          <iframe
            src={item.url}
            title={title}
            className="h-full min-h-[320px] w-full border-0"
            loading="lazy"
          />
        </div>
      ) : null}
      {cat === "other" ? (
        <p className="text-sm text-[#7a6b65]">
          This file type is shown as a download link. Open it on a device that supports the format.
        </p>
      ) : null}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-sm font-semibold text-[#8b6b5c] underline hover:text-[#6b5344]"
      >
        Open / download file ↗
      </a>
    </div>
  );
}

export function BlogDriveMediaSection({
  items,
  shareAllMediaUrl,
}: {
  items: BlogDriveMediaItem[];
  /** Full URL to this post’s `#media` section — one link to “open” every upload for this blog. */
  shareAllMediaUrl?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [copied, setCopied] = useState(false);

  const setDetailsOpen = useCallback((open: boolean) => {
    const el = detailsRef.current;
    if (el) el.open = open;
  }, []);

  const copyShare = useCallback(async () => {
    if (!shareAllMediaUrl) return;
    try {
      await navigator.clipboard.writeText(shareAllMediaUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [shareAllMediaUrl]);

  const openMediaInThisTab = useCallback(() => {
    if (!shareAllMediaUrl || typeof window === "undefined") return;
    try {
      const next = new URL(shareAllMediaUrl, window.location.href);
      const cur = new URL(window.location.href);
      const samePage =
        next.pathname === cur.pathname && cur.search === next.search;
      if (samePage) {
        const hash = next.hash || "#media";
        window.history.pushState(null, "", `${cur.pathname}${cur.search}${hash}`);
        setDetailsOpen(true);
        queueMicrotask(() => {
          document.getElementById("media")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      } else {
        window.location.assign(shareAllMediaUrl);
      }
    } catch {
      window.location.assign(shareAllMediaUrl);
    }
  }, [shareAllMediaUrl, setDetailsOpen]);

  const closeGallery = useCallback(() => {
    setDetailsOpen(false);
    if (typeof window === "undefined") return;
    if (window.location.hash === "#media") {
      const u = new URL(window.location.href);
      u.hash = "";
      window.history.replaceState(null, "", `${u.pathname}${u.search}`);
    }
  }, [setDetailsOpen]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#media") {
      setDetailsOpen(true);
    }
  }, [setDetailsOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHashChange = () => {
      if (window.location.hash === "#media") setDetailsOpen(true);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [setDetailsOpen]);

  if (!items.length) return null;

  return (
    <section id="media" className="mt-8 scroll-mt-24 border-t border-[#f8e4e1] pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <details ref={detailsRef} className="group min-w-0 flex-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 pb-3 [&::-webkit-details-marker]:hidden">
            <span className="font-serif text-xl font-semibold text-[#6b5344]">
              More media{" "}
              <span className="text-sm font-normal text-[#8b7368]">({items.length})</span>
            </span>
            <span
              className="shrink-0 select-none text-sm text-[#8b6b5c] transition-transform group-open:rotate-180"
              aria-hidden
            >
              ▼
            </span>
          </summary>
          <div className="mb-3">
            <button
              type="button"
              onClick={closeGallery}
              className="rounded-lg border border-[#d4c4b8] bg-white px-3 py-1 text-xs font-semibold text-[#6b5344] hover:bg-[#fdf2f0]"
            >
              Hide gallery
            </button>
          </div>
          {shareAllMediaUrl ? (
            <p className="mb-4 break-all text-xs text-[#7a6b65] md:text-sm">
              <a
                href={shareAllMediaUrl}
                className="font-medium text-[#8b6b5c] underline decoration-[#c4a89c] underline-offset-2 hover:text-[#6b5344]"
              >
                {shareAllMediaUrl}
              </a>
            </p>
          ) : null}
          <ul className="grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2">
            {items.map((item, i) => (
              <li key={`${item.url}-${i}`} className="min-w-0">
                <R2MediaOne item={item} />
              </li>
            ))}
          </ul>
        </details>

        {shareAllMediaUrl ? (
          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch sm:pt-0.5">
            <button
              type="button"
              onClick={() => openMediaInThisTab()}
              className="rounded-lg border border-[#8b6b5c] bg-[#fdf2f0] px-3 py-1.5 text-left text-xs font-semibold text-[#6b5344] hover:bg-white md:text-sm"
            >
              Open #media
              <span className="mt-0.5 block text-[10px] font-normal text-[#8b7368]">
                This tab · jumps here
              </span>
            </button>
            <button
              type="button"
              onClick={() => void copyShare()}
              className="rounded-lg border border-[#8b6b5c] bg-white px-3 py-1.5 text-xs font-semibold text-[#6b5344] hover:bg-[#fdf2f0] md:text-sm"
            >
              {copied ? "Copied" : "Copy #media link"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
