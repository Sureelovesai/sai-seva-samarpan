import Link from "next/link";
import { AppShell } from "../_components/AppShell";

export default function AdminPage() {
  return (
    <AppShell title="Seva Admin Dashboard" subtitle="Admin tools (UI only for now).">
      <div className="grid gap-3 md:grid-cols-2">
        <Link
          href="/admin/seva/new"
          className="rounded-xl border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <div className="text-base font-semibold">Create / Add Seva</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Add a new seva opportunity.
          </div>
        </Link>

        <Link
          href="/admin/seva/manage"
          className="rounded-xl border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <div className="text-base font-semibold">Manage Seva</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            View/edit existing sevas.
          </div>
        </Link>
      </div>
    </AppShell>
  );
}
