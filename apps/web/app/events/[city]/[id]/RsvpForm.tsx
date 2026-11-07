"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  GUEST_CAP,
  ZERO_PARTY_MESSAGE,
  guestDraftToApiCount,
  isZeroParty,
  sanitizeGuestCountDraft,
} from "./guestCounts";

interface EventSlot {
  id: string;
  slotName: string;
  slotDate?: Date | string | null;
  startTime: string;
  endTime: string;
  capacity?: number | null;
}

function Req() {
  return (
    <span className="ml-0.5 font-normal text-red-600" aria-hidden>
      *
    </span>
  );
}

export function EventRsvpForm({ eventId, hasSlots = false, slots = [] }: { eventId: string; hasSlots?: boolean; slots?: EventSlot[] }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [accompanyingAdultsDraft, setAccompanyingAdultsDraft] = useState("0");
  const [accompanyingKidsDraft, setAccompanyingKidsDraft] = useState("0");
  const [response, setResponse] = useState<"YES" | "NO" | "MAYBE">("YES");
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [slotGuestData, setSlotGuestData] = useState<Record<string, { adults?: number; kids?: number }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [zeroPartyOpen, setZeroPartyOpen] = useState(false);

  async function loadPreviousByEmail() {
    const em = email.trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError("Enter a valid email first, then click Load previous response.");
      return;
    }
    setError(null);
    setInfo(null);
    setLoadingPrevious(true);
    try {
      const res = await fetch(
        `/api/portal-events/${encodeURIComponent(eventId)}/signup?email=${encodeURIComponent(em)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404) {
          setInfo("No previous response found for this email on this event.");
          return;
        }
        throw new Error(data?.error || "Could not load previous response.");
      }
      setFirstName(typeof data.firstName === "string" ? data.firstName : "");
      setLastName(typeof data.lastName === "string" ? data.lastName : "");
      setEmail(typeof data.email === "string" ? data.email : em);
      setResponse(data.response === "NO" || data.response === "MAYBE" ? data.response : "YES");
      const a = Number.isFinite(Number(data.accompanyingAdults)) ? Math.max(0, Number(data.accompanyingAdults)) : 0;
      const k = Number.isFinite(Number(data.accompanyingKids)) ? Math.max(0, Number(data.accompanyingKids)) : 0;
      setAccompanyingAdultsDraft(String(a));
      setAccompanyingKidsDraft(String(k));
      setComment(typeof data.comment === "string" ? data.comment : "");
      setInfo("Previous response loaded. Update fields and submit to save changes.");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not load previous response.");
    } finally {
      setLoadingPrevious(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setInfo(null);
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      setError("First name and last name are required.");
      return;
    }
    
    // Validate slots selection if slots are enabled
    if (hasSlots && selectedSlotIds.length === 0) {
      setError("Please select at least one time slot.");
      return;
    }
    
    const accompanyingAdults = guestDraftToApiCount(accompanyingAdultsDraft);
    const accompanyingKids = guestDraftToApiCount(accompanyingKidsDraft);
    
    // For non-slot events only: validate zero party
    // Slot events already validate that each slot has guests (adults >= 1 by default)
    // Multi-slot events do NOT need the "enter guest count" dialog since guest counts are per-slot
    if (!hasSlots && isZeroParty(response, accompanyingAdults, accompanyingKids)) {
      setZeroPartyOpen(true);
      return;
    }
    
    // For multi-slot events: validation is already done above (at least one slot selected)
    // No additional dialog needed
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal-events/${encodeURIComponent(eventId)}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: fn,
          lastName: ln,
          email,
          comment: comment.trim() || undefined,
          accompanyingAdults,
          accompanyingKids,
          response,
          slotIds: hasSlots ? selectedSlotIds : undefined,
          slotGuestData: hasSlots ? slotGuestData : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not submit");
      setMessage(typeof data.message === "string" ? data.message : "Thank you!");
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="events-form-surface space-y-5 p-5">
      <p className="text-xs text-slate-600">
        <span className="font-semibold text-red-600">*</span> marks required fields. Other fields are optional.
      </p>

      <div>
        <span className="block text-sm font-semibold text-slate-900">
          Will you attend?
          <Req />
        </span>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          {(["YES", "MAYBE", "NO"] as const).map((r) => (
            <label key={r} className="inline-flex items-center gap-2 font-medium text-slate-800">
              <input
                type="radio"
                name="response"
                value={r}
                checked={response === r}
                onChange={() => setResponse(r)}
                className="h-4 w-4"
              />
              {r === "YES" ? "Yes" : r === "NO" ? "No" : "Maybe"}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-slate-900" htmlFor="evt-first-name">
            First name
            <Req />
          </label>
          <input
            id="evt-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            maxLength={100}
            autoComplete="given-name"
            className="mt-1 w-full rounded-xl border-2 border-fuchsia-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-900" htmlFor="evt-last-name">
            Last name
            <Req />
          </label>
          <input
            id="evt-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            maxLength={100}
            autoComplete="family-name"
            className="mt-1 w-full rounded-xl border-2 border-fuchsia-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-900" htmlFor="evt-email">
          Email
          <Req />
        </label>
        <input
          id="evt-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="mt-1 w-full rounded-xl border-2 border-fuchsia-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300"
        />
        <button
          type="button"
          onClick={loadPreviousByEmail}
          disabled={loadingPrevious || submitting}
          className="mt-2 text-xs font-semibold text-violet-700 underline underline-offset-2 hover:text-violet-800 disabled:opacity-50"
        >
          {loadingPrevious ? "Loading previous response…" : "Load my previous response"}
        </button>
      </div>

      {hasSlots && slots.length > 0 ? (
        <div>
          <span className="block text-sm font-semibold text-slate-900">
            Select time slots you can attend
            <Req />
          </span>
          <p className="mt-0.5 text-xs text-slate-600">
            Choose one or more time slots and specify guests for each.
          </p>
          <div className="mt-3 space-y-4">
            {slots
              .slice()
              .sort((a, b) => {
                // Sort by slotDate first, then by startTime
                const dateA = a.slotDate ? new Date(a.slotDate).getTime() : 0;
                const dateB = b.slotDate ? new Date(b.slotDate).getTime() : 0;
                if (dateA !== dateB) return dateA - dateB;
                // If same date, sort by startTime
                return a.startTime.localeCompare(b.startTime);
              })
              .map((slot) => (
              <div key={slot.id} className="rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={selectedSlotIds.includes(slot.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSlotIds([...selectedSlotIds, slot.id]);
                        // Initialize with undefined for both (allows empty input fields)
                        if (!slotGuestData[slot.id]) {
                          setSlotGuestData({
                            ...slotGuestData,
                            [slot.id]: { adults: undefined, kids: undefined },
                          });
                        }
                      } else {
                        setSelectedSlotIds(selectedSlotIds.filter((id) => id !== slot.id));
                        const newData = { ...slotGuestData };
                        delete newData[slot.id];
                        setSlotGuestData(newData);
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{slot.slotName}</p>
                    <p className="text-xs text-slate-600" suppressHydrationWarning>
                      {slot.slotDate && (
                        <>
                          {(() => {
                            try {
                              if (!slot.slotDate) return '';
                              // Parse UTC datetime and extract date correctly
                              const dateStr = typeof slot.slotDate === 'string' ? slot.slotDate : slot.slotDate.toISOString();
                              const d = new Date(dateStr);
                              // Use UTC getters to avoid timezone shift
                              const year = d.getUTCFullYear();
                              const month = d.getUTCMonth();
                              const day = d.getUTCDate();
                              // Use deterministic month names instead of toLocaleDateString to avoid hydration mismatch
                              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                              return `${monthNames[month]} ${day}`;
                            } catch {
                              return '';
                            }
                          })()} · 
                        </>
                      )}
                      {slot.startTime} - {slot.endTime}
                      {slot.capacity ? ` (Capacity: ${slot.capacity})` : ""}
                    </p>
                  </div>
                </label>
                
                {selectedSlotIds.includes(slot.id) && (
                  <div className="ml-7 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700 mb-1">
                        Adults
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={GUEST_CAP}
                        inputMode="numeric"
                        value={slotGuestData[slot.id]?.adults === undefined ? "" : (slotGuestData[slot.id]?.adults ?? "")}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const parsed = inputValue === "" ? undefined : parseInt(inputValue, 10);
                          
                          setSlotGuestData({
                            ...slotGuestData,
                            [slot.id]: {
                              ...slotGuestData[slot.id],
                              adults: isNaN(parsed || NaN) ? undefined : Math.max(0, Math.min(GUEST_CAP, parsed || 0)),
                            },
                          });
                        }}
                        onFocus={(e) => {
                          // Select all on focus to allow easy replacement
                          e.target.select();
                        }}
                        placeholder="0"
                        className="w-full rounded-lg border border-fuchsia-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300 [appearance:auto]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700 mb-1">
                        Kids
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={GUEST_CAP}
                        inputMode="numeric"
                        value={slotGuestData[slot.id]?.kids === undefined ? "" : (slotGuestData[slot.id]?.kids ?? "")}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const parsed = inputValue === "" ? undefined : parseInt(inputValue, 10);
                          
                          setSlotGuestData({
                            ...slotGuestData,
                            [slot.id]: {
                              ...slotGuestData[slot.id],
                              kids: isNaN(parsed || NaN) ? undefined : Math.max(0, Math.min(GUEST_CAP, parsed || 0)),
                            },
                          });
                        }}
                        onFocus={(e) => {
                          // Select all on focus to allow easy replacement
                          e.target.select();
                        }}
                        placeholder="0"
                        className="w-full rounded-lg border border-fuchsia-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300 [appearance:auto]"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!hasSlots ? (
        <div>
          <span className="block text-sm font-semibold text-slate-900">Guests accompanying you</span>
          <p className="mt-0.5 text-xs text-slate-600">
            Count adults and kids in your full group (including yourself).
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:gap-6">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700" htmlFor="evt-adults">
                Adults
              </label>
              <input
                id="evt-adults"
                type="number"
                min={0}
                max={GUEST_CAP}
                step={1}
                inputMode="numeric"
                autoComplete="off"
                aria-label="Adults guest count"
                value={accompanyingAdultsDraft}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") setAccompanyingAdultsDraft("");
                  else setAccompanyingAdultsDraft(sanitizeGuestCountDraft(v));
                }}
                onBlur={() =>
                  setAccompanyingAdultsDraft((d) => (d.trim() === "" ? "0" : sanitizeGuestCountDraft(d)))
                }
                className="mt-1 w-full max-w-[11rem] rounded-xl border-2 border-fuchsia-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300 sm:max-w-none [appearance:auto]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700" htmlFor="evt-kids">
                Kids
              </label>
              <input
                id="evt-kids"
                type="number"
                min={0}
                max={GUEST_CAP}
                step={1}
                inputMode="numeric"
                autoComplete="off"
                aria-label="Kids guest count"
                value={accompanyingKidsDraft}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") setAccompanyingKidsDraft("");
                  else setAccompanyingKidsDraft(sanitizeGuestCountDraft(v));
                }}
                onBlur={() =>
                  setAccompanyingKidsDraft((d) => (d.trim() === "" ? "0" : sanitizeGuestCountDraft(d)))
                }
                className="mt-1 w-full max-w-[11rem] rounded-xl border-2 border-fuchsia-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300 sm:max-w-none [appearance:auto]"
              />
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-semibold text-slate-900" htmlFor="evt-comment">
          Comments or notes
        </label>
        <p className="mt-0.5 text-xs text-slate-600">
          Dietary needs, accessibility, or other notes for organizers (shown on the attendance list).
        </p>
        <textarea
          id="evt-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1 w-full rounded-xl border-2 border-fuchsia-200/80 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-300"
        />
        <p className="mt-1 text-right text-xs text-slate-500">{comment.length}/500</p>
      </div>

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      {info ? <p className="text-sm font-medium text-sky-800">{info}</p> : null}
      {message ? (
        <p className="text-sm font-bold text-emerald-800">
          {message} Need to edit your response? Update any field and submit again.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-300/50 transition hover:from-fuchsia-700 hover:to-violet-700 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit response"}
      </button>

      {zeroPartyOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="zero-party-title"
        >
          <div className="w-full max-w-sm rounded-2xl border-2 border-fuchsia-200 bg-white p-6 shadow-xl">
            <h3 id="zero-party-title" className="text-lg font-bold text-slate-900">
              How many are coming?
            </h3>
            <p className="mt-2 text-sm text-slate-700">{ZERO_PARTY_MESSAGE}</p>
            <button
              type="button"
              autoFocus
              onClick={() => {
                setZeroPartyOpen(false);
                document.getElementById("evt-adults")?.focus();
              }}
              className="mt-5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-300/50 transition hover:from-fuchsia-700 hover:to-violet-700"
            >
              OK, enter a number
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
