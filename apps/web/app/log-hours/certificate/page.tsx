"use client";

import Image from "next/image";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

function formatDateFromInput(yyyyMmDd: string) {
  if (!yyyyMmDd) return "";
  const d = new Date(yyyyMmDd + "T00:00:00");
  if (Number.isNaN(d.getTime())) return yyyyMmDd;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function CertificateContent() {
  const sp = useSearchParams();

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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: portrait; margin: 0.4in; }
          body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .certificate-print-wrap { padding: 0 !important; padding-top: 0.5in !important; background: #f6eadc !important; min-height: 0 !important; }
          .certificate-print-wrap .mx-auto { max-width: 100% !important; }
          .certificate-sheet {
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
            transform: scale(0.82);
            transform-origin: top center;
            margin-top: 0.35in;
          }
          .certificate-sheet .certificate-inner {
            padding: 28px 24px 16px !important;
          }
          .certificate-sheet .certificate-inner .text-5xl { font-size: 1.75rem !important; }
          .certificate-sheet .certificate-inner .md\\:text-7xl { font-size: 2rem !important; }
          .certificate-sheet .certificate-inner .text-xl { font-size: 0.9rem !important; }
          .certificate-sheet .certificate-inner .md\\:text-3xl { font-size: 1rem !important; }
          .certificate-sheet .certificate-inner .text-2xl { font-size: 1rem !important; }
          .certificate-sheet .certificate-inner .md\\:text-3xl { font-size: 1.1rem !important; }
          .certificate-sheet .certificate-inner .text-base { font-size: 11px !important; }
          .certificate-sheet .certificate-inner .md\\:text-lg { font-size: 11px !important; }
          .certificate-sheet .certificate-inner .text-sm { font-size: 10px !important; }
          .certificate-sheet .certificate-inner .h-16 { height: 36px !important; min-height: 36px !important; }
          .certificate-sheet .certificate-inner .h-20 { height: 40px !important; min-height: 40px !important; }
          .certificate-sheet .certificate-inner .sm\\:h-20 { height: 40px !important; }
          .certificate-sheet .certificate-inner .md\\:h-24 { height: 44px !important; }
          .certificate-sheet .certificate-inner .md\\:h-28 { height: 48px !important; }
        }
      `}} />
    <div className="min-h-screen bg-[#f6eadc] py-8 px-4 certificate-print-wrap print:py-0 print:px-0">
      <div className="mx-auto w-full max-w-6xl">
        {/* Certificate sheet */}
        <div className="certificate-sheet relative overflow-hidden rounded-md bg-white shadow-2xl">
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

          <div className="certificate-inner relative z-10 px-6 pt-14 pb-8 sm:px-8 sm:pt-16 sm:pb-10 md:px-14 md:pt-20 md:pb-12">
            {/* Top row: left logo - center swami - right logo (same 3-col layout on all sizes) */}
            <div className="grid grid-cols-3 items-start gap-2 sm:gap-4 md:gap-6">
              <div className="flex min-w-0 justify-start">
                <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20 md:h-24 md:w-24">
                  <Image src="/logo-left.jpeg" alt="Left logo" fill className="object-contain" />
                </div>
              </div>

              <div className="flex min-w-0 justify-center">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-[#c9a861]/60 sm:h-24 sm:w-24 md:h-28 md:w-28">
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
            <div className="mt-8 text-center">
              <div className="text-5xl font-extrabold tracking-[0.12em] text-[#a67c2e] md:text-7xl">
                VOLUNTEER
              </div>
              <div className="mt-2 text-xl font-bold tracking-[0.10em] text-[#c99a3b] md:text-3xl">
                CERTIFICATION OF APPRECIATION
              </div>
              <div className="mt-4 text-sm font-semibold text-zinc-700 md:text-base">
                This certificate is awarded with great pride to
              </div>

              {/* Name line */}
              <div className="mt-10 flex items-center justify-center">
                <div className="w-full max-w-3xl border-b-2 border-[#b68a33]/70 pb-3 text-center text-2xl font-semibold text-zinc-900 md:text-3xl">
                  {data.volunteerName}
                </div>
              </div>

              {/* Description */}
              <div className="mx-auto mt-10 max-w-4xl text-center text-base leading-relaxed text-zinc-700 md:text-lg">
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
                  <> on <span className="font-semibold text-zinc-900">{data.serviceDateFormatted}</span></>
                )}
                .
                <br />
                May Swami’s blessings be always with you.
              </div>
            </div>

            {/* Footer area: Issued on + Coordinator (same 2-col layout as desktop on all sizes) */}
            <div className="mt-10 grid grid-cols-2 items-end gap-4 sm:mt-12 sm:gap-6 md:mt-16 md:gap-10">
              <div className="text-left">
                <div className="text-xs font-semibold text-zinc-600 sm:text-sm">Issued on</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900 sm:text-base">{data.issuedOn}</div>
              </div>

              <div className="flex flex-col items-end text-right">
                <div className="w-full max-w-[8rem] border-b-2 border-[#b68a33]/70 sm:max-w-[12rem] md:max-w-[18rem] md:w-72" />
                <div className="mt-2 text-xs font-bold text-zinc-800 sm:mt-3 sm:text-sm">
                  {data.coordinatorTitle}
                </div>
              </div>
            </div>

            {/* Organization footer - full width above Print */}
            <div className="mt-10 border-t border-[#c9a861]/40 pt-6">
              <div className="text-center text-sm font-semibold text-zinc-600">Organization</div>
              <div className="mt-2 text-center text-sm leading-relaxed text-zinc-700">
                {data.orgName}
              </div>
            </div>

            {/* Print button */}
            <div className="mt-10 flex justify-center gap-4 print:hidden">
              <button
                onClick={() => window.print()}
                className="rounded-md bg-[#a67c2e] px-6 py-3 font-semibold text-white shadow hover:brightness-95"
              >
                Print / Save as PDF
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-zinc-600 print:hidden">
          Tip: Use the Print button to save as PDF.
        </div>
      </div>
    </div>
    </>
  );
}

export default function CertificatePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f6eadc]"><p>Loading…</p></div>}>
      <CertificateContent />
    </Suspense>
  );
}
