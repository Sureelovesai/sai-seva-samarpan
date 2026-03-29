import { Suspense } from "react";
import SevaBlogClient from "./SevaBlogClient";

export default function SevaBlogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-[#fdf2f0]">
          <p className="text-[#6b5344]">Loading Seva stories…</p>
        </div>
      }
    >
      <SevaBlogClient />
    </Suspense>
  );
}
