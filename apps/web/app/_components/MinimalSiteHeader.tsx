"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NotificationBell } from "./NotificationBell";

type AuthUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
} | null;

/**
 * Minimal Header - Works with Sidebar
 * Shows logo, branding, user info, and mobile hamburger button
 * Navigation moved to Sidebar component
 */
export function MinimalSiteHeader() {
  const [user, setUser] = useState<AuthUser>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogout = () => {
    // Clear user from state immediately for instant UI feedback
    setUser(null);
    
    fetch("/api/auth/logout", { method: "POST" })
      .then(() => {
        window.location.href = "/login";
      })
      .catch((err) => {
        console.error("[Header] Logout error:", err);
        // If logout fails, fetch auth status again
        checkAuth();
      });
  };

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        // The endpoint returns { user: { ... } }
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("[Header] Auth check failed:", err);
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  };

  const openMobileMenu = () => {
    const event = new CustomEvent("openMobileMenu");
    window.dispatchEvent(event);
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="mx-auto max-w-full px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 min-w-0">
          {/* Mobile Hamburger Button - Only on mobile */}
          {isMobile && (
            <button
              onClick={openMobileMenu}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Open menu"
              aria-label="Open navigation menu"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Logo / Branding */}
          <Link href="/" className="flex flex-shrink-0 items-center gap-2 overflow-hidden min-w-0">
            <img
              src="/logo.png"
              alt="Sai Seva Portal"
              width={156}
              height={72}
              fetchPriority="high"
              className="h-12 sm:h-14 md:h-16 w-auto object-contain"
            />
          </Link>

          {/* Spacer */}
          <div className="hidden sm:block flex-1" />

          {/* Notifications & User Info */}
          {authChecked && (
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
              {user && (
                <NotificationBell />
              )}
              {user ? (
                <>
                  <div className="hidden md:block text-right">
                    <p className="text-xs md:text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.firstName || user.name || user.email}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate hidden lg:block">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center flex-shrink-0 rounded-md bg-red-50 dark:bg-red-900/20 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors whitespace-nowrap"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center flex-shrink-0 rounded-md bg-blue-600 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Login
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
