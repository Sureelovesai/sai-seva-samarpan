"use client";

import Image from "next/image";
import { Suspense, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CERTIFICATE_LETTER_PDF_OPTIONS, downloadElementAsPdf } from "@/lib/htmlToPdf";

/** Mobile / touch browsers often ignore or mishandle `window.print()`; client PDF works reliably. */
function shouldSavePdfInsteadOfPrint(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const ipadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const coarsePointer = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  return mobileUa || ipadDesktopMode || coarsePointer;
}

function safeCertificateFilenameBase(volunteerName: string): string {
  const cleaned = volunteerName
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return cleaned ? `certificate-${cleaned}` : "volunteer-certificate";
}

function formatDateFromInput(yyyyMmDd: string) {
  if (!yyyyMmDd) return "";
  const d = new Date(yyyyMmDd + "T00:00:00");
  if (Number.isNaN(d.getTime())) return yyyyMmDd;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function CertificateContent() {
  const sp = useSearchParams();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const data = useMemo(() => {
    const name = sp.get("name") || "Volunteer Name";
    const hoursRaw = sp.get("hours") || "0";
    const hours = Number(hoursRaw);
    const activity = sp.get("activity") || "Seva Activity";
    const location = sp.get("location") || "Location";
    const date = sp.get("date") || "";
    const serviceDateFormatted = formatDateFromInput(date);
    const issuedOn = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

    return {
      volunteerName: name,
      hours: Number.isFinite(hours) ? hours : hoursRaw,
      activity,
      location,
      serviceType: "Sri Sathya Sai Center/Group of",
      coordinatorTitle: "Service Coordinator",
      serviceDateFormatted,
      issuedOn,
      orgName: "The Sri Sathya Sai Global Council Foundation, Inc. (EIN: 88-0716268) is a U.S.-based 501(c)(3) nonprofit that supports global humanitarian and community service initiatives inspired by the teachings of  Bhagawan Sri Sathya Sai Baba.",
    };
  }, [sp]);

  async function handlePrintOrSavePdf() {
    setPdfError(null);
    if (shouldSavePdfInsteadOfPrint()) {
      const el = sheetRef.current;
      if (!el) {
        setPdfError("Could not prepare the certificate. Please try again.");
        return;
      }
      setPdfBusy(true);
      try {
        const name = `${safeCertificateFilenameBase(data.volunteerName)}.pdf`;
        await downloadElementAsPdf(el, name, CERTIFICATE_LETTER_PDF_OPTIONS);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Could not save PDF.";
        setPdfError(msg);
        console.error("Certificate PDF failed:", e);
      } finally {
        setPdfBusy(false);
      }
      return;
    }
    window.print();
  }

  return (
    <div className="certificate-page-root flex w-full flex-col items-stretch">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* US Letter (8.5×11) — the usual certificate size for US print/PDF; fits standard frames & printers. */
          @page { size: letter; margin: 0.3in; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #f6eadc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .certificate-print-wrap {
            width: 100% !important;
            max-width: 7.75in !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 auto !important;
            background: #f6eadc !important;
            display: block !important;
            align-items: unset !important;
            justify-content: unset !important;
            box-sizing: border-box !important;
          }
          .certificate-print-wrap .mx-auto {
            width: 100% !important;
            max-width: 7.75in !important;
            margin: 0 auto !important;
          }
          .certificate-sheet {
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
            width: 100% !important;
            max-width: 100% !important;
            /* No transform:scale — scaling was making Save-as-PDF previews tiny */
            transform: none !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }
          .certificate-sheet .certificate-inner {
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 18px 22px 14px !important;
          }
          .certificate-sheet .certificate-inner .grid.grid-cols-3 > div:first-child .relative {
            height: 64px !important; min-height: 64px !important; width: 64px !important; min-width: 64px !important;
          }
          .certificate-sheet .certificate-inner .certificate-center-image {
            height: 76px !important; width: 76px !important; min-height: 76px !important; min-width: 76px !important;
          }
          .certificate-sheet .certificate-inner .grid.grid-cols-3 > div:last-child .relative {
            height: 64px !important; min-height: 64px !important; width: 64px !important; min-width: 64px !important;
          }
          /* Readable print sizes (avoid 9–11px text) */
          .certificate-sheet .certificate-inner .text-5xl { font-size: 2.1rem !important; line-height: 1.1 !important; }
          .certificate-sheet .certificate-inner .md\\:text-7xl { font-size: 2.5rem !important; line-height: 1.05 !important; }
          .certificate-sheet .certificate-inner .text-xl { font-size: 1.2rem !important; }
          .certificate-sheet .certificate-inner .md\\:text-3xl { font-size: 1.35rem !important; }
          .certificate-sheet .certificate-inner .text-2xl { font-size: 1.35rem !important; }
          .certificate-sheet .certificate-inner .text-base { font-size: 0.95rem !important; line-height: 1.45 !important; }
          .certificate-sheet .certificate-inner .md\\:text-lg { font-size: 1rem !important; line-height: 1.45 !important; }
          .certificate-sheet .certificate-inner .text-sm { font-size: 0.875rem !important; }
          .certificate-sheet .certificate-inner .text-xs { font-size: 0.8rem !important; }
          .certificate-sheet .certificate-inner .max-w-4xl { max-width: 100% !important; }
          .certificate-sheet .certificate-inner .max-w-3xl { max-width: 100% !important; }
        }
      `}} />
    <div className="mx-auto flex w-full max-w-6xl flex-col items-stretch print:max-w-[7.75in]">
        {/* Certificate sheet */}
        <div
          ref={sheetRef}
          className="certificate-sheet relative overflow-hidden rounded-md bg-white shadow-2xl"
        >
          {/* Border layer - clearly visible gold frame (responsive: thinner on mobile to match proportions) */}
          <div className="pointer-events-none absolute inset-0 z-0">
            {/* Outer band: visible tan/gold */}
            <div className="absolute inset-0 border-8 border-[#c9a861] sm:border-[12px] md:border-[16px]" style={{ borderColor: "#c9a861" }} />
            {/* Inner line: solid gold */}
            <div className="absolute inset-2 border-2 border-[#a67c2e] sm:inset-3 md:inset-4" style={{ borderColor: "#a67c2e", borderWidth: "2px" }} />
            {/* Corner L accents */}
            <div className="absolute left-2 top-2 h-8 w-8 border-l-2 border-t-2 border-[#a67c2e] sm:left-3 sm:top-3 sm:h-10 sm:w-10 md:left-4 md:top-4 md:h-12 md:w-12" style={{ borderColor: "#a67c2e", borderLeftWidth: "2px", borderTopWidth: "2px" }} />
            <div className="absolute right-2 top-2 h-8 w-8 border-r-2 border-t-2 border-[#a67c2e] sm:right-3 sm:top-3 sm:h-10 sm:w-10 md:right-4 md:top-4 md:h-12 md:w-12" style={{ borderColor: "#a67c2e", borderRightWidth: "2px", borderTopWidth: "2px" }} />
            <div className="absolute bottom-2 left-2 h-8 w-8 border-b-2 border-l-2 border-[#a67c2e] sm:bottom-3 sm:left-3 sm:h-10 sm:w-10 md:bottom-4 md:left-4 md:h-12 md:w-12" style={{ borderColor: "#a67c2e", borderBottomWidth: "2px", borderLeftWidth: "2px" }} />
            <div className="absolute bottom-2 right-2 h-8 w-8 border-b-2 border-r-2 border-[#a67c2e] sm:bottom-3 sm:right-3 sm:h-10 sm:w-10 md:bottom-4 md:right-4 md:h-12 md:w-12" style={{ borderColor: "#a67c2e", borderBottomWidth: "2px", borderRightWidth: "2px" }} />
          </div>

          <div className="certificate-inner relative z-10 px-6 pt-14 pb-8 sm:px-8 sm:pt-16 sm:pb-10 md:px-14 md:pt-20 md:pb-12 print:px-5 print:pt-6 print:pb-5">
            {/* Top row: left logo - center swami - right logo (same 3-col layout on all sizes) */}
            <div className="grid grid-cols-3 items-start gap-2 sm:gap-4 md:gap-6 print:gap-2">
              <div className="flex min-w-0 justify-start">
                <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20 md:h-24 md:w-24">
                  <Image src="/logo-left.jpeg" alt="Left logo" fill className="object-contain" />
                </div>
              </div>

              <div className="flex min-w-0 justify-center">
                <div className="certificate-center-image relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-[#c9a861]/60 sm:h-24 sm:w-24 md:h-28 md:w-28">
                  <Image src="/swami-circle.jpeg" alt="Swami" fill className="object-cover" />
                </div>
              </div>

              <div className="flex min-w-0 justify-end">
                <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20 md:h-24 md:w-24">
                  <Image src="/logo-right.jpeg" alt="Right logo" fill className="object-contain" />
                </div>
              </div>
            </div>

            {/* Headings */}
            <div className="mt-8 text-center certificate-heading-block print:mt-4">
              <div className="text-5xl font-extrabold tracking-[0.12em] text-[#a67c2e] md:text-7xl">
                VOLUNTEER
              </div>
              <div className="mt-2 text-xl font-bold tracking-[0.10em] text-[#c99a3b] md:text-3xl print:mt-1">
                CERTIFICATION OF APPRECIATION
              </div>
              <div className="mt-4 text-sm font-semibold text-zinc-700 md:text-base print:mt-2">
                This certificate is awarded with great pride to
              </div>

              {/* Name line */}
              <div className="mt-10 flex items-center justify-center print:mt-5">
                <div className="w-full max-w-3xl border-b-2 border-[#b68a33]/70 pb-3 text-center text-2xl font-semibold text-zinc-900 md:text-3xl">
                  {data.volunteerName}
                </div>
              </div>

              {/* Description */}
              <div className="mx-auto mt-10 max-w-4xl text-center text-base leading-relaxed text-zinc-700 md:text-lg print:mt-5 print:leading-snug">
                In recognition of the dedication and commitment shown in offering{" "}
                <span className="font-semibold text-zinc-900">{data.hours}</span>{" "}
                hour(s) of service through{" "}
                <span className="font-semibold text-zinc-900">
                  {data.activity && data.activity !== "Seva Activity" ? data.activity : "seva"}
                </span>{" "}
                towards the{" "}
                <span className="font-semibold text-zinc-900">{data.serviceType}</span>{" "}
                <span className="font-semibold text-zinc-900">{data.location}</span>
                {data.serviceDateFormatted && (
                  <span>
                    {" "}
                    on{" "}
                    <span className="font-semibold text-zinc-900">{data.serviceDateFormatted}</span>
                  </span>
                )}
                .
                <br />
                May Swami’s blessings be always with you.
              </div>
            </div>

            {/* Footer area: Issued on + Coordinator (same 2-col layout as desktop on all sizes) */}
            <div className="mt-10 grid grid-cols-2 items-end gap-4 sm:mt-12 sm:gap-6 md:mt-16 md:gap-10 print:mt-5 print:gap-3">
              <div className="text-left">
                <div className="text-xs font-semibold text-zinc-600 sm:text-sm">Issued on</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900 sm:text-base">{data.issuedOn}</div>
              </div>

              <div className="flex flex-col items-start text-left">
                <div className="w-full max-w-[8rem] border-b-2 border-[#b68a33]/70 sm:max-w-[12rem] md:max-w-[18rem] md:w-72" />
                <div className="mt-2 text-xs font-bold text-zinc-800 sm:mt-3 sm:text-sm">
                  {data.coordinatorTitle}
                </div>
              </div>
            </div>

            {/* Organization footer - full width above Print */}
            <div className="certificate-org-block mt-10 border-t border-[#c9a861]/40 pt-6 print:mt-4 print:pt-3">
              <div className="text-center text-sm font-semibold text-zinc-600">Organization</div>
              <div className="mt-2 text-center text-sm leading-relaxed text-zinc-700">
                {data.orgName}
              </div>
            </div>

            {/* Print / save — excluded from html2pdf capture */}
            <div className="mt-10 flex flex-col items-center gap-2 print:hidden" data-html2canvas-ignore="true">
              <button
                type="button"
                onClick={() => void handlePrintOrSavePdf()}
                disabled={pdfBusy}
                style={{ touchAction: "manipulation" }}
                className="rounded-md bg-[#a67c2e] px-6 py-3 font-semibold text-white shadow hover:brightness-95 disabled:opacity-70"
              >
                {pdfBusy ? "Generating PDF…" : "Print / Save as PDF"}
              </button>
              {pdfError ? <p className="max-w-md text-center text-sm text-red-700">{pdfError}</p> : null}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-lg text-center text-xs leading-relaxed text-zinc-600 print:hidden">
          <p>
            <strong>Print / Save as PDF:</strong> Output is sized for <strong>US Letter</strong> (8.5×11 in), the usual
            certificate paper in the U.S. On a <strong>phone or tablet</strong>, the button saves a PDF file directly. On
            a <strong>computer</strong>, it opens the print dialog — choose <strong>Save as PDF</strong> (or Microsoft
            Print to PDF). Set <strong>Scale to 100%</strong> — if the preview looks tiny, turn off &quot;Fit to page&quot;
            / &quot;Shrink oversized pages&quot; so the certificate fills the page.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CertificatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col items-center justify-center bg-[#f6eadc] py-16">
          <p>Loading…</p>
        </div>
      }
    >
      <CertificateContent />
    </Suspense>
  );
}
