"use client";

import { useEffect, useRef, useState } from "react";

type PdfViewport = { width: number; height: number };

type PdfPage = {
  getViewport: (opts: { scale: number }) => PdfViewport;
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
    canvas: HTMLCanvasElement;
  }) => { promise: Promise<void> };
};

type PdfDoc = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy: () => Promise<void>;
};

type PdfJs = {
  getDocument: (src: { url: string; withCredentials: boolean }) => {
    promise: Promise<PdfDoc>;
  };
  GlobalWorkerOptions: { workerSrc: string };
};

let pdfJsPromise: Promise<PdfJs> | null = null;

function loadPdfJs(): Promise<PdfJs> {
  if (!pdfJsPromise) {
    // Runtime import so Next does not bundle the viewer. These files live in /public/pdfjs.
    const importFromPublic = new Function("return import('/pdfjs/pdf.min.mjs')") as () => Promise<PdfJs>;
    pdfJsPromise = importFromPublic()
      .then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        return pdfjs;
      })
      .catch((error) => {
        pdfJsPromise = null;
        throw error;
      });
  }
  return pdfJsPromise;
}

export function EventFlyerPdf({ fileUrl }: { fileUrl: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;

    const render = async () => {
      setStatus("loading");
      host.replaceChildren();

      try {
        const pdfjs = await loadPdfJs();
        if (cancelled) return;

        const pdf = await pdfjs.getDocument({ url: fileUrl, withCredentials: false }).promise;
        if (cancelled) {
          await pdf.destroy();
          return;
        }

        const width = host.clientWidth || 360;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) break;

          const page = await pdf.getPage(pageNumber);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / base.width) * pixelRatio });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;

          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.setAttribute("aria-label", `Event flyer page ${pageNumber}`);

          await page.render({ canvasContext: context, viewport, canvas }).promise;
          if (cancelled) break;

          const frame = document.createElement("div");
          frame.className = "overflow-hidden rounded-xl border-2 border-sky-300 bg-white shadow-sm";
          frame.appendChild(canvas);
          host.appendChild(frame);

          if (pageNumber === 1) setStatus("ready");
        }

        await pdf.destroy();
        if (!cancelled) setStatus("ready");
      } catch (error) {
        console.error("Flyer PDF render failed", error);
        if (!cancelled) setStatus("error");
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  return (
    <div className="mt-3 space-y-3">
      {status === "loading" ? <p className="text-sm text-sky-900">Loading flyer…</p> : null}
      {status === "error" ? (
        <p className="text-sm text-red-700">The flyer could not be shown here. Use the download link above.</p>
      ) : null}
      <div ref={hostRef} className="space-y-3" />
    </div>
  );
}
