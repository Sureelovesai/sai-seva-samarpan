"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { shouldHideSiteHeader } from "./eventPagesNoChrome";
import { SiteHeader } from "./SiteHeader";

/** Hide main site header (logo + full menu) on public Events and Event Admin pages. */
export function ConditionalSiteHeader() {
  const pathname = usePathname();
  try {
    const searchParams = useSearchParams();
    const searchParamsObj = searchParams ? Object.fromEntries(searchParams.entries()) : undefined;
    if (shouldHideSiteHeader(pathname, searchParamsObj)) return null;
  } catch {
    // If useSearchParams fails during prerendering, just check pathname
    if (shouldHideSiteHeader(pathname)) return null;
  }
  
  return <SiteHeader />;
}
