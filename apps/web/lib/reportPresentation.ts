import type { CSSProperties } from "react";

/** Inline styles so html2pdf + browser preview match without relying on Tailwind purge. */
export type ReportPresentation = {
  backgroundId: string;
  borderId: string;
};

export const DEFAULT_REPORT_PRESENTATION: ReportPresentation = {
  backgroundId: "cream",
  borderId: "soft",
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
  return { backgroundId: bg, borderId: bd };
}

/** Combined inner + shell styles for the report body preview (and PDF capture). */
export function getReportBodyShellStyles(p: ReportPresentation): {
  outer: CSSProperties;
  inner: CSSProperties;
} {
  const bg = BACKGROUNDS[p.backgroundId] ?? BACKGROUNDS.cream;
  const bd = BORDERS[p.borderId] ?? BORDERS.soft;
  return {
    outer: {
      ...bd.shell,
      backgroundColor: "transparent",
      overflow: "hidden",
    },
    inner: {
      ...bg.inner,
      color: "#3d3530",
      fontSize: "15px",
      lineHeight: 1.65,
      display: "flow-root",
    },
  };
}

/** Extra prose rules for floated images inside the report (inline in style tag or className string for PDF). */
export const REPORT_BODY_PROSE_CLASS =
  "report-pdf-prose max-w-none [&_img]:max-w-full [&_p]:mb-3 [&_h1]:mb-3 [&_h2]:mb-2 [&_h3]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[#d4c4b8] [&_blockquote]:pl-4 [&_blockquote]:italic";
