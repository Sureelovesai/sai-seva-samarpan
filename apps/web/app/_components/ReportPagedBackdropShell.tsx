"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  REPORT_PAGED_BACKDROP_STRIP_HEIGHT_EDITOR,
  getReportBodyShellLayers,
  type ReportPresentation,
} from "@/lib/reportPresentation";

type ReportPagedBackdropShellProps = {
  presentation: ReportPresentation;
  /** Classes merged onto the outer bordered shell (e.g. flex grow for PDF). */
  className?: string;
  /**
   * CSS height used to resolve one backdrop strip in px (measured from a hidden probe).
   * Defaults to the same rule as blog article canvas strips.
   */
  stripHeightCss?: string;
  innerClassName?: string;
  innerStyle?: CSSProperties;
  /** Classes on the intrinsic-height wrapper (e.g. flex chain for the rich-text editor). */
  measureWrapperClassName?: string;
  children: ReactNode;
};

/** One strip segment: full-height pages plus a shorter final segment when content overflows. */
function computeStripSegments(naturalContentPx: number, stripHeightPx: number): { top: number; height: number }[] {
  const stripH = stripHeightPx > 48 ? stripHeightPx : 800;
  const natural = Math.max(1, Math.ceil(naturalContentPx));
  const count = Math.max(1, Math.ceil(natural / stripH));
  const segments: { top: number; height: number }[] = [];
  let top = 0;
  for (let i = 0; i < count; i++) {
    const remaining = natural - top;
    const height = i === count - 1 ? remaining : Math.min(stripH, remaining);
    segments.push({ top, height });
    top += height;
  }
  return segments;
}

/**
 * Stacks fixed-height decoration strips (color + photo + bleach) so the backdrop is not stretched
 * with body height. Each strip uses `contain` for the photo. Extra strips are added only when
 * intrinsic content height exceeds one strip (see `computeStripSegments`).
 */
export function ReportPagedBackdropShell({
  presentation,
  className = "",
  stripHeightCss = REPORT_PAGED_BACKDROP_STRIP_HEIGHT_EDITOR,
  innerClassName = "",
  innerStyle,
  measureWrapperClassName = "",
  children,
}: ReportPagedBackdropShellProps) {
  const layers = getReportBodyShellLayers(presentation, { backdropPhotoFit: "contain" });
  const probeRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [stripPx, setStripPx] = useState(0);
  const [naturalContentPx, setNaturalContentPx] = useState(0);

  const measure = useCallback(() => {
    const probe = probeRef.current;
    const inner = measureRef.current;
    const nextStrip = probe?.offsetHeight ?? 0;
    const nextNatural = inner?.offsetHeight ?? 0;
    if (nextStrip > 48) setStripPx(nextStrip);
    setNaturalContentPx(nextNatural);
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    const inner = measureRef.current;
    const probe = probeRef.current;
    if (inner) ro.observe(inner);
    if (probe) ro.observe(probe);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, presentation]);

  const effectiveStrip = stripPx > 48 ? stripPx : 800;
  const naturalRounded = Math.max(1, Math.ceil(naturalContentPx));
  const stripSegments = computeStripSegments(naturalContentPx, effectiveStrip);

  return (
    <div className={className} style={layers.outer}>
      <div
        ref={probeRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 -z-10 opacity-0"
        style={{ height: stripHeightCss, width: "1px" }}
      />
      <div className="relative w-full" style={{ minHeight: naturalRounded }}>
        {stripSegments.map((seg, i) => (
          <div
            key={`${seg.top}-${seg.height}-${i}`}
            aria-hidden
            className="pointer-events-none overflow-hidden"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: seg.top,
              height: seg.height,
              zIndex: 0,
            }}
          >
            <div style={{ ...layers.colorLayer, position: "absolute", inset: 0 }} />
            {layers.photoLayer ? (
              <div style={{ ...layers.photoLayer, position: "absolute", inset: 0 }} />
            ) : null}
            {layers.photoBleachLayer ? (
              <div style={{ ...layers.photoBleachLayer, position: "absolute", inset: 0 }} />
            ) : null}
          </div>
        ))}
        <div
          className={innerClassName}
          style={{
            ...layers.inner,
            ...innerStyle,
            position: "relative",
            zIndex: 3,
          }}
        >
          <div ref={measureRef} className={measureWrapperClassName}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
