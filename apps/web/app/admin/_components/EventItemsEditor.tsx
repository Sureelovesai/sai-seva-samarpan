"use client";

import { useState } from "react";

export type EventItemRow = {
  id?: string;
  name: string;
  category: string;
  neededLabel: string;
  maxQuantity: number;
};

const SUGGESTED_CATEGORIES = [
  "Food",
  "Beverages",
  "Utensils",
  "Supplies",
  "Decorations",
  "Other",
];

type Props = {
  items: EventItemRow[];
  onChange: (items: EventItemRow[]) => void;
  disabled?: boolean;
  slotName?: string;
};

export function EventItemsEditor({ items, onChange, disabled, slotName }: Props) {
  function updateRow(index: number, patch: Partial<EventItemRow>) {
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
    <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-bold text-blue-900">
            Items for {slotName || "this slot"}
          </h4>
          <p className="mt-1 text-xs text-blue-800">
            Optional list of items volunteers can bring. Set how much is needed.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          disabled={disabled}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
        >
          + Add item
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-blue-300 bg-white px-3 py-4 text-center text-sm text-blue-600">
          No items yet. Add items that volunteers should bring for this slot.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((row, index) => (
            <div
              key={row.id ?? `new-${index}`}
              className="grid gap-2 rounded-lg border border-blue-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end"
            >
              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold text-blue-700">Item name *</label>
                <input
                  value={row.name}
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                  disabled={disabled}
                  placeholder="e.g. Rice"
                  className="mt-1 w-full rounded border border-blue-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-blue-700">Category</label>
                <select
                  value={SUGGESTED_CATEGORIES.includes(row.category) ? row.category : "__custom__"}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "__custom__") updateRow(index, { category: "" });
                    else updateRow(index, { category: v });
                  }}
                  disabled={disabled}
                  className="mt-1 w-full rounded border border-blue-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
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
                    className="mt-1 w-full rounded border border-blue-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold text-blue-700">Needed (label)</label>
                <input
                  value={row.neededLabel}
                  onChange={(e) => updateRow(index, { neededLabel: e.target.value })}
                  disabled={disabled}
                  placeholder='e.g. "10 lbs"'
                  className="mt-1 w-full rounded border border-blue-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-blue-700">Max units *</label>
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
                  className="mt-1 w-full rounded border border-blue-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-0.5 text-[10px] text-blue-600">Total slots / units</p>
              </div>
              <div className="flex items-end justify-end lg:col-span-2">
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={disabled}
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
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
