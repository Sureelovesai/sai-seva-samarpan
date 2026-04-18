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
      <body className="flex min-h-screen flex-col">
        <div className="print:hidden">
          <ConditionalSiteHeader />
        </div>

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
