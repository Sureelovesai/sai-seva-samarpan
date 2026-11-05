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
    </div>
  );
}
