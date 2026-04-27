"use client";

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

export function BlogDriveMediaSection({ items }: { items: BlogDriveMediaItem[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-8 border-t border-[#f8e4e1] pt-6">
      <h2 className="font-serif text-xl font-semibold text-[#6b5344]">More media</h2>
      <p className="mt-1 text-sm text-[#7a6b65]">
        Additional photos, video, audio, and documents for this story (hosted on the portal’s cloud
        storage). Only media intended for this post is listed here.
      </p>
      <ul className="mt-4 list-none space-y-6 p-0">
        {items.map((item, i) => (
          <li key={`${item.url}-${i}`}>
            <R2MediaOne item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
