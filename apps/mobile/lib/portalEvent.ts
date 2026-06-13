import type { EventFormValues } from "@/components/EventForm";
import { emptyEventValues } from "@/components/EventForm";
import type { PortalEventAdmin } from "@/lib/types";

/** Build the POST/PATCH payload for /api/admin/portal-events[/id]. */
export function toEventPayload(v: EventFormValues) {
  const startsAt = new Date(`${v.date}T${v.time}`).toISOString();
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    venue: v.venue.trim(),
    startsAt,
    status: v.status,
    signupsEnabled: v.signupsEnabled,
    heroImageUrl: v.heroImageUrl || null,
    flyerUrl: v.flyerUrl || null,
    organizerEmail: v.organizerEmail.trim() || null,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Map an admin event into form values, splitting startsAt into local date + time. */
export function fromEvent(e: PortalEventAdmin): EventFormValues {
  const base = emptyEventValues();
  const d = new Date(e.startsAt);
  const valid = !Number.isNaN(d.getTime());
  return {
    ...base,
    title: e.title,
    description: e.description,
    venue: e.venue,
    status: e.status,
    signupsEnabled: e.signupsEnabled,
    heroImageUrl: e.heroImageUrl,
    flyerUrl: e.flyerUrl,
    organizerEmail: e.organizerEmail ?? "",
    date: valid ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "",
    time: valid ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "",
  };
}

/** Clone tweaks: append "(copy)" and bump date forward in 7-day steps until future. */
export function cloneEventValues(values: EventFormValues): EventFormValues {
  let startsAt = new Date(`${values.date}T${values.time}`);
  if (Number.isNaN(startsAt.getTime())) startsAt = new Date();
  const now = Date.now();
  while (startsAt.getTime() <= now) {
    startsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return {
    ...values,
    title: `${values.title} (copy)`.slice(0, 300),
    status: "PUBLISHED",
    date: `${startsAt.getFullYear()}-${pad(startsAt.getMonth() + 1)}-${pad(startsAt.getDate())}`,
    time: `${pad(startsAt.getHours())}:${pad(startsAt.getMinutes())}`,
  };
}
