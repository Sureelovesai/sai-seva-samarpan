function isEventAdminPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/events-dashboard") ||
    pathname.startsWith("/admin/add-event") ||
    pathname.startsWith("/admin/manage-events") ||
    pathname.startsWith("/admin/event-signups")
  );
}

/** Public /events and Event Admin: no main site header (logo + menu). */
export function shouldHideSiteHeader(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/events" || pathname.startsWith("/events/")) return true;
  return isEventAdminPath(pathname);
}

/**
 * Public Events pages and Event Admin area: no site footer, no chatbot (matches header hidden on /events).
 */
export function shouldHideFooterAndChatbot(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/events" || pathname.startsWith("/events/")) return true;
  return isEventAdminPath(pathname);
}
