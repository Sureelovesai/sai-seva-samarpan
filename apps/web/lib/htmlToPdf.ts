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
    /** Lay out/capture as if the window had this width (helps mobile portrait PDFs). */
    windowWidth?: number;
    windowHeight?: number;
  };
  /**
   * When false, onclone only strips author stylesheets — use when this element (and subtree)
   * already has full inline styles (e.g. off-screen mirror). Default true.
   */
  mirrorComputedStylesInClone?: boolean;
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
        ...options?.html2canvas,
        onclone: (clonedDocument: Document, clonedElement: HTMLElement) => {
          if (options?.mirrorComputedStylesInClone !== false) {
            copyComputedStylesOntoClone(element, clonedElement);
          }
          stripAuthorStylesheetsFromClone(clonedDocument);
        },
      },
      jsPDF,
      pagebreak: { mode: ["css", "legacy"] },
    })
    .from(element)
    .save();
}

/** ~96dpi px for full A4 landscape (297×210 mm) — one canvas page, no portrait slicing. */
const A4_LANDSCAPE_CAPTURE_PX = {
  w: Math.round((297 * 96) / 25.4),
  h: Math.round((210 * 96) / 25.4),
};

/**
 * Mobile portrait (and narrow viewports) lay out the certificate in a tall box; html2pdf then
 * tiles that image across several landscape pages. This builds a fixed A4-landscape off-screen
 * tree, mirrors computed styles, scales to fit one page, and rasterizes that single surface.
 */
export async function downloadCertificateLandscapePdf(
  sourceElement: HTMLElement,
  filename: string,
  options?: DownloadElementAsPdfOptions
): Promise<void> {
  const W = A4_LANDSCAPE_CAPTURE_PX.w;
  const H = A4_LANDSCAPE_CAPTURE_PX.h;

  const wrapper = document.createElement("div");
  wrapper.setAttribute("aria-hidden", "true");
  /** Below the fold but still painted — extreme negative coords often yield blank rasters on iOS/WebKit. */
  const tuckY =
    typeof window !== "undefined" ? Math.ceil(window.innerHeight + 120) : 120;
  wrapper.style.cssText = [
    "position:fixed",
    "left:0",
    `top:${tuckY}px`,
    `width:${W}px`,
    `height:${H}px`,
    "overflow:hidden",
    "margin:0",
    "padding:0",
    "box-sizing:border-box",
    "background:#f6eadc",
    "z-index:2147483645",
    "pointer-events:none",
  ].join(";");

  const viewport = document.createElement("div");
  viewport.style.cssText = [
    `width:${W}px`,
    `height:${H}px`,
    "overflow:hidden",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "box-sizing:border-box",
    "margin:0",
    "padding:0",
  ].join(";");

  const clone = sourceElement.cloneNode(true) as HTMLElement;
  viewport.appendChild(clone);
  wrapper.appendChild(viewport);
  document.body.appendChild(wrapper);

  copyComputedStylesOntoClone(sourceElement, clone);
  clone.style.boxSizing = "border-box";
  clone.style.width = `${W}px`;
  clone.style.maxWidth = `${W}px`;
  clone.style.flexShrink = "0";

  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await new Promise<void>((r) => requestAnimationFrame(() => r()));

  const nw = clone.offsetWidth || W;
  const nh = clone.offsetHeight || H;
  const scale = Math.min(W / nw, H / nh, 1);
  if (scale < 1) {
    clone.style.transform = `scale(${scale})`;
    clone.style.transformOrigin = "center center";
  }

  try {
    await downloadElementAsPdf(wrapper, filename, {
      ...options,
      html2canvas: {
        windowWidth: W,
        windowHeight: Math.max(H, tuckY + H + 8),
        scale: options?.html2canvas?.scale ?? 2,
      },
    });
  } finally {
    wrapper.remove();
  }
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
