"use client";

export type ContributionRow = {
  id?: string;
  name: string;
  category: string;
  /** Display text e.g. "10 lbs", "5 bottles" */
  neededLabel: string;
  /** Total units / slots volunteers can fill */
  maxQuantity: number;
};

const SUGGESTED_CATEGORIES = [
  "Grains",
  "Essentials",
  "Fresh Produce",
  "Beverages",
  "Utensils",
  "Cleaning",
  "Other",
];

type Props = {
  items: ContributionRow[];
  onChange: (items: ContributionRow[]) => void;
  disabled?: boolean;
};

export function ContributionItemsEditor({ items, onChange, disabled }: Props) {
  function updateRow(index: number, patch: Partial<ContributionRow>) {
    const next = items.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  }

  function addRow() {
    onChange([
      ...items,
      { name: "", category: "", neededLabel: "", maxQuantity: 1 },
    ]);
  }

  function removeRow(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Items volunteers can bring</h3>
          <p className="mt-1 text-sm text-zinc-600">
            Optional list (e.g. potluck, supplies). Set how much is needed; volunteers sign up on the Seva Activities page.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          disabled={disabled}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
        >
          + Add item
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          No items yet. Add rows for things volunteers should bring, with a quantity limit for each.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((row, index) => (
            <div
              key={row.id ?? `new-${index}`}
              className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-12 lg:items-end"
            >
              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold text-zinc-600">Item name *</label>
                <input
                  value={row.name}
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                  disabled={disabled}
                  placeholder="e.g. Rice"
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-zinc-600">Category</label>
                <select
                  value={SUGGESTED_CATEGORIES.includes(row.category) ? row.category : "__custom__"}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__custom__") updateRow(index, { category: "" });
                    else updateRow(index, { category: v });
                  }}
                  disabled={disabled}
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="__custom__">Custom…</option>
                  {SUGGESTED_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {(!row.category || !SUGGESTED_CATEGORIES.includes(row.category)) && (
                  <input
                    value={row.category}
                    onChange={(e) => updateRow(index, { category: e.target.value })}
                    disabled={disabled}
                    placeholder="Type category"
                    className="mt-2 w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                )}
              </div>
              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold text-zinc-600">Needed (label)</label>
                <input
                  value={row.neededLabel}
                  onChange={(e) => updateRow(index, { neededLabel: e.target.value })}
                  disabled={disabled}
                  placeholder='e.g. "10 lbs"'
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-zinc-600">Max units *</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={row.maxQuantity}
                  onChange={(e) =>
                    updateRow(index, {
                      maxQuantity: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                    })
                  }
                  disabled={disabled}
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-0.5 text-[10px] text-zinc-500">Total slots / units</p>
              </div>
              <div className="flex items-end justify-end lg:col-span-2">
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={disabled}
                  className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
