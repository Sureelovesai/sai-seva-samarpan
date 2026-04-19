"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * “Information” circle with tooltip:
 * - Desktop / fine pointer: hover or keyboard focus shows the panel (CSS).
 * - Touch / no reliable hover: tap the icon to toggle; tap outside or Escape to dismiss.
 */
export function SevaLevelTabInfoIcon({
  text,
  variant = "calendarInactive",
}: {
  text: string;
  /** Styling for the tab background the icon sits on (Find Seva + Activity Calendar). */
  variant?:
    | "findSevaInactive"
    | "findSevaActive"
    | "calendarInactive"
    | "calendarActive";
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  const panel =
    variant === "findSevaInactive" || variant === "findSevaActive"
      ? "border border-zinc-600 bg-zinc-900 text-white shadow-lg"
      : "border border-sky-500/60 bg-slate-950 text-sky-50 shadow-xl";

  const iconBtn =
    variant === "findSevaInactive"
      ? "text-indigo-800/85 hover:text-indigo-950 focus-visible:ring-indigo-500 focus-visible:ring-offset-white"
      : variant === "findSevaActive"
        ? "text-white/90 hover:text-white focus-visible:ring-white/80 focus-visible:ring-offset-indigo-800"
        : variant === "calendarActive"
          ? "text-white/95 hover:text-white focus-visible:ring-white/80 focus-visible:ring-offset-sky-600"
          : "text-sky-300/90 hover:text-sky-100 focus-visible:ring-sky-400 focus-visible:ring-offset-slate-900";

  useEffect(() => {
    if (!open) return;
    function closeIfOutside(e: MouseEvent | TouchEvent) {
      const el = wrapRef.current;
      const t = e.target;
      if (!el || !(t instanceof Node) || el.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("touchstart", closeIfOutside, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("touchstart", closeIfOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const tooltipBase =
    "absolute left-1/2 top-full z-50 mt-1 w-max max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md px-2.5 py-2 text-left text-xs font-normal leading-snug shadow-md transition-opacity duration-150";

  const tooltipVisibility = open
    ? "visible opacity-100 pointer-events-auto"
    : "invisible pointer-events-none opacity-0 group-hover/hint:visible group-hover/hint:pointer-events-none group-hover/hint:opacity-100 group-focus-within/hint:visible group-focus-within/hint:opacity-100";

  return (
    <span ref={wrapRef} className="group/hint relative inline-flex shrink-0">
      <button
        type="button"
        className={`inline-flex h-5 w-5 shrink-0 touch-manipulation items-center justify-center rounded-full outline-none transition hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-1 ${iconBtn}`}
        aria-label="About this level"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.743 15.5h.507a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <span id={panelId} role="tooltip" className={`${tooltipBase} ${tooltipVisibility} ${panel}`}>
        {text}
      </span>
    </span>
  );
}

export const SEVA_LEVEL_TAB_INFO = {
  center:
    "Center Level tab displays all the activities conducted at the center level.",
  regional:
    "The Regional Level tab displays activities conducted at regional level - Example- Seva activities at regional Retreat.",
  national:
    "The National Level tab displays activities conducted at National Level. Example - Activities conducted by US members in Parthi like Grama Seva.",
} as const;
