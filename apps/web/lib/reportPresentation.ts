import type { CSSProperties } from "react";
import { normalizeBackdropPhotoUrl } from "@/lib/articleCanvasPresentation";

/** Inline styles so html2pdf + browser preview match without relying on Tailwind purge. */
export type ReportPresentation = {
  backgroundId: string;
  borderId: string;
  /** Optional sheet behind the report body (same URL rules as blog article backdrop). */
  backdropPhotoUrl: string | null;
  backdropPhotoOpacity: number;
  backdropPhotoBleach: number;
  backdropPhotoPosX: number;
  backdropPhotoPosY: number;
  backdropPhotoRepeat: boolean;
};

export const DEFAULT_REPORT_PRESENTATION: ReportPresentation = {
  backgroundId: "cream",
  borderId: "soft",
  backdropPhotoUrl: null,
  backdropPhotoOpacity: 0.82,
  backdropPhotoBleach: 0.14,
  backdropPhotoPosX: 50,
  backdropPhotoPosY: 50,
  backdropPhotoRepeat: false,
};

const BACKGROUNDS: Record<
  string,
  { label: string; inner: CSSProperties; outer?: CSSProperties }
> = {
  cream: {
    label: "Soft cream",
    inner: {
      background: "linear-gradient(180deg, #fffdfb 0%, #fefaf8 35%, #ffffff 100%)",
    },
  },
  paper: {
    label: "Warm paper",
    inner: { backgroundColor: "#faf6f0" },
  },
  mist: {
    label: "Cool mist",
    inner: {
      background: "linear-gradient(135deg, #f4f9fb 0%, #fafdfe 50%, #ffffff 100%)",
    },
  },
  sage: {
    label: "Sage tint",
    inner: {
      background: "linear-gradient(180deg, #f6faf7 0%, #fbfdf9 100%)",
    },
  },
  blush: {
    label: "Blush",
    inner: {
      background: "linear-gradient(180deg, #fff8f6 0%, #fef5f2 45%, #ffffff 100%)",
    },
  },
};

const BORDERS: Record<string, { label: string; shell: CSSProperties }> = {
  none: {
    label: "No frame",
    shell: { border: "none", borderRadius: 0, padding: "4px", boxShadow: "none" },
  },
  soft: {
    label: "Soft frame",
    shell: {
      border: "1px solid #e8c4b8",
      borderRadius: "14px",
      padding: "20px 22px",
      boxShadow: "0 2px 12px rgba(90, 69, 56, 0.08)",
    },
  },
  strong: {
    label: "Defined frame",
    shell: {
      border: "2px solid #c4a090",
      borderRadius: "10px",
      padding: "18px 20px",
      boxShadow: "0 4px 18px rgba(90, 69, 56, 0.12)",
    },
  },
  card: {
    label: "Floating card",
    shell: {
      border: "1px solid #ead5ce",
      borderRadius: "16px",
      padding: "22px 24px",
      boxShadow: "0 8px 28px rgba(60, 45, 38, 0.14)",
    },
  },
};

export const REPORT_BACKGROUND_OPTIONS = Object.entries(BACKGROUNDS).map(([id, v]) => ({
  id,
  label: v.label,
}));

export const REPORT_BORDER_OPTIONS = Object.entries(BORDERS).map(([id, v]) => ({
  id,
  label: v.label,
}));

export function isValidBackgroundId(id: string): boolean {
  return id in BACKGROUNDS;
}

export function isValidBorderId(id: string): boolean {
  return id in BORDERS;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function normalizePresentation(raw: unknown): ReportPresentation {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_REPORT_PRESENTATION };
  }
  const o = raw as Record<string, unknown>;
  const bg =
    typeof o.backgroundId === "string" && isValidBackgroundId(o.backgroundId)
      ? o.backgroundId
      : DEFAULT_REPORT_PRESENTATION.backgroundId;
  const bd =
    typeof o.borderId === "string" && isValidBorderId(o.borderId)
      ? o.borderId
      : DEFAULT_REPORT_PRESENTATION.borderId;
  const backdropPhotoUrl = normalizeBackdropPhotoUrl(o.backdropPhotoUrl);
  const backdropPhotoOpacity =
    typeof o.backdropPhotoOpacity === "number" && Number.isFinite(o.backdropPhotoOpacity)
      ? clamp(o.backdropPhotoOpacity, 0, 1)
      : DEFAULT_REPORT_PRESENTATION.backdropPhotoOpacity;
  const backdropPhotoBleach =
    typeof o.backdropPhotoBleach === "number" && Number.isFinite(o.backdropPhotoBleach)
      ? clamp(o.backdropPhotoBleach, 0, 0.92)
      : DEFAULT_REPORT_PRESENTATION.backdropPhotoBleach;
  const backdropPhotoPosX =
    typeof o.backdropPhotoPosX === "number" && Number.isFinite(o.backdropPhotoPosX)
      ? clamp(o.backdropPhotoPosX, 0, 100)
      : DEFAULT_REPORT_PRESENTATION.backdropPhotoPosX;
  const backdropPhotoPosY =
    typeof o.backdropPhotoPosY === "number" && Number.isFinite(o.backdropPhotoPosY)
      ? clamp(o.backdropPhotoPosY, 0, 100)
      : DEFAULT_REPORT_PRESENTATION.backdropPhotoPosY;
  const backdropPhotoRepeat =
    typeof o.backdropPhotoRepeat === "boolean"
      ? o.backdropPhotoRepeat
      : DEFAULT_REPORT_PRESENTATION.backdropPhotoRepeat;

  return {
    backgroundId: bg,
    borderId: bd,
    backdropPhotoUrl,
    backdropPhotoOpacity,
    backdropPhotoBleach,
    backdropPhotoPosX,
    backdropPhotoPosY,
    backdropPhotoRepeat,
  };
}

/** Strip backdrop photo for the default report reading view (editors); PDF export uses full `presentation`. */
export function reportPresentationForReading(p: ReportPresentation): ReportPresentation {
  return { ...p, backdropPhotoUrl: null };
}

/**
 * Non-repeating backdrop photos use fixed-height strips stacked vertically (editor + PDF).
 * Each strip uses `contain` (see `getReportBodyShellLayers` opts) so the image is not stretched;
 * an additional strip is added only when content height exceeds one strip. Tiled / repeat mode
 * keeps one growing shell.
 */
export function reportUsesPagedBackdropPhoto(p: ReportPresentation): boolean {
  const photoUrl = normalizeBackdropPhotoUrl(p.backdropPhotoUrl);
  if (!photoUrl || p.backdropPhotoRepeat) return false;
  return clamp(p.backdropPhotoOpacity, 0, 1) > 0;
}

/** CSS height of one backdrop "page" in the report editor / on-screen reading. */
export const REPORT_PAGED_BACKDROP_STRIP_HEIGHT_EDITOR = "min(72vh, 56rem)";

/** One PDF body strip (~printable A4 region) so each page-sized slice gets its own `cover` instance. */
export const REPORT_PAGED_BACKDROP_STRIP_HEIGHT_PDF = "240mm";

function cssUrl(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `url("${escaped}")`;
}

export type ReportBodyShellLayerOptions = {
  /** `contain` shows the full image within each strip; `cover` fills (may crop). */
  backdropPhotoFit?: "cover" | "contain";
};

/** Layered shell for report body — screen + PDF (html2canvas) use the same DOM. */
export function getReportBodyShellLayers(
  p: ReportPresentation,
  opts?: ReportBodyShellLayerOptions
): {
  outer: CSSProperties;
  colorLayer: CSSProperties;
  photoLayer: CSSProperties | null;
  photoBleachLayer: CSSProperties | null;
  inner: CSSProperties;
} {
  const bg = BACKGROUNDS[p.backgroundId] ?? BACKGROUNDS.cream;
  const bd = BORDERS[p.borderId] ?? BORDERS.soft;
  const photoUrl = normalizeBackdropPhotoUrl(p.backdropPhotoUrl);
  const photoOp = clamp(p.backdropPhotoOpacity, 0, 1);
  const photoBleach = clamp(p.backdropPhotoBleach, 0, 0.92);
  const posX = clamp(p.backdropPhotoPosX, 0, 100);
  const posY = clamp(p.backdropPhotoPosY, 0, 100);
  const photoRepeat = Boolean(p.backdropPhotoRepeat);
  const photoFit = opts?.backdropPhotoFit === "contain" ? "contain" : "cover";

  const colorLayer: CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    ...bg.inner,
  };

  const photoLayer: CSSProperties | null =
    photoUrl && photoOp > 0
      ? {
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          backgroundImage: cssUrl(photoUrl),
          ...(photoRepeat
            ? {
                backgroundSize: "auto",
                backgroundPosition: `${posX}% ${posY}%`,
                backgroundRepeat: "repeat",
              }
            : {
                backgroundSize: photoFit,
                backgroundPosition: `${posX}% ${posY}%`,
                backgroundRepeat: "no-repeat",
              }),
          opacity: photoOp,
        }
      : null;

  const photoBleachLayer: CSSProperties | null =
    photoUrl && photoBleach > 0
      ? {
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          backgroundColor: `rgba(255,255,255,${photoBleach})`,
        }
      : null;

  const hasPhoto = Boolean(photoUrl && photoOp > 0);

  return {
    outer: {
      ...bd.shell,
      position: "relative",
      backgroundColor: "transparent",
      overflow: "hidden",
    },
    colorLayer,
    photoLayer,
    photoBleachLayer,
    inner: {
      position: "relative",
      zIndex: 3,
      color: "#3d3530",
      fontSize: "15px",
      lineHeight: 1.65,
      display: "flow-root",
      backgroundColor: hasPhoto ? "rgba(252, 248, 244, 0.72)" : "transparent",
    },
  };
}

/** Extra prose rules for floated images inside the report (inline in style tag or className string for PDF). */
export const REPORT_BODY_PROSE_CLASS =
  "report-pdf-prose max-w-none [&_img]:max-w-full [&_p]:mb-3 [&_h1]:mb-3 [&_h2]:mb-2 [&_h3]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[#d4c4b8] [&_blockquote]:pl-4 [&_blockquote]:italic";
