"use client";

import { SsLogoRingLoader } from "@/app/_components/SsLogoRingLoader";

export type AppPageLoaderProps = {
  /** Accessible status (screen readers) */
  label?: string;
  /** Visible caption under the logo */
  message?: string;
  size?: "sm" | "md" | "lg";
  /**
   * fullPage — min-height strip + background (dashboard-style gate / Suspense).
   * section — centered block for main content areas (lists, home sections).
   * compact — tighter block for modals / nested panels.
   * inline — horizontal row for filter bars (small logo).
   */
  layout?: "fullPage" | "section" | "compact" | "inline";
  /** Tailwind min-height when layout is fullPage (default min-h-[40vh]) */
  fullPageMinHeightClass?: string;
  /** fullPage only: warm yellow strip (dashboard) vs neutral (e.g. admin gate) */
  surface?: "yellow" | "plain";
  className?: string;
};

/**
 * Shared loading UI: rotating ring around the org logo (same as My Seva Dashboard).
 */
export function AppPageLoader({
  label = "Loading",
  message,
  size = "md",
  layout = "section",
  fullPageMinHeightClass = "min-h-[40vh]",
  surface = "yellow",
  className = "",
}: AppPageLoaderProps) {
  const caption = message ?? "Loading…";

  if (layout === "inline") {
    return (
      <span
        className={`inline-flex items-center gap-2 align-middle text-indigo-800 ${className}`}
        role="status"
        aria-live="polite"
      >
        <SsLogoRingLoader size="sm" label={label} className="scale-[0.72]" />
        <span className="text-sm font-medium">{caption}</span>
      </span>
    );
  }

  if (layout === "fullPage") {
    const bg = surface === "plain" ? "bg-zinc-50" : "bg-[#FFF2A8]";
    const text = surface === "plain" ? "text-zinc-700" : "text-indigo-900/80";
    return (
      <div
        className={`flex flex-col items-center justify-center gap-4 px-4 py-8 ${fullPageMinHeightClass} ${bg} ${className}`}
        role="status"
        aria-live="polite"
      >
        <SsLogoRingLoader size={size} label={label} />
        <p className={`text-center text-sm font-medium ${text}`}>{caption}</p>
      </div>
    );
  }

  if (layout === "compact") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 py-6 ${className}`}
        role="status"
        aria-live="polite"
      >
        <SsLogoRingLoader size="sm" label={label} />
        <p className="text-center text-sm text-zinc-600">{caption}</p>
      </div>
    );
  }

  // section (default)
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-10 ${className}`}
      role="status"
      aria-live="polite"
    >
      <SsLogoRingLoader size={size} label={label} />
      <p className="text-center text-sm text-zinc-600">{caption}</p>
    </div>
  );
}
