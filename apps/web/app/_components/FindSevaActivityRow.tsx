import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { isActivityEnded } from "@/lib/activityEnded";

export type LevelTab = "center" | "regional" | "national";

export type FindSevaActivityListItem = {
  id: string;
  title: string;
  category: string;
  city: string;
  organizationName: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationHours?: number | null;
  imageUrl: string | null;
  /** Seats left (when capacity is set) */
  spotsRemaining?: number | null;
  capacity: number | null;
  sevaUsaRegion?: string | null;
};

function tileBg(category: string) {
  const c = (category || "").toLowerCase();
  if (c.includes("online")) return "bg-sky-200/80";
  if (c.includes("food") || c.includes("narayana")) return "bg-green-200/80";
  if (c.includes("medicare") || c.includes("medical")) return "bg-blue-200/80";
  if (c.includes("sociocare") || c.includes("social")) return "bg-orange-200/80";
  if (c.includes("educare") || c.includes("educ")) return "bg-yellow-200/80";
  if (c.includes("environmental") || c.includes("go green")) return "bg-teal-200/80";
  if (c.includes("animal")) return "bg-amber-200/80";
  if (c.includes("senior") || c.includes("children") || c.includes("women")) return "bg-pink-200/80";
  if (c.includes("homeless") || c.includes("veterans")) return "bg-slate-200/80";
  if (c.includes("cultural") || c.includes("worship")) return "bg-purple-200/80";
  return "bg-purple-200/80";
}

function timeToAMPM(hhmm: string | null): string {
  if (!hhmm || !hhmm.trim()) return "";
  const [h, m] = hhmm.trim().split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return hhmm;
  const min = (m ?? "00").padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "";
  const dateOnly = String(iso).slice(0, 10);
  const [y, mo, day] = dateOnly.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(day)) return "";
  const d = new Date(y, mo - 1, day);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatWhenWhere(a: FindSevaActivityListItem) {
  const city = a.city || "";
  const startStr = formatDateOnly(a.startDate);
  const endStr = formatDateOnly(a.endDate);

  let dateStr = "";
  if (startStr && endStr) {
    dateStr = startStr === endStr ? startStr : `${startStr} – ${endStr}`;
  } else if (startStr) {
    dateStr = startStr;
  } else if (endStr) {
    dateStr = endStr;
  }

  const startAMPM = timeToAMPM(a.startTime);
  const endAMPM = timeToAMPM(a.endTime);
  const timeStr = [startAMPM, endAMPM].filter(Boolean).join(" – ");
  const parts = [dateStr, timeStr].filter(Boolean).join(", ");
  return [parts, city].filter(Boolean).join(" — ");
}

export function FindSevaActivityRow({
  item,
  levelTab,
  nestedUnderProgram = false,
  showSelectCheckbox,
  viewDetailsHref,
  selected,
  onToggleSelect,
  selectDisabled,
  selectSubline,
  selectTitle,
}: {
  item: FindSevaActivityListItem;
  levelTab: LevelTab;
  nestedUnderProgram?: boolean;
  showSelectCheckbox: boolean;
  viewDetailsHref: string;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  selectDisabled: boolean;
  selectSubline: ReactNode | null;
  selectTitle: string;
}) {
  const ended = isActivityEnded({
    startDate: item.startDate,
    endDate: item.endDate,
    startTime: item.startTime,
    endTime: item.endTime,
    durationHours: item.durationHours ?? null,
  });
  return (
    <div
      className={`mx-auto w-full min-w-0 overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.22)] ${
        nestedUnderProgram ? "ring-1 ring-indigo-900/10" : ""
      }`}
    >
      {showSelectCheckbox && (
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-300/50 bg-white/85 px-4 py-2.5">
          <input
            type="checkbox"
            id={`find-seva-pick-${item.id}`}
            checked={selected}
            disabled={selectDisabled}
            title={selectTitle}
            onChange={(e) => onToggleSelect(e.target.checked)}
            className="h-5 w-5 shrink-0 rounded border-zinc-400 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Select ${item.title} to open together on Seva Details`}
          />
          <label
            htmlFor={`find-seva-pick-${item.id}`}
            className={`min-w-0 flex-1 ${selectDisabled ? "cursor-not-allowed" : "cursor-pointer"} text-sm font-medium leading-snug ${
              ended ? "text-zinc-400" : "text-zinc-800"
            }`}
          >
            {ended ? "Activity ended — cannot select" : "Select for Seva Details (open multiple in tabs)"}
            {selectSubline}
          </label>
        </div>
      )}
      <div className="grid w-full min-w-0 grid-cols-1 items-stretch md:grid-cols-[minmax(0,180px)_minmax(0,1fr)] md:overflow-hidden">
        <div className="flex min-h-[140px] w-full items-center justify-center overflow-hidden bg-zinc-200 md:min-h-0 md:h-full md:w-[180px] md:shrink-0">
          <div className="relative aspect-[9/8] w-full max-w-[min(100%,280px)] overflow-hidden md:max-w-[180px]">
            {(() => {
              const src = item.imageUrl ?? "/swami-circle.jpeg";
              const isRelativeOrBlob = src.startsWith("/") || src.includes("blob.vercel-storage.com");
              if (isRelativeOrBlob) {
                return (
                  <Image
                    src={src}
                    alt={item.title}
                    fill
                    className="object-contain object-center"
                    sizes="(max-width: 767px) 90vw, 180px"
                  />
                );
              }
              return (
                <img
                  src={src}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-contain object-center"
                />
              );
            })()}
          </div>
        </div>

        <div className={`${tileBg(item.category)} min-w-0 px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:px-10`}>
          <div className="flex min-w-0 gap-3 sm:gap-5">
            <div className="min-w-0 flex-1">
              <div className="break-words text-2xl font-semibold tracking-wide text-zinc-900 sm:text-3xl">
                {item.title}
              </div>

              <div className="mt-3 break-words text-base font-semibold leading-snug text-zinc-800 sm:text-lg">
                {formatWhenWhere(item)}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 break-words text-sm font-semibold text-zinc-700">
                <span>{item.category}</span>
                {levelTab === "regional" && item.sevaUsaRegion && (
                  <span className="rounded border border-indigo-400 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-900">
                    {item.sevaUsaRegion}
                  </span>
                )}
                {levelTab === "national" && (
                  <span className="rounded border border-amber-600 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-950">
                    National
                  </span>
                )}
              </div>

              {item.organizationName && (
                <div className="mt-2 break-words text-base font-semibold text-indigo-900">{item.organizationName}</div>
              )}

              <div className="mt-6 md:mt-8">
                <Link
                  href={viewDetailsHref}
                  className="block w-full bg-white px-6 py-3 text-center text-base font-medium text-zinc-800 shadow hover:bg-zinc-50 md:inline-block md:w-auto md:px-10 md:text-left"
                >
                  View Details
                </Link>
              </div>
            </div>

            {item.capacity != null && item.capacity > 0 && item.spotsRemaining != null && (
              <div
                className="flex w-[5.25rem] shrink-0 flex-col justify-center self-stretch sm:w-28"
                aria-label={
                  item.spotsRemaining === 0
                    ? "No volunteer spots left"
                    : `${item.spotsRemaining} volunteer spots left out of ${item.capacity}`
                }
              >
                <span
                  className={`inline-flex w-full items-center justify-center rounded-full px-2.5 py-1.5 text-center text-sm font-bold tabular-nums leading-tight shadow-sm sm:px-3 sm:text-base ${
                    item.spotsRemaining === 0
                      ? "bg-zinc-200 text-zinc-700"
                      : "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400/50"
                  }`}
                >
                  {item.spotsRemaining === 0
                  ? "Full"
                  : `${item.spotsRemaining} ${item.spotsRemaining === 1 ? "slot" : "slots"} left`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
