"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { SiteFooter } from "./SiteFooter";
import { shouldHideFooterAndChatbot } from "./eventPagesNoChrome";

export function ConditionalSiteFooter() {
  const pathname = usePathname();
  try {
    const searchParams = useSearchParams();
    const searchParamsObj = searchParams ? Object.fromEntries(searchParams.entries()) : undefined;
    if (shouldHideFooterAndChatbot(pathname, searchParamsObj)) return null;
  } catch {
    // If useSearchParams fails during prerendering, just check pathname
    if (shouldHideFooterAndChatbot(pathname)) return null;
  }
  
  return <SiteFooter />;
}
