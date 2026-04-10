import "./globals.css";
import { ConditionalSiteChatbot } from "./_components/ConditionalSiteChatbot";
import { ConditionalSiteFooter } from "./_components/ConditionalSiteFooter";
import { ConditionalSiteHeader } from "./_components/ConditionalSiteHeader";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <div className="print:hidden">
          <ConditionalSiteHeader />
        </div>

        <main className="flex-1">
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
