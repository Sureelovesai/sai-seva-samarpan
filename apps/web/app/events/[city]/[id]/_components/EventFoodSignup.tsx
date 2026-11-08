"use client";

import { useState, useEffect } from "react";

interface FoodItem {
  id: string;
  name: string;
  category: string;
  neededLabel: string;
  maxQuantity: number;
}

type Props = {
  eventId: string;
  foodItems: FoodItem[];
};

export function EventFoodSignup({ eventId, foodItems }: Props) {
  const [email, setEmail] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!foodItems || foodItems.length === 0) {
    return null;
  }

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

      if (signups.length === 0) {
        setMessage({ type: "error", text: "Please select at least one item to bring" });
        setSubmitting(false);
        return;
      }

      const res = await fetch(`/api/portal-events/${eventId}/food-items/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), signups }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save signups");
      }

      setMessage({ type: "success", text: "✓ Thank you! Your food signup has been saved!" });
      setEmail("");
      setQuantities({});
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to save signups";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-6">
      <h3 className="mb-2 text-lg font-bold text-orange-900">🍽️ Food Sign Up</h3>
      <p className="mb-6 text-sm text-orange-800">
        Volunteers, please sign up to bring items for this event! Let us know how many units you can bring.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email input */}
        <div>
          <label className="block text-sm font-semibold text-orange-900">Your Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="mt-2 w-full rounded border border-orange-300 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Items grid */}
        <div className="space-y-3">
          {foodItems.map((item) => (
            <div key={item.id} className="rounded-lg border border-orange-200 bg-white p-4">
              <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
                {/* Item info */}
                <div className="sm:col-span-4">
                  <p className="font-semibold text-orange-900">{item.name}</p>
                  <p className="text-xs text-orange-700">{item.category}</p>
                </div>

                {/* Needed label */}
                <div className="sm:col-span-4">
                  <p className="text-xs font-semibold text-orange-700">Needed:</p>
                  <p className="text-sm text-orange-900">{item.neededLabel}</p>
                </div>

                {/* Quantity input */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-orange-700 mb-1">
                    You can bring (max {item.maxQuantity}):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={item.maxQuantity}
                    step="1"
                    value={quantities[item.id] || 0}
                    onChange={(e) =>
                      handleQuantityChange(item.id, Math.max(0, Math.min(item.maxQuantity, parseInt(e.target.value) || 0)))
                    }
                    disabled={submitting}
                    className="w-full rounded border border-orange-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                    placeholder="0"
                  />
                </div>
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
          className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Food Signup"}
        </button>
      </form>
    </div>
  );
}
