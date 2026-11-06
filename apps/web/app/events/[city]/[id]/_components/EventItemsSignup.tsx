"use client";

import { useState, useEffect } from "react";

interface EventItemSignupRow {
  id: string;
  name: string;
  category: string;
  neededLabel: string;
  maxQuantity: number;
  currentSignups: Array<{ email: string; quantity: number }>;
}

interface EventSlotWithItems {
  id: string;
  slotName: string;
  slotDate: string | null;
  startTime: string;
  endTime: string;
  items: EventItemSignupRow[];
}

type Props = {
  eventId: string;
  onSubmitSuccess?: () => void;
};

export function EventItemsSignup({ eventId, onSubmitSuccess }: Props) {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<EventSlotWithItems[]>([]);
  const [email, setEmail] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [existingSignups, setExistingSignups] = useState<Record<string, number>>({});

  // Fetch items on mount
  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await fetch(`/api/portal-events/${eventId}/items`);
        if (!res.ok) throw new Error("Failed to fetch items");
        const data = await res.json();
        setSlots(
          data.slots.map((slot: any) => ({
            ...slot,
            items: slot.items.map((item: any) => ({
              ...item,
              currentSignups: item.signups,
            })),
          }))
        );
      } catch (e) {
        console.error("Failed to fetch items:", e);
        setMessage({ type: "error", text: "Failed to load items" });
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, [eventId]);

  // Load existing signups for email
  useEffect(() => {
    if (!email.trim()) {
      setExistingSignups({});
      setQuantities({});
      return;
    }

    async function fetchExistingSignups() {
      try {
        const res = await fetch(`/api/portal-events/${eventId}/items/signups`);
        if (!res.ok) return;
        const data = await res.json();
        const userSignups = data.signupsByEmail[email] || {};
        setExistingSignups(userSignups);
        setQuantities(userSignups);
      } catch (e) {
        console.error("Failed to fetch existing signups:", e);
      }
    }

    const debounceTimer = setTimeout(fetchExistingSignups, 300);
    return () => clearTimeout(debounceTimer);
  }, [email, eventId]);

  const handleQuantityChange = (itemId: string, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, qty),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setMessage({ type: "error", text: "Email is required" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const signups = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([itemId, quantity]) => ({ itemId, quantity }));

      const res = await fetch(`/api/portal-events/${eventId}/items/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), signups }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save signups");
      }

      setMessage({ type: "success", text: "✓ Items signed up successfully!" });
      setTimeout(() => {
        setMessage(null);
        onSubmitSuccess?.();
      }, 2000);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to save signups";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <p className="text-center text-sm text-amber-800">Loading items...</p>
      </div>
    );
  }

  // Filter slots that have items
  const slotsWithItems = slots.filter((s) => s.items.length > 0);

  if (slotsWithItems.length === 0) {
    return null;
  }

  // Calculate totals per item
  const getTotalSigned = (item: EventItemSignupRow) => {
    return item.currentSignups.reduce((sum, s) => sum + s.quantity, 0);
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
      <h3 className="mb-2 text-lg font-bold text-amber-900">🎁 Items Volunteers Can Bring</h3>
      <p className="mb-6 text-sm text-amber-800">
        Sign up to bring items for the event slots below. Your email helps us organize who's bringing what!
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email input */}
        <div>
          <label className="block text-sm font-semibold text-amber-900">Your Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="mt-2 w-full rounded border border-amber-300 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Items by slot */}
        <div className="space-y-4">
          {slotsWithItems.map((slot) => (
            <div key={slot.id} className="rounded-lg border border-amber-200 bg-white p-4">
              {/* Slot header */}
              <div className="mb-4 pb-3 border-b border-amber-100">
                <h4 className="font-semibold text-amber-900">{slot.slotName}</h4>
                <p className="text-xs text-amber-700">
                  {slot.slotDate && `${new Date(slot.slotDate).toLocaleDateString()} • `}
                  {slot.startTime} - {slot.endTime}
                </p>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {slot.items.map((item) => {
                  const totalSigned = getTotalSigned(item);
                  const available = Math.max(0, item.maxQuantity - totalSigned);
                  const userQty = quantities[item.id] || 0;

                  return (
                    <div key={item.id} className="grid gap-2 rounded border border-amber-100 bg-amber-50 p-3 sm:grid-cols-12 sm:items-center">
                      <div className="sm:col-span-4">
                        <p className="font-semibold text-amber-900">{item.name}</p>
                        <p className="text-xs text-amber-700">{item.category}</p>
                      </div>
                      <div className="sm:col-span-3">
                        <p className="text-xs font-semibold text-amber-700">Needed:</p>
                        <p className="text-sm text-amber-900">{item.neededLabel}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs font-semibold text-amber-700">Progress:</p>
                        <p className="text-sm text-amber-900">
                          {totalSigned}/{item.maxQuantity}
                        </p>
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-xs font-semibold text-amber-700">
                          You bring:
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={userQty}
                          onChange={(e) =>
                            handleQuantityChange(item.id, Math.max(0, parseInt(e.target.value) || 0))
                          }
                          disabled={submitting}
                          className="mt-1 w-full rounded border border-amber-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-lg p-3 text-sm ${
              message.type === "success"
                ? "border border-green-300 bg-green-50 text-green-800"
                : "border border-red-300 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Item Signups"}
        </button>
      </form>
    </div>
  );
}
