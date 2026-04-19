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

/**
 * Walks two parallel DOM trees (original + html2canvas clone) and copies every resolved
 * computed CSS property onto the clone as inline styles. Prevents html2canvas from re-parsing
 * stylesheet rules that use `lab()` / `oklch()` (mobile + Tailwind v4).
 */
function copyComputedStylesOntoClone(originalRoot: HTMLElement, clonedRoot: HTMLElement) {
  function walk(orig: Element, clone: Element) {
    if (orig instanceof HTMLElement && clone instanceof HTMLElement) {
      const cs = window.getComputedStyle(orig);
      for (let i = 0; i < cs.length; i++) {
        const name = cs[i];
        try {
          clone.style.setProperty(name, cs.getPropertyValue(name), cs.getPropertyPriority(name));
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
        onclone: (_clonedDocument: Document, clonedElement: HTMLElement) => {
          copyComputedStylesOntoClone(element, clonedElement);
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
