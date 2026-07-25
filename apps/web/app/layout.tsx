import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ConditionalSiteChatbot } from "./_components/ConditionalSiteChatbot";
import { ConditionalSiteFooter } from "./_components/ConditionalSiteFooter";
import { MinimalSiteHeader } from "./_components/MinimalSiteHeader";
import { NotificationPrompt } from "./_components/NotificationPrompt";
import { ForegroundNotificationListener } from "./_components/ForegroundNotificationListener";
import { Sidebar } from "./_components/Sidebar";

export const metadata: Metadata = {
  title: "Sai Seva Portal",
  description:
    "A platform for managing and tracking service activities, volunteer hours, and community outreach.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sai Seva",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sevaportal.org",
    siteName: "Sai Seva Portal",
    title: "Sai Seva Portal",
    description:
      "A platform for managing and tracking service activities, volunteer hours, and community outreach.",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Sai Seva Portal Logo",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#1f2937",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sai Seva" />
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="m-0 p-0 bg-white dark:bg-black overflow-x-hidden">
        {/* Global error handler to catch Safari errors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__errors = [];
              window.addEventListener('error', (event) => {
                console.error('[Global Error]', event.error);
                window.__errors.push({
                  message: event.error?.message || event.message,
                  stack: event.error?.stack,
                  source: event.filename,
                  lineno: event.lineno,
                  colno: event.colno,
                  timestamp: new Date().toISOString()
                });
                // Show error banner
                const banner = document.createElement('div');
                banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff3333;color:white;padding:10px;z-index:99999;font-family:monospace;font-size:12px;';
                banner.textContent = 'ERROR: ' + (event.error?.message || event.message);
                document.body.insertBefore(banner, document.body.firstChild);
              });
              
              window.addEventListener('unhandledrejection', (event) => {
                console.error('[Unhandled Rejection]', event.reason);
                window.__errors.push({
                  type: 'unhandledRejection',
                  message: event.reason?.message || String(event.reason),
                  timestamp: new Date().toISOString()
                });
              });
            `,
          }}
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', async () => {
                  try {
                    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                    console.log('[App] Main Service Worker registered:', registration);
                  } catch (error) {
                    console.error('[App] Service Worker registration failed:', error);
                  }
                });
              }
            `,
          }}
        />

        {/* Sidebar Navigation - Fixed Positioning */}
        <Sidebar />

        {/* Header - Must account for sidebar */}
        <div className="print:hidden header-wrapper">
          <MinimalSiteHeader />
        </div>

        {/* Notifications & Listeners */}
        <NotificationPrompt />
        <ForegroundNotificationListener />

        {/* Main Content */}
        <main className="w-full">
          {children}
        </main>

        {/* Footer */}
        <div className="print:hidden">
          <ConditionalSiteFooter />
        </div>

        {/* Chatbot */}
        <ConditionalSiteChatbot />
      </body>
    </html>
  );
}
