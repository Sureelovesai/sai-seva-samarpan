import { Suspense } from "react";
import { AppPageLoader } from "@/app/_components/AppPageLoader";
import SevaBlogClient from "./SevaBlogClient";

export default function SevaBlogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] bg-[#fdf2f0]">
          <AppPageLoader
            layout="section"
            label="Loading Seva Blog"
            message="Loading stories…"
            size="lg"
            className="py-20"
          />
        </div>
      }
    >
      <SevaBlogClient />
    </Suspense>
  );
}
