/**
 * Rasterizes a DOM subtree to a multi-page PDF (same idea as “Print to PDF” in the browser).
 * Uses html2pdf.js (html2canvas + jsPDF) so backgrounds, borders, and floated images match the screen.
 *
 * html2canvas cannot parse CSS Color 4 functions (`lab()`, `oklch()`, etc.) that Tailwind v4 emits in stylesheets.
 * We copy computed styles from the live DOM onto the clone so values resolve to `rgb()` / hex before rasterizing.
 */
export type DownloadElementAsPdfOptions = {
  /** Margin in the same unit as `jsPDF.unit` (default mm). */
  margin?: number | [number, number, number, number];
  jsPDF?: {
    unit?: "mm" | "in" | "pt";
    format?: string | [number, number];
    orientation?: "portrait" | "landscape";
  };
  html2canvas?: {
    scale?: number;
  };
};

const DEFAULT_MARGIN_MM: [number, number, number, number] = [10, 10, 10, 10];

/** WebKit can still report `lab()` / `oklch()` in getComputedStyle; html2canvas cannot parse them. */
const UNSUPPORTED_CANVAS_COLOR_FN = /\b(lab|oklch|lch)\s*\(/i;

function sanitizeComputedPropertyValue(
  ownerDocument: Document | null,
  name: string,
  value: string
): string | undefined {
  const v = value.trim();
  if (!v || !UNSUPPORTED_CANVAS_COLOR_FN.test(v)) return v;
  const doc =
    ownerDocument ?? (typeof document !== "undefined" ? document : null);
  if (!doc?.body) return undefined;
  const probe = doc.createElement("div");
  probe.setAttribute("style", "position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none");
  try {
    probe.style.setProperty(name, v);
  } catch {
    return undefined;
  }
  doc.body.appendChild(probe);
  let resolved = "";
  try {
    resolved = getComputedStyle(probe).getPropertyValue(name).trim();
  } finally {
    probe.remove();
  }
  if (resolved && !UNSUPPORTED_CANVAS_COLOR_FN.test(resolved)) return resolved;
  /** Last resort so html2canvas never sees lab()/oklch (mobile Safari + Tailwind v4). */
  if (name === "color" || name === "-webkit-text-fill-color") return "rgb(0, 0, 0)";
  if (/^background(?!-clip)/i.test(name)) {
    if (/gradient|url/i.test(v)) return undefined;
    return "transparent";
  }
  if (/border|outline|shadow|stroke|fill/i.test(name)) return "transparent";
  return undefined;
}

/**
 * Walks two parallel DOM trees (original + html2canvas clone) and copies every resolved
 * computed CSS property onto the clone as inline styles. Prevents html2canvas from re-parsing
 * stylesheet rules that use `lab()` / `oklch()` (mobile + Tailwind v4).
 */
function copyComputedStylesOntoClone(originalRoot: HTMLElement, clonedRoot: HTMLElement) {
  const ownerDocument = originalRoot.ownerDocument;
  function walk(orig: Element, clone: Element) {
    if (orig instanceof HTMLElement && clone instanceof HTMLElement) {
      const cs = window.getComputedStyle(orig);
      for (let i = 0; i < cs.length; i++) {
        const name = cs[i];
        try {
          const raw = cs.getPropertyValue(name);
          const safe = sanitizeComputedPropertyValue(ownerDocument, name, raw);
          if (safe !== undefined) {
            clone.style.setProperty(name, safe, cs.getPropertyPriority(name));
          }
        } catch {
          /* skip unsupported property names in strict engines */
        }
      }
    }
    const n = Math.min(orig.children.length, clone.children.length);
    for (let i = 0; i < n; i++) {
      walk(orig.children[i], clone.children[i]);
    }
  }
  walk(originalRoot, clonedRoot);
}

/**
 * html2canvas still parses linked stylesheets in the cloned document; Tailwind v4 uses
 * `lab()`/`oklch()` there. After inlining computed styles, remove author CSS from the clone.
 */
function stripAuthorStylesheetsFromClone(clonedDocument: Document) {
  clonedDocument.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove());
  clonedDocument.querySelectorAll("style").forEach((el) => el.remove());
}

export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  options?: DownloadElementAsPdfOptions
): Promise<void> {
  type Html2PdfFactory = (opts?: unknown) => {
    set: (o: unknown) => {
      from: (el: HTMLElement) => {
        save: () => Promise<void>;
      };
    };
  };

  const mod = (await import("html2pdf.js")) as unknown as {
    default?: Html2PdfFactory;
  } & Html2PdfFactory;
  const html2pdf = (typeof mod.default === "function" ? mod.default : mod) as Html2PdfFactory;

  const jsPDF = {
    unit: "mm" as const,
    format: "a4" as const,
    orientation: "portrait" as const,
    ...options?.jsPDF,
  };

  const margin =
    options?.margin !== undefined ? options.margin : jsPDF.unit === "in" ? [0.3, 0.3, 0.3, 0.3] : DEFAULT_MARGIN_MM;

  await html2pdf()
    .set({
      margin,
      filename,
      image: { type: "jpeg", quality: 0.93 },
      html2canvas: {
        scale: options?.html2canvas?.scale ?? 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        foreignObjectRendering: false,
        onclone: (clonedDocument: Document, clonedElement: HTMLElement) => {
          copyComputedStylesOntoClone(element, clonedElement);
          stripAuthorStylesheetsFromClone(clonedDocument);
        },
      },
      jsPDF,
      pagebreak: { mode: ["css", "legacy"] },
    })
    .from(element)
    .save();
}

/** US Letter — matches volunteer certificate print CSS (`@page { size: letter }`). */
export const CERTIFICATE_LETTER_PDF_OPTIONS: DownloadElementAsPdfOptions = {
  margin: [0.3, 0.3, 0.3, 0.3],
  jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
  html2canvas: { scale: 2 },
};

/**
 * Letter PDF with no extra jsPDF margin — use when the captured element is already
 * sized to the printable area (~7.9×10.4 in) and centers the certificate inside (typical formal layout).
 */
export const CERTIFICATE_LETTER_PDF_OPTIONS_FULL_PAGE: DownloadElementAsPdfOptions = {
  margin: 0,
  jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
  html2canvas: { scale: 2 },
};

/**
 * A4 landscape — matches volunteer certificate print CSS (`@page { size: A4 landscape }`).
 * No jsPDF margin: capture root is already ~11.09×7.67 in (A4 landscape minus 0.3 in margins).
 */
export const CERTIFICATE_A4_LANDSCAPE_PDF_OPTIONS_FULL_PAGE: DownloadElementAsPdfOptions = {
  margin: 0,
  jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
  html2canvas: { scale: 2 },
};
