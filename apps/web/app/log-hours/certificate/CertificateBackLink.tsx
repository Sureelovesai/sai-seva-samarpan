"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function CertificateBackLink() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const from = sp.get("from");
  const isPrepare = pathname.includes("/certificate/prepare");
  const isDashboard = from === "dashboard";
  const href = isPrepare && isDashboard ? "/dashboard#dashboard-your-logged-hours" : "/log-hours";
  const label = isPrepare && isDashboard ? "← Back to My Seva Dashboard" : "← Back to Log hours";

  return (
    <Link href={href} className="text-sm font-medium text-[#8b6914] underline-offset-2 hover:underline">
      {label}
    </Link>
  );
}
