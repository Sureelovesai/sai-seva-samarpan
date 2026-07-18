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
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (err) {
        console.error("[Header] Auth check failed:", err);
      } finally {
        setAuthChecked(true);
      }
    };

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
    fetch("/api/auth/logout", { method: "POST" })
      .then(() => {
        window.location.href = "/login";
      })
      .catch(console.error);
  };

  const openMobileMenu = () => {
    const event = new CustomEvent("openMobileMenu");
    window.dispatchEvent(event);
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="mx-auto max-w-full px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          {/* Mobile Hamburger Button - Only on mobile */}
          {isMobile && (
            <button
              onClick={openMobileMenu}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Open menu"
              aria-label="Open navigation menu"
            >
              <svg className="w-6 h-6 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Logo / Branding */}
          <Link href="/" className="flex shrink-0 items-center gap-2 overflow-hidden">
            <img
              src="/logo.png"
              alt="Sai Seva Portal"
              width={156}
              height={72}
              fetchPriority="high"
              className="h-16 w-auto object-contain"
            />
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Notifications & User Info */}
          {authChecked && (
            <div className="flex items-center gap-3">
              {user && (
                <NotificationBell />
              )}
              {user ? (
                <div className="flex items-center gap-3 text-right">
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.firstName || user.name || user.email}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
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
