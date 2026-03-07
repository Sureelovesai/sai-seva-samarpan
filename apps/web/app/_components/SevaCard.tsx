import type { Seva } from "./mockData";

export function SevaCard({
  seva,
  onSelect,
}: {
  seva: Seva;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">{seva.title}</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {seva.location} • {seva.category} • {seva.date}
          </div>
          <div className="mt-2 text-sm">
            Slots available:{" "}
            <span className="font-medium">{seva.slotsAvailable}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelect?.(seva.id)}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
        >
          View
        </button>
      </div>
    </div>
  );
}
