import Link from "next/link";

/**
 * Centers the certificate in the viewport (equal space top/bottom). Uses grid + min-h-svh so
 * layout does not depend on a fragile flex % height chain from <main>.
 */
export default function CertificateRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="certificate-print-wrap certificate-route-shell relative flex w-full flex-1 flex-col bg-[#f6eadc] print:block print:min-h-0">
      <nav className="print:hidden absolute left-4 top-6 z-10 sm:left-6 sm:top-8">
        <Link href="/log-hours" className="text-sm font-medium text-[#8b6914] underline-offset-2 hover:underline">
          ← Back to Log hours
        </Link>
      </nav>
      {/* min-h-svh: at least one viewport tall so place-items centers the card even if <main> height is ambiguous */}
      <div className="box-border grid min-h-svh w-full flex-1 place-items-center px-4 py-6 sm:py-8 print:min-h-0 print:block print:place-items-stretch print:px-0 print:py-0">
        {children}
      </div>
    </div>
  );
}
