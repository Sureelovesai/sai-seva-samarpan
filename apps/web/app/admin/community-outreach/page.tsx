"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ProfileRow = {
  id: string;
  organizationName: string;
  description: string | null;
  city: string;
  contactPhone: string | null;
  website: string | null;
  status: string;
  submittedAt: string;
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
  };
};

function displayName(u: ProfileRow["user"]): string {
  const a = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  if (a) return a;
  if (u.name?.trim()) return u.name.trim();
  return u.email;
}

export default function AdminCommunityOutreachPage() {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { user?: { roles?: string[] } }) => {
        if (cancelled) return;
        const roles = Array.isArray(data?.user?.roles) ? data.user.roles : [];
        setIsAdmin(roles.includes("ADMIN"));
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/community-outreach/profiles?status=PENDING", {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "approve" | "reject") {
    const note =
      action === "reject"
        ? window.prompt("Optional note to include in the email to the submitter:") ?? ""
        : "";
    if (action === "reject" && note === null) return;
    setActing(id);
    try {
      const res = await fetch(`/api/admin/community-outreach/profiles/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewerNote: note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Update failed");
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setActing(null);
    }
  }

  async function removeFromQueue(id: string) {
    if (
      !window.confirm(
        "Remove this pending profile from the queue? The submitter can submit again later. (Admins only.)"
      )
    ) {
      return;
    }
    setActing(id);
    try {
      const res = await fetch(`/api/admin/community-outreach/profiles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900">Community outreach — organization profiles</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Approve or reject profiles submitted from{" "}
        <Link href="/community-outreach" className="text-blue-700 underline">
          Community Outreach
        </Link>
        . Submitters and reviewers are notified by email when{" "}
        <code className="rounded bg-zinc-100 px-1">EMAIL_ENABLED=true</code> is set.
      </p>

      {loading && <p className="mt-8 text-zinc-600">Loading…</p>}
      {err && <p className="mt-8 text-red-700">{err}</p>}

      {!loading && !err && rows.length === 0 && (
        <p className="mt-8 text-zinc-600">No pending profiles.</p>
      )}

      <ul className="mt-8 space-y-6">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-zinc-900">{r.organizationName}</p>
                <p className="text-sm text-zinc-600">
                  {r.city} · Submitted by {displayName(r.user)} ({r.user.email})
                </p>
                {r.contactPhone && (
                  <p className="text-sm text-zinc-600">Phone: {r.contactPhone}</p>
                )}
                {r.website && (
                  <p className="text-sm text-zinc-600">
                    Website:{" "}
                    <a href={r.website} className="text-blue-700 underline" target="_blank" rel="noreferrer">
                      {r.website}
                    </a>
                  </p>
                )}
                {r.description && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-800">{r.description}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={acting === r.id}
                  onClick={() => act(r.id, "approve")}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={acting === r.id}
                  onClick={() => act(r.id, "reject")}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
                >
                  Reject
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={acting === r.id}
                    onClick={() => removeFromQueue(r.id)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-10">
        <Link href="/admin/seva-dashboard" className="text-blue-700 underline">
          ← Seva Admin Dashboard
        </Link>
      </p>
    </div>
  );
}
