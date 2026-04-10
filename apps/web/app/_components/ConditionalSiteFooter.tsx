"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./SiteFooter";
import { shouldHideFooterAndChatbot } from "./eventPagesNoChrome";

export function ConditionalSiteFooter() {
  const pathname = usePathname();
  if (shouldHideFooterAndChatbot(pathname)) return null;
  return <SiteFooter />;
}
