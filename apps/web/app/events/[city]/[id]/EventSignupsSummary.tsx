"use client";

import { useState, useEffect } from "react";
import { EditSignupButton } from "./EditSignupButton";
import { DeleteSignupButton } from "./DeleteSignupButton";

type SignupRow = {
  id: string;
  participantName: string;
  email: string;
  comment: string | null;
  response: "YES" | "NO" | "MAYBE";
  accompanyingAdults: number;
  accompanyingKids: number;
  slotGuestData?: Record<string, { adults: number; kids: number }> | null;
};

type EventSlot = {
  id: string;
  slotName: string;
  slotDate?: Date | string | null;
  startTime: string;
  endTime: string;
  capacity?: number | null;
};

type EventItem = {
  id: string;
  name: string;
  category: string;
  neededLabel: string;
  maxQuantity: number;
  slotId: string;
};

function responseLabel(r: SignupRow["response"]) {
  if (r === "YES") return "Yes";
  if (r === "NO") return "No";
  return "Maybe";
}

function partyTotal(r: SignupRow): number {
  if (r.response === "NO") return 0;
  return r.accompanyingAdults + r.accompanyingKids;
}

export function EventSignupsSummary({ eventId, signups, slots = [] }: { eventId: string; signups: SignupRow[]; slots?: EventSlot[] }) {
  const [items, setItems] = useState<EventItem[]>([]);
  const [itemSignups, setItemSignups] = useState<Record<string, number>>({});
  const [loadingItems, setLoadingItems] = useState(false);

  // Fetch items on mount
  useEffect(() => {
    async function fetchItems() {
      try {
        setLoadingItems(true);
        const res = await fetch(`/api/portal-events/${eventId}/items`);
        if (!res.ok) {
          console.error(`Failed to fetch items: ${res.status}`);
          return;
        }
        const data = await res.json();
        
        // Validate data structure
        if (!data || !Array.isArray(data.slots)) {
          console.error("Invalid response structure from items API");
          return;
        }
        
        const allItems: EventItem[] = [];
        for (const slot of data.slots) {
          if (!slot || !Array.isArray(slot.items)) continue;
          for (const item of slot.items) {
            if (!item || !item.id) continue;
            allItems.push({ ...item, slotId: slot.id });
          }
        }
        setItems(allItems);
      } catch (e) {
        console.error("Failed to fetch items:", e instanceof Error ? e.message : String(e));
      } finally {
        setLoadingItems(false);
      }
    }

    if (eventId) {
      fetchItems();
    }
  }, [eventId]);

  // Fetch item signups
  useEffect(() => {
    async function fetchSignups() {
      try {
        const res = await fetch(`/api/portal-events/${eventId}/items/signups`);
        if (!res.ok) {
          console.error(`Failed to fetch item signups: ${res.status}`);
          return;
        }
        const data = await res.json();
        
        // Validate data structure
        if (!data || typeof data.signupsByEmail !== 'object') {
          console.error("Invalid response structure from item signups API");
          return;
        }
        
        // Flatten all item signups: itemId -> total quantity
        const totals: Record<string, number> = {};
        for (const email in data.signupsByEmail) {
          const emailData = data.signupsByEmail[email];
          if (typeof emailData === 'object') {
            for (const itemId in emailData) {
              const qty = Number(emailData[itemId]) || 0;
              totals[itemId] = (totals[itemId] || 0) + qty;
            }
          }
        }
        setItemSignups(totals);
      } catch (e) {
        console.error("Failed to fetch item signups:", e instanceof Error ? e.message : String(e));
      }
    }

    if (eventId && items.length > 0) {
      fetchSignups();
    }
  }, [eventId, items.length]);

  const yes = signups.filter((s) => s.response === "YES").length;
  const no = signups.filter((s) => s.response === "NO").length;
  const maybe = signups.filter((s) => s.response === "MAYBE").length;

  const yesMaybe = signups.filter((s) => s.response === "YES" || s.response === "MAYBE");
  const totalAdults = yesMaybe.reduce((a, s) => a + s.accompanyingAdults, 0);
  const totalKids = yesMaybe.reduce((a, s) => a + s.accompanyingKids, 0);
  const totalParty = yesMaybe.reduce((a, s) => a + partyTotal(s), 0);
  
  // Check if event has slots
  const hasSlots = slots.length > 0;
  
  // Get all slot IDs from the slots array (show ALL slots, not just ones with registrations)
  const allSlotIds = slots.map((slot) => slot.id);
  
  // Create a map of slot ID to slot details for quick lookup
  const slotMap = new Map(slots.map((slot) => [slot.id, slot]));

  return (
    <div className="events-attendance-summary border-t-2 border-teal-200 bg-gradient-to-b from-teal-50 to-white px-5 py-8 sm:px-8">
      <h2 className="text-xl font-bold text-slate-900">Attendance summary</h2>
      <p className="mt-1 text-sm text-slate-600">
        Everyone who submitted an RSVP (emails are not shown). <strong className="text-slate-800">Name</strong> is
        first and last name from the sign-up form. Adults and kids include the respondent. Totals count only{" "}
        <strong className="text-slate-800">Yes</strong> and <strong className="text-slate-800">Maybe</strong> responses;{" "}
        <strong className="text-slate-800">No</strong> is shown as 0.
      </p>

      {signups.length === 0 ? (
        <p className="mt-6 rounded-xl border-2 border-dashed border-teal-200 bg-white/80 py-8 text-center text-sm font-medium text-slate-600">
          No sign-ups recorded yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border-2 border-teal-300 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b-2 border-teal-200 bg-teal-100/80">
              <tr>
                <th className="px-3 py-2.5 font-bold text-teal-950">Name</th>
                <th className="px-3 py-2.5 font-bold text-teal-950">Comment</th>
                <th className="px-3 py-2.5 font-bold text-teal-950">Response</th>
                {!hasSlots && (
                  <>
                    <th className="px-3 py-2.5 font-bold text-teal-950">Adults (incl. you)</th>
                    <th className="px-3 py-2.5 font-bold text-teal-950">Kids</th>
                    <th className="px-3 py-2.5 font-bold text-teal-950">Total group</th>
                  </>
                )}
                {hasSlots && allSlotIds.map((slotId) => {
                  const slot = slotMap.get(slotId);
                  const slotLabel = slot?.slotName || `Slot ${slotId.slice(0, 4)}`;
                  return (
                    <th key={slotId} className="px-3 py-2.5 font-bold text-teal-950 whitespace-nowrap">
                      {slotLabel}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {signups.map((s) => (
                <tr key={s.id} className="border-b border-teal-100">
                  <td className="px-3 py-2 font-medium text-slate-900">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span>{s.participantName}</span>
                      <EditSignupButton eventId={eventId} signupId={s.id} participantName={s.participantName} />
                      <DeleteSignupButton eventId={eventId} signupId={s.id} participantName={s.participantName} signupEmail={s.email} />
                    </div>
                  </td>
                  <td className="max-w-[min(18rem,40vw)] px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap break-words">
                    {s.comment?.trim() ? s.comment : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-800">{responseLabel(s.response)}</td>
                  {!hasSlots && (
                    <>
                      <td className="px-3 py-2 tabular-nums text-slate-800">{s.accompanyingAdults}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-800">{s.accompanyingKids}</td>
                      <td className="px-3 py-2 tabular-nums font-semibold text-slate-900">{partyTotal(s)}</td>
                    </>
                  )}
                  {hasSlots && allSlotIds.map((slotId) => {
                    const slotData = s.slotGuestData?.[slotId];
                    return (
                      <td key={slotId} className="px-3 py-2 text-sm text-slate-700 bg-teal-50/50">
                        {slotData ? `${slotData.adults}A, ${slotData.kids}K` : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-teal-50 font-semibold text-slate-900">
                <td className="px-3 py-3" colSpan={hasSlots ? 3 : 6}>
                  Totals · Yes {yes} · No {no} · Maybe {maybe}
                </td>
                {!hasSlots && (
                  <>
                    <td className="px-3 py-3 tabular-nums">{totalAdults}</td>
                    <td className="px-3 py-3 tabular-nums">{totalKids}</td>
                    <td className="px-3 py-3 tabular-nums text-teal-900">{totalParty}</td>
                  </>
                )}
                {hasSlots && allSlotIds.map((slotId) => {
                  const slotTotalAdults = yesMaybe.reduce(
                    (sum, s) => sum + (s.slotGuestData?.[slotId]?.adults || 0),
                    0
                  );
                  const slotTotalKids = yesMaybe.reduce(
                    (sum, s) => sum + (s.slotGuestData?.[slotId]?.kids || 0),
                    0
                  );
                  return (
                    <td key={slotId} className="px-3 py-3 text-sm text-slate-700 bg-teal-100/50">
                      {slotTotalAdults}A, {slotTotalKids}K
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
          <p className="border-t border-teal-100 px-3 py-2 text-xs text-slate-600">
            Adults and kids include the person who submitted the form. Totals include only <strong>Yes</strong> and{" "}
            <strong>Maybe</strong> rows (expected attendance).
          </p>
        </div>
      )}

      {/* TODO: Items summary section - enable later
      {items.length > 0 && !loadingItems && (
        <div className="mt-8 rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
          <h3 className="text-lg font-bold text-amber-950">🎁 Items Volunteers are Bringing</h3>
          <p className="mt-1 text-sm text-amber-800">Summary of items signed up per slot</p>
          
          <div className="mt-4 space-y-4">
            {slots.map((slot) => {
              const slotItems = items.filter((item) => item.slotId === slot.id);
              if (slotItems.length === 0) return null;
              
              return (
                <div key={slot.id} className="rounded-lg border border-amber-200 bg-white p-4">
                  <h4 className="mb-3 font-semibold text-amber-900">{slot.slotName}</h4>
                  <div className="grid gap-2 text-sm">
                    {slotItems.map((item) => {
                      const totalQty = itemSignups[item.id] || 0;
                      const progress = `${totalQty}/${item.maxQuantity}`;
                      const percentFull = Math.round((totalQty / item.maxQuantity) * 100);
                      
                      return (
                        <div key={item.id} className="flex flex-col gap-1">
                          <div className="flex justify-between">
                            <span className="font-medium text-slate-900">{item.name}</span>
                            <span className="text-xs text-slate-600">{progress}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-5 rounded bg-amber-100 overflow-hidden border border-amber-200">
                              <div
                                className="h-full bg-amber-500 transition-all"
                                style={{ width: `${percentFull}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-amber-900 w-12 text-right">
                              {percentFull}%
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">
                            Needed: {item.neededLabel}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      */}
    </div>
  );
}
