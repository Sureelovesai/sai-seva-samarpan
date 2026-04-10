"use client";

import { usePathname } from "next/navigation";
import { shouldHideSiteHeader } from "./eventPagesNoChrome";
import { SiteHeader } from "./SiteHeader";

/** Hide main site header (logo + full menu) on public Events and Event Admin pages. */
export function ConditionalSiteHeader() {
  const pathname = usePathname();
  if (shouldHideSiteHeader(pathname)) return null;
  return <SiteHeader />;
}
