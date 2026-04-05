"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Partner = {
  id: string;
  organizationName: string;
  logoUrl: string | null;
  description: string | null;
  city: string;
  contactPhone: string | null;
  website: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};

/** Same vertical centering pattern as Find Seva (image column), placed on the right. */
function PartnerLogoCell({ logoUrl, alt }: { logoUrl: string | null | undefined; alt: string }) {
  const src = logoUrl?.trim();
  return (
    <div className="flex h-full min-h-[140px] w-full shrink-0 items-center justify-center overflow-hidden bg-zinc-200 md:w-[180px]">
      <div className="relative aspect-[9/8] w-full max-w-[180px] overflow-hidden">
        {src ? (
          (() => {
            const isRelativeOrBlob =
              src.startsWith("/") || src.includes("blob.vercel-storage.com");
            if (isRelativeOrBlob) {
              return (
                <Image
                  src={src}
                  alt={alt}
                  fill
                  className="object-contain object-center"
                  sizes="180px"
                />
              );
            }
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt}
                className="absolute inset-0 h-full w-full object-contain object-center"
              />
            );
          })()
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-zinc-200 px-2 text-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Logo</span>
            <span className="text-[11px] leading-tight text-zinc-400">Not provided</span>
          </div>
        )}
      </div>
    </div>
  );
}

function websiteHref(url: string | null): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `https://${u}`;
}

function formatListedDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PartnerOrganizationsPage() {
  const [items, setItems] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/community-outreach/partners", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (!c) setItems(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        if (!c) {
          setItems([]);
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((p) => {
      const blob = [p.organizationName, p.city, p.description || "", p.contactPhone || "", p.website || ""]
        .join(" ")
        .toLowerCase();
      return blob.includes(query);
    });
  }, [items, q]);

  return (
    <div className="min-h-screen pt-2 bg-[radial-gradient(circle_at_40%_20%,rgba(255,255,255,0.65),transparent),linear-gradient(90deg,rgba(200,190,230,0.88),rgba(140,180,220,0.82),rgba(200,190,230,0.88))]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-zinc-900 sm:text-4xl">Partner Organizations</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-700">
            Organizations registered through Community Outreach and approved to collaborate. See{" "}
            <Link href="/find-community-activity" className="font-semibold text-indigo-800 underline">
              Find Community Activity
            </Link>{" "}
            for their posted activities.
          </p>
        </div>

        <div className="mx-auto max-w-xl">
          <label className="block text-sm font-semibold text-zinc-800">Search</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, city, phone, website…"
            className="mt-2 w-full border border-zinc-600 bg-white px-4 py-3 text-zinc-900"
          />
        </div>

        <div className="mt-6 text-center text-sm font-semibold text-zinc-800">
          {loading && "Loading…"}
          {error && <span className="text-red-700">{error}</span>}
        </div>

        <ul className="mt-8 space-y-6">
          {filtered.map((p) => {
            const href = websiteHref(p.website);
            const partnerSince = formatListedDate(p.reviewedAt) || formatListedDate(p.submittedAt);
            return (
              <li
                key={p.id}
                className="mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-indigo-900/15 bg-white/80 shadow-[0_10px_25px_rgba(0,0,0,0.18)] backdrop-blur-sm"
              >
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] md:items-stretch">
                  <div className="min-w-0">
                    <div className="border-b border-indigo-900/10 bg-indigo-50/90 px-6 py-4">
                      <h2 className="text-2xl font-bold text-indigo-950">{p.organizationName}</h2>
                      <p className="mt-1 text-sm font-semibold text-indigo-900/80">{p.city}</p>
                    </div>
                    <div className="space-y-4 px-6 py-5 text-zinc-800">
                      {p.description?.trim() ? (
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">About</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{p.description.trim()}</p>
                        </div>
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {p.contactPhone?.trim() ? (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Contact phone</p>
                            <p className="mt-1 text-sm font-medium">
                              <a href={`tel:${p.contactPhone.replace(/\s/g, "")}`} className="text-indigo-800 underline">
                                {p.contactPhone.trim()}
                              </a>
                            </p>
                          </div>
                        ) : null}
                        {href ? (
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Website</p>
                            <p className="mt-1 text-sm font-medium break-all">
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-800 underline">
                                {p.website?.trim()}
                              </a>
                            </p>
                          </div>
                        ) : null}
                      </div>
                      {partnerSince ? (
                        <p className="text-xs text-zinc-500">Partner since {partnerSince}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="border-t border-indigo-900/15 md:border-l md:border-t-0">
                    <PartnerLogoCell logoUrl={p.logoUrl} alt={p.organizationName} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {!loading && !error && filtered.length === 0 && items.length > 0 && (
          <div className="mt-8 rounded-lg bg-white/70 p-6 text-center text-zinc-800">No organizations match your search.</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="mt-8 rounded-lg bg-white/70 p-6 text-center text-zinc-800">
            No approved partner organizations are listed yet. Organizations can register from the{" "}
            <Link href="/community-outreach" className="font-semibold text-indigo-800 underline">
              Community Network
            </Link>{" "}
            page.
          </div>
        )}
      </div>
    </div>
  );
}
