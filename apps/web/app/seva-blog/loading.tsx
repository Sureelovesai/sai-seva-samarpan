import { AppPageLoader } from "@/app/_components/AppPageLoader";

/** Shown during segment navigation while the Seva Blog shell prepares. */
export default function SevaBlogLoading() {
  return (
    <div className="min-h-[60vh] bg-[#fdf2f0]">
      <AppPageLoader
        layout="section"
        label="Loading Seva Blog"
        message="Loading stories…"
        size="lg"
        className="py-20"
      />
    </div>
  );
}
