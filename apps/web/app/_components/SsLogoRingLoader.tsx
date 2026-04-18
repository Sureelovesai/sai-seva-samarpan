"use client";

import { useEffect, useState } from "react";

/**
 * Place `SSSGC_logo_values.jpeg` in `apps/web/public/` (or pass `src`).
 * Rotating ring around the logo while data is loading.
 */
/** Public filenames to try (same asset, common casing / extension differences). */
const LOGO_SRC_CHAIN = [
  "/SSSGC_logo_values.jpeg",
  "/SSSGC_logo_values.jpg",
  "/SSSGC_logo_values.JPEG",
  "/SSSGC_logo_values.JPG",
] as const;

const FALLBACK_LOGO = "/logo.png";

/** Default loader tries each filename, then site logo. */
const DEFAULT_SRC_CHAIN = [...LOGO_SRC_CHAIN, FALLBACK_LOGO] as const;

const sizeMap = {
  sm: { box: "h-16 w-16", ring: "inset-0", imgPad: "inset-[5px]" },
  md: { box: "h-32 w-32", ring: "inset-0", imgPad: "inset-[10px]" },
  lg: { box: "h-40 w-40", ring: "inset-0", imgPad: "inset-[12px]" },
} as const;

export function SsLogoRingLoader({
  size = "md",
  className = "",
  src = DEFAULT_SRC_CHAIN[0],
  label = "Loading",
}: {
  size?: keyof typeof sizeMap;
  className?: string;
  /** Public URL under `/` (defaults to SSSGC values logo chain) */
  src?: string;
  /** Accessible status (visually hidden; screen readers) */
  label?: string;
}) {
  const [chainIndex, setChainIndex] = useState(0);
  useEffect(() => {
    setChainIndex(0);
  }, [src]);

  const usingDefaultChain = src === DEFAULT_SRC_CHAIN[0];
  const imgSrc = usingDefaultChain
    ? DEFAULT_SRC_CHAIN[Math.min(chainIndex, DEFAULT_SRC_CHAIN.length - 1)]
    : src;
  const s = sizeMap[size];
  return (
    <div
      className={`relative isolate inline-flex flex-col items-center justify-center ${s.box} ${className}`}
      role="status"
      aria-live="polite"
      aria-busy
    >
      <span className="sr-only">{label}</span>
      {/* Rings stay under the logo: spin uses transform, which can stack above non-z siblings without z-index */}
      <div
        className={`pointer-events-none absolute z-0 ${s.ring} rounded-full border-[3px] border-indigo-200/70`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute z-0 ${s.ring} animate-spin rounded-full border-[3px] border-transparent border-t-indigo-600 border-r-indigo-500 shadow-[0_0_12px_rgba(79,70,229,0.35)] [animation-duration:1.1s]`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute z-0 ${s.ring} m-[5px] animate-spin rounded-full border-2 border-dashed border-indigo-400/50 [animation-direction:reverse] [animation-duration:2.2s]`}
        aria-hidden
      />
      <div
        className={`absolute z-10 ${s.imgPad} flex items-center justify-center overflow-hidden rounded-full bg-white shadow-inner ring-1 ring-indigo-100/80`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt=""
          className="h-full w-full object-contain p-0.5"
          draggable={false}
          onError={() => {
            if (!usingDefaultChain) return;
            setChainIndex((i) => Math.min(i + 1, DEFAULT_SRC_CHAIN.length - 1));
          }}
        />
      </div>
    </div>
  );
}
