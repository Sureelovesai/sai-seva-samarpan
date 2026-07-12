import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ConditionalSiteChatbot } from "./_components/ConditionalSiteChatbot";
import { ConditionalSiteFooter } from "./_components/ConditionalSiteFooter";
import { ConditionalSiteHeader } from "./_components/ConditionalSiteHeader";
import { NotificationPrompt } from "./_components/NotificationPrompt";
import { ForegroundNotificationListener } from "./_components/ForegroundNotificationListener";

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
      <body className="flex min-h-screen flex-col">
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
        <div className="print:hidden">
          <ConditionalSiteHeader />
        </div>

        <NotificationPrompt />
        <ForegroundNotificationListener />

        <main className="flex min-h-0 flex-1 flex-col self-stretch">
          {children}
        </main>

        <div className="print:hidden">
          <ConditionalSiteFooter />
        </div>

        <ConditionalSiteChatbot />
      </body>
    </html>
  );
}
