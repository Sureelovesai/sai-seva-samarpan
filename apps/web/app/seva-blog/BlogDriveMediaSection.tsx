"use client";

import {
  driveShareUrlToPresentation,
  type BlogDriveMediaItem,
} from "@/lib/blogDriveMedia";

function BlogDriveMediaOne({ item }: { item: BlogDriveMediaItem }) {
  const pres = driveShareUrlToPresentation(item.url);
  const openHref = pres.mode === "iframe" ? item.url : pres.href;

  return (
    <div className="rounded-xl border border-[#e8b4a0] bg-[#fefaf8] p-4">
      {item.caption ? (
        <p className="mb-3 text-sm font-medium text-[#6b5344]">{item.caption}</p>
      ) : null}
      {pres.mode === "iframe" ? (
        <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-lg bg-black/5">
          <iframe
            src={pres.src}
            className="h-full min-h-[200px] w-full border-0"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            title={item.caption || "Google Drive media"}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <p className="text-sm text-[#7a6b65]">
          This link opens a Drive folder or Google Doc — use the button below to view or play files in
          Google Drive.
        </p>
      )}
      <a
        href={openHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-sm font-semibold text-[#8b6b5c] underline hover:text-[#6b5344]"
      >
        Open in Google Drive / Docs ↗
      </a>
    </div>
  );
}

export function BlogDriveMediaSection({ items }: { items: BlogDriveMediaItem[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-8 border-t border-[#f8e4e1] pt-6">
      <h2 className="font-serif text-xl font-semibold text-[#6b5344]">More media (Google Drive)</h2>
      <p className="mt-1 text-sm text-[#7a6b65]">
        Photos, videos, or audio shared by the author for this story. In Google Drive, set each file to
        <strong> Anyone with the link can view</strong> so readers can open or play them. Only add links
        that belong to this post.
      </p>
      <ul className="mt-4 list-none space-y-6 p-0">
        {items.map((item, i) => (
          <li key={`${item.url}-${i}`}>
            <BlogDriveMediaOne item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
