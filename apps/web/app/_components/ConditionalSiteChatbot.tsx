"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { SiteChatbot } from "./SiteChatbot";
import { shouldHideFooterAndChatbot } from "./eventPagesNoChrome";

export function ConditionalSiteChatbot() {
  const pathname = usePathname();
  try {
    const searchParams = useSearchParams();
    const searchParamsObj = searchParams ? Object.fromEntries(searchParams.entries()) : undefined;
    if (shouldHideFooterAndChatbot(pathname, searchParamsObj)) return null;
  } catch {
    // If useSearchParams fails during prerendering, just check pathname
    if (shouldHideFooterAndChatbot(pathname)) return null;
  }
  
  return <SiteChatbot />;
}
