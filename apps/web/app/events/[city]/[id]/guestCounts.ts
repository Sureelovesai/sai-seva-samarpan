export const GUEST_CAP = 500;

export type RsvpResponse = "YES" | "NO" | "MAYBE";

/**
 * String draft for controlled `<input type="number">` so users can clear the field and type
 * without sticky 0 / "01" issues; native steppers still work.
 */
export function sanitizeGuestCountDraft(raw: string): string {
  if (raw === "") return "";
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return "";
  return String(Math.min(GUEST_CAP, Math.max(0, n)));
}

export function guestDraftToApiCount(draft: string): number {
  const t = draft.trim();
  if (t === "") return 0;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(GUEST_CAP, Math.max(0, n));
}

/** Adults include the respondent, so a Yes/Maybe with no adults and no kids means nobody is coming. */
export function isZeroParty(response: RsvpResponse, adults: number, kids: number): boolean {
  return response !== "NO" && adults + kids === 0;
}

export const ZERO_PARTY_MESSAGE =
  "Please enter how many people are coming. Adults include you, so a Yes or Maybe needs at least 1 adult or kid.";
