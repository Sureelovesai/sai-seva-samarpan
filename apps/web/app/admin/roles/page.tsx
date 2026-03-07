"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type RoleAssignment = { id: string; email: string; role: string; cities: string | null };

const ROLES = ["ADMIN", "VOLUNTEER", "SEVA_COORDINATOR"] as const;
const ROLE_LABELS: Record<string, string> = { ADMIN: "Admin", VOLUNTEER: "Volunteer", SEVA_COORDINATOR: "Seva Coordinator" };

export default function RolesPage() {
  const [list, setList] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<(typeof ROLES)[number]>("VOLUNTEER");
  const [addCities, setAddCities] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<(typeof ROLES)[number]>("VOLUNTEER");
  const [editCities, setEditCities] = useState("");
  const [saving, setSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load roles");
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Could not load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setMsg(null);
    setAdding(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail.trim(), role: addRole, cities: addRole === "SEVA_COORDINATOR" ? addCities.trim() || null : null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to add");
      setMsg({ kind: "ok", text: "Role added." });
      setAddEmail("");
      setAddCities("");
      loadRoles();
    } catch (e: unknown) {
      setMsg({ kind: "err", text: (e as Error)?.message ?? "Failed to add role." });
    } finally {
      setAdding(false);
    }
  }

  function startEdit(r: RoleAssignment) {
    setEditingId(r.id);
    setEditEmail(r.email);
    setEditRole(r.role as (typeof ROLES)[number]);
    setEditCities(r.cities ?? "");
  }

  async function saveEdit() {
    if (!editingId) return;
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/roles/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: editEmail.trim(), role: editRole, cities: editRole === "SEVA_COORDINATOR" ? editCities.trim() || null : null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to update");
      setMsg({ kind: "ok", text: "Role updated." });
      setEditingId(null);
      loadRoles();
    } catch (e: unknown) {
      setMsg({ kind: "err", text: (e as Error)?.message ?? "Failed to update." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this role assignment?")) return;
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setMsg({ kind: "ok", text: "Role removed." });
      loadRoles();
    } catch (e: unknown) {
      setMsg({ kind: "err", text: (e as Error)?.message ?? "Failed to delete." });
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_35%_15%,rgba(255,255,255,0.75),rgba(255,255,255,0.0)),linear-gradient(90deg,rgba(90,140,240,0.75),rgba(200,210,235,0.7),rgba(190,170,210,0.75))]">
      <section className="relative left-1/2 w-screen -translate-x-1/2 border-t border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.22)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(95,90,170,0.9),rgba(120,120,140,0.75),rgba(190,180,90,0.75))]" />
        <div className="relative mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-4xl font-extrabold italic tracking-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)] md:text-5xl">Roles</div>
              <div className="mt-2 text-xl font-semibold text-white/95">Who is playing what role — Admin, Volunteer, Seva Coordinator</div>
            </div>
            <Link href="/admin/seva-dashboard" className="rounded border border-white/80 bg-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/30">← Back to Dashboard</Link>
          </div>
        </div>
        <div className="h-1 w-full bg-cyan-300/60" />
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {msg && (
          <div className={`mb-6 rounded px-4 py-3 text-sm font-semibold ${msg.kind === "ok" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{msg.text}</div>
        )}

        <div className="rounded-xl border border-slate-200/90 bg-white px-8 py-8 shadow-[0_10px_25px_rgba(0,0,0,0.18)]">
          <div className="text-2xl font-bold text-zinc-800">Add role assignment</div>
          <form onSubmit={handleAdd} className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div>
              <label className="block text-sm font-semibold text-zinc-700">Email</label>
              <input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="user@example.com" className="mt-1 w-full rounded-none border border-zinc-600 bg-white px-4 py-3 text-zinc-900 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700">Role</label>
              <select value={addRole} onChange={(e) => setAddRole(e.target.value as (typeof ROLES)[number])} className="mt-1 w-full rounded-none border border-zinc-600 bg-white px-4 py-3 text-zinc-900 outline-none">
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700">Cities (Seva Coordinator)</label>
              <input type="text" value={addCities} onChange={(e) => setAddCities(e.target.value)} placeholder="Charlotte, Raleigh" className="mt-1 w-full rounded-none border border-zinc-600 bg-white px-4 py-3 text-zinc-900 outline-none" />
            </div>
            <div>
              <button type="submit" disabled={adding || !addEmail.trim()} className="w-full rounded-none bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{adding ? "Adding…" : "Add"}</button>
            </div>
          </form>
        </div>

        <div className="mt-10 rounded-xl border border-slate-200/90 bg-white px-8 py-8 shadow-[0_10px_25px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-zinc-800">Role assignments</div>
            <button type="button" onClick={() => loadRoles()} disabled={loading} className="rounded border border-zinc-600 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-200 disabled:opacity-60">{loading ? "Loading…" : "Refresh"}</button>
          </div>
          {error && <div className="mt-6 text-center font-semibold text-red-700">{error}</div>}
          {!loading && !error && list.length === 0 && <div className="mt-8 text-center text-zinc-600">No role assignments yet. Add one above.</div>}
          {!loading && list.length > 0 && (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-zinc-300">
                    <th className="py-3 pr-4 font-semibold text-zinc-800">Email</th>
                    <th className="py-3 pr-4 font-semibold text-zinc-800">Role</th>
                    <th className="py-3 pr-4 font-semibold text-zinc-800">Cities</th>
                    <th className="py-3 font-semibold text-zinc-800">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} className="border-b border-zinc-200">
                      {editingId === r.id ? (
                        <>
                          <td className="py-3 pr-4"><input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full rounded border border-zinc-500 px-2 py-1.5 text-zinc-900" /></td>
                          <td className="py-3 pr-4">
                            <select value={editRole} onChange={(e) => setEditRole(e.target.value as (typeof ROLES)[number])} className="rounded border border-zinc-500 px-2 py-1.5 text-zinc-900">
                              {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role] ?? role}</option>)}
                            </select>
                          </td>
                          <td className="py-3 pr-4"><input value={editCities} onChange={(e) => setEditCities(e.target.value)} placeholder="City1, City2" className="w-full rounded border border-zinc-500 px-2 py-1.5 text-zinc-900" /></td>
                          <td className="py-3">
                            <button type="button" onClick={saveEdit} disabled={saving} className="mr-2 font-semibold text-blue-600 hover:underline disabled:opacity-60">Save</button>
                            <button type="button" onClick={() => setEditingId(null)} className="text-zinc-600 hover:underline">Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 pr-4 font-medium text-zinc-800">{r.email}</td>
                          <td className="py-3 pr-4">{ROLE_LABELS[r.role] ?? r.role}</td>
                          <td className="py-3 pr-4 text-zinc-700">{r.cities ?? "—"}</td>
                          <td className="py-3">
                            <button type="button" onClick={() => startEdit(r)} className="mr-3 font-semibold text-blue-600 hover:underline">Edit</button>
                            <button type="button" onClick={() => remove(r.id)} className="font-semibold text-red-600 hover:underline">Remove</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="mt-8 text-center text-sm text-zinc-600">Admin sees everything. Volunteer and Seva Coordinator have restricted access. At login, role is determined by email.</p>
      </div>
    </div>
  );
}
