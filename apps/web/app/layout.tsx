import "./globals.css";
import { SiteHeader } from "./_components/SiteHeader";
import { SiteFooter } from "./_components/SiteFooter";
import { SiteChatbot } from "./_components/SiteChatbot";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <div className="print:hidden">
          <SiteHeader />
        </div>

        <main className="flex-1">
          {children}
        </main>

        <div className="print:hidden">
          <SiteFooter />
        </div>

        <SiteChatbot />
      </body>
    </html>
  );
}
