import { Suspense } from "react";
import { BlogReportView } from "@/app/_components/BlogReportView";

export default function BlogReportPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-zinc-600">Loading…</div>
      }
    >
      <BlogReportView />
    </Suspense>
  );
}
