"use client";

import { usePathname } from "next/navigation";
import { SiteChatbot } from "./SiteChatbot";
import { shouldHideFooterAndChatbot } from "./eventPagesNoChrome";

export function ConditionalSiteChatbot() {
  const pathname = usePathname();
  if (shouldHideFooterAndChatbot(pathname)) return null;
  return <SiteChatbot />;
}
