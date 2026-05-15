import { Suspense } from "react";
import { AppPageLoader } from "@/app/_components/AppPageLoader";
import { BlogReportView } from "@/app/_components/BlogReportView";

export default function BlogReportPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16">
          <AppPageLoader layout="section" label="Loading report" message="Loading…" size="lg" />
        </div>
      }
    >
      <BlogReportView />
    </Suspense>
  );
}
