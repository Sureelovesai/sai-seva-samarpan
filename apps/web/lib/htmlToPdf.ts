/**
 * Rasterizes a DOM subtree to a multi-page PDF (same idea as “Print to PDF” in the browser).
 * Uses html2pdf.js (html2canvas + jsPDF) so backgrounds, borders, and floated images match the screen.
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
