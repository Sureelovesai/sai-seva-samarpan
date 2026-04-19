/**
 * On-site volunteer headcount for one signup row (aligned with POST /api/seva-signups).
 * `adultsCount` may be 0 when only children participate; missing/null adults defaults to 1.
 */
export function sevaSignupParticipantTotal(signup: {
  adultsCount?: number | null;
  kidsCount?: number | null;
}): number {
  const rawAdults = signup.adultsCount;
  const adults = rawAdults == null ? 1 : Math.max(0, rawAdults);
  const kids = Math.max(0, signup.kidsCount ?? 0);
  return adults + kids;
}
