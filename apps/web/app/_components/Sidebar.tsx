"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  requiresAuth?: boolean;
  adminOnly?: boolean;
  eventAdminOnly?: boolean;
  subItems?: NavItem[];
}

// Main navigation items
const PUBLIC_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: "🏠" },
  { label: "Find Seva", href: "/find-seva", icon: "🙏" },
  { label: "Seva Blog", href: "/seva-blog", icon: "📝" },
];

const AUTH_NAV_ITEMS: NavItem[] = [
  { label: "My Seva Dashboard", href: "/dashboard", icon: "📊", requiresAuth: true },
];

const COMMUNITY_NAV: NavItem = {
  label: "Community Network",
  href: "/community-outreach",
  icon: "🤝",
  subItems: [
    { label: "Community Network", href: "/community-outreach", icon: "🤝" },
    { label: "Find Community Activity", href: "/find-community-activity", icon: "🔍" },
    { label: "Partner Organizations", href: "/partner-organizations", icon: "🏢" },
  ],
};

const ABOUT_NAV: NavItem = {
  label: "About Us",
  href: "#",
  icon: "ℹ️",
  subItems: [
    { label: "Sri Sathya Sai Global Council", href: "https://www.srisathyasaiglobalcouncil.org/", icon: "🌍" },
    { label: "Foundation", href: "https://www.sssgcf.org/", icon: "🏛️" },
  ],
};

const RESOURCES_NAV: NavItem = {
  label: "Resources",
  href: "#",
  icon: "📚",
  subItems: [
    { label: "Divine Directives", href: "https://ssssoindia.org/divine-directives-guidelines/", icon: "✨" },
    { label: "Sahithya", href: "https://www.ssssahitya.org/", icon: "📖" },
    { label: "Media Centre", href: "https://www.sssmediacentre.org/", icon: "🎬" },
  ],
};

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Seva Admin Dashboard", href: "/admin/seva-dashboard", icon: "⚙️", adminOnly: true },
  { label: "Roles", href: "/admin/roles", icon: "👥", adminOnly: true },
];

const EVENT_ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Event Admin Dashboard", href: "/admin/events-dashboard", icon: "📋", eventAdminOnly: true },
];

const NOTIFICATIONS_NAV: NavItem = {
  label: "Notifications",
  href: "/dashboard/notifications",
  icon: "🔔",
  requiresAuth: true,
};

const EVENTS_NAV: NavItem = {
  label: "Events",
  href: "/events",
  icon: "📅",
};

interface User {
  id: string;
  email: string;
  roles?: string[];
  role?: string;
  eventAdminOnly?: boolean;
}

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true); // Default expanded
  const [isMobile, setIsMobile] = useState(false);
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Force no-cache on mobile to ensure fresh user data
        const cacheMode = isMobile ? 'no-store' : 'default';
        const response = await fetch("/api/auth/me", { cache: cacheMode });
        if (response.ok) {
          const data = await response.json();
          // The endpoint returns { user: { ... } }
          setUser(data.user || null);
          console.log("[Sidebar] User data loaded:", {
            email: data.user?.email,
            roles: data.user?.roles,
            isAdmin: data.user?.roles?.includes("ADMIN"),
            isMobile: isMobile
          });
        } else {
          console.warn("[Sidebar] Auth response not OK:", response.status);
          setUser(null);
        }
      } catch (err) {
        console.error("[Sidebar] Error fetching user:", err);
        setUser(null);
      }
    };

    fetchUser();
  }, [isMobile]);

  // Listen for auth changes (login/logout) to refresh user data
  useEffect(() => {
    const handleAuthChange = () => {
      console.log("[Sidebar] Auth changed event received, refetching user");
      // Trigger a re-fetch by simulating isMobile change
      const cacheMode = isMobile ? 'no-store' : 'default';
      fetch("/api/auth/me", { cache: cacheMode })
        .then(res => res.ok ? res.json() : { user: null })
        .then(data => {
          setUser(data.user || null);
          console.log("[Sidebar] User data refreshed after auth change:", data.user?.roles);
        })
        .catch(err => console.error("[Sidebar] Error refreshing user:", err));
    };

    window.addEventListener("auth-changed", handleAuthChange);
    return () => window.removeEventListener("auth-changed", handleAuthChange);
  }, [isMobile]);

  // Detect mobile
  useEffect(() => {
    const handleResize = () => {
      const isMobileSize = window.innerWidth < 768;
      setIsMobile(isMobileSize);
      if (!isMobileSize) {
        setIsExpanded(true); // Always expanded on desktop
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle click outside to collapse (DESKTOP ONLY - not mobile)
  useEffect(() => {
    if (isMobile) return; // Skip for mobile
    
    const handleClickOutside = (event: MouseEvent) => {
      if (isExpanded && sidebarRef.current) {
        if (!sidebarRef.current.contains(event.target as Node)) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded, isMobile]);

  // Reset sidebar state on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setIsExpanded(false);
      setExpandedDropdown(null);
    }
  }, [pathname, isMobile]);

  // Listen for mobile menu open event from header
  useEffect(() => {
    const handleOpenMenu = () => {
      if (isMobile) {
        setIsExpanded(true);
      }
    };

    window.addEventListener("openMobileMenu", handleOpenMenu);
    return () => window.removeEventListener("openMobileMenu", handleOpenMenu);
  }, [isMobile]);

  // Check user roles
  const isAdmin = user?.roles?.includes("ADMIN");
  const isEventAdmin = user?.eventAdminOnly || user?.roles?.includes("EVENT_ADMIN");
  const canSevaAdminRow = 
    user?.roles?.includes("ADMIN") ||
    user?.roles?.includes("SEVA_COORDINATOR") ||
    user?.roles?.includes("REGIONAL_SEVA_COORDINATOR") ||
    user?.roles?.includes("NATIONAL_SEVA_COORDINATOR") ||
    user?.roles?.includes("BLOG_ADMIN");
  const canSeeRoles = user?.roles?.includes("ADMIN");

  // Build navigation
  const getNavItems = (): NavItem[] => {
    let items: NavItem[] = [...PUBLIC_NAV_ITEMS];
    items.push(COMMUNITY_NAV, ABOUT_NAV, RESOURCES_NAV);

    if (user) {
      console.log("[Sidebar] User authenticated, adding auth items");
      items = [...items, ...AUTH_NAV_ITEMS];
    } else {
      console.log("[Sidebar] No user data, skipping auth items");
    }

    if (canSevaAdminRow) {
      console.log("[Sidebar] User can see seva admin row, adding admin items");
      if (canSeeRoles) {
        // ADMIN only: show all admin items including Roles
        items = [...items, ...ADMIN_NAV_ITEMS];
      } else {
        // Coordinators/BLOG_ADMIN: show only Seva Admin Dashboard (not Roles)
        items = [...items, ...ADMIN_NAV_ITEMS.filter((l) => l.href !== "/admin/roles")];
      }
    } else {
      console.log("[Sidebar] User cannot see seva admin row, skipping admin items");
    }

    if (isEventAdmin) {
      console.log("[Sidebar] User is EVENT_ADMIN, adding event admin items");
      items = [...items, ...EVENT_ADMIN_NAV_ITEMS];
    }

    // Add Events and Notifications (Events just before Notifications)
    if (user) {
      items.push(EVENTS_NAV);
      items.push(NOTIFICATIONS_NAV);
    }

    console.log("[Sidebar] Final nav items count:", items.length);
    return items;
  };

  const navItems = getNavItems();
  const isActive = (href: string) => {
    if (href === "#") return false;
    if (href.startsWith("http")) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const renderNavItem = (item: NavItem) => {
    if (item.subItems && item.subItems.length > 0) {
      const isExpandedDropdown = expandedDropdown === item.label;
      return (
        <div key={item.label}>
          <button
            onClick={() => setExpandedDropdown(isExpandedDropdown ? null : item.label)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
              ${
                isExpandedDropdown
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }
            `}
            title={!isExpanded ? item.label : ""}
          >
            <span className="text-xl flex-shrink-0">{item.icon}</span>
            {isExpanded && (
              <>
                <span className="truncate flex-1 text-left font-medium">{item.label}</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${
                    isExpandedDropdown ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </>
            )}
          </button>

          {isExpandedDropdown && isExpanded && (
            <div className="mt-1 ml-6 space-y-1 border-l-2 border-blue-200 dark:border-blue-800 pl-3">
              {item.subItems.map((subItem) => (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  target={subItem.href.startsWith("http") ? "_blank" : undefined}
                  rel={subItem.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm
                    ${
                      isActive(subItem.href)
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }
                  `}
                >
                  <span className="text-lg flex-shrink-0">{subItem.icon}</span>
                  <span className="truncate">{subItem.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <Link
          key={item.href}
          href={item.href}
          target={item.href.startsWith("http") ? "_blank" : undefined}
          rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
            ${
              isActive(item.href)
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 font-semibold"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }
          `}
          title={!isExpanded ? item.label : ""}
        >
          <span className="text-xl flex-shrink-0">{item.icon}</span>
          {isExpanded && <span className="truncate">{item.label}</span>}
        </Link>
      );
    }
  };

  // Sidebar width based on state
  const sidebarWidth = isExpanded ? 320 : 96; // 320px expanded, 96px collapsed

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isExpanded && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Sidebar - Visible on desktop always, on mobile only when expanded */}
      {(!isMobile || isExpanded) && (
      <aside
        ref={sidebarRef}
        onClick={() => {
          if (!isExpanded && !isMobile) {
            setIsExpanded(true);
          }
        }}
        className={`${isMobile ? 'fixed' : 'fixed'} left-0 top-0 h-screen bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 z-50 flex flex-col transition-all duration-300 ease-in-out ${!isMobile ? 'cursor-pointer' : ''}`}
        style={{
          width: `${sidebarWidth}px`,
        }}
      >
        {/* Sidebar Header with Logo */}
        <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400 leading-tight">Sai Seva</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Portal</div>
            </div>
          )}
          {!isMobile && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 flex-shrink-0"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              <svg
                className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? "" : "rotate-180"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-1.5 space-y-0">{navItems.map(renderNavItem)}</nav>

        {/* Sidebar Footer - Now empty since NotificationBell moved to header */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-2 flex justify-center flex-shrink-0">
        </div>
      </aside>
      )} {/* End of sidebar conditional */}

      {/* Dynamic spacing for content - NOT NEEDED, Sidebar CSS handles it */}

      <style>{`
        .header-wrapper {
          margin-left: ${isMobile ? 0 : sidebarWidth}px;
          transition: margin-left 0.3s ease-in-out;
          box-sizing: border-box;
        }
        
        main {
          margin-left: ${isMobile ? 0 : sidebarWidth}px;
          margin-top: 20px;
          transition: margin-left 0.3s ease-in-out;
          box-sizing: border-box;
          width: auto;
          padding-right: 0;
        }
        
        footer {
          margin-left: ${isMobile ? 0 : sidebarWidth}px;
          transition: margin-left 0.3s ease-in-out;
          box-sizing: border-box;
        }
        
        @media (max-width: 767px) {
          .header-wrapper, main, footer {
            margin-left: 0;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
