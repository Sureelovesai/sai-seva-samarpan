function isEventAdminPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin/events-dashboard") ||
    pathname.startsWith("/admin/add-event") ||
    pathname.startsWith("/admin/manage-events") ||
    pathname.startsWith("/admin/event-signups")
  );
}

/** Check if user is being redirected from admin pages (via 'next' parameter in login) */
function isRedirectedFromAdminPath(nextParam: string | null): boolean {
  if (!nextParam) return false;
  try {
    const nextPath = new URL(nextParam, "http://localhost").pathname;
    return isEventAdminPath(nextPath);
  } catch {
    return false;
  }
}

/** Volunteer certificate (print view): immersive page — no global header (back link in route layout). */
function isLogHoursCertificatePath(pathname: string): boolean {
  return pathname === "/log-hours/certificate" || pathname.startsWith("/log-hours/certificate/");
}

function isSevaMahotsavamLandingPath(pathname: string): boolean {
  return pathname === "/seva-mahotsavam" || pathname.startsWith("/seva-mahotsavam/");
}

/** Public /events and Event Admin: no main site header (logo + menu). */
export function shouldHideSiteHeader(pathname: string | null, searchParams?: Record<string, string | string[] | undefined>): boolean {
  if (!pathname) return false;
  if (isSevaMahotsavamLandingPath(pathname)) return true;
  if (isLogHoursCertificatePath(pathname)) return true;
  if (pathname === "/events" || pathname.startsWith("/events/")) return true;
  
  // Hide header on event admin pages
  if (isEventAdminPath(pathname)) return true;
  
  // Hide header on login page when redirected from event admin pages
  if (pathname === "/login" && searchParams?.next) {
    const nextParam = Array.isArray(searchParams.next) ? searchParams.next[0] : searchParams.next;
    if (isRedirectedFromAdminPath(nextParam)) return true;
  }
  
  return false;
}

/**
 * Public Events pages and Event Admin area: no site footer, no chatbot (matches header hidden on /events).
 */
export function shouldHideFooterAndChatbot(pathname: string | null, searchParams?: Record<string, string | string[] | undefined>): boolean {
  if (!pathname) return false;
  if (isSevaMahotsavamLandingPath(pathname)) return true;
  if (isLogHoursCertificatePath(pathname)) return true;
  if (pathname === "/events" || pathname.startsWith("/events/")) return true;
  
  // Hide footer on event admin pages
  if (isEventAdminPath(pathname)) return true;
  
  // Hide footer on login page when redirected from event admin pages
  if (pathname === "/login" && searchParams?.next) {
    const nextParam = Array.isArray(searchParams.next) ? searchParams.next[0] : searchParams.next;
    if (isRedirectedFromAdminPath(nextParam)) return true;
  }
  
  return false;
}
