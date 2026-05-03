"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { RichTextEditor } from "@/app/seva-blog/RichTextEditor";
import { downloadElementAsPdf } from "@/lib/htmlToPdf";
import {
  normalizeReportBodyHtml,
  sanitizeReportHtml,
} from "@/lib/reportBodyHtml";
import { normalizeBackdropPhotoUrl } from "@/lib/articleCanvasPresentation";
import {
  DEFAULT_REPORT_PRESENTATION,
  REPORT_BACKGROUND_OPTIONS,
  REPORT_BODY_PROSE_CLASS,
  REPORT_BORDER_OPTIONS,
  REPORT_PAGED_BACKDROP_STRIP_HEIGHT_PDF,
  type ReportPresentation,
  getReportBodyShellLayers,
  normalizePresentation,
  reportPresentationForReading,
  reportUsesPagedBackdropPhoto,
} from "@/lib/reportPresentation";
import { ReportPagedBackdropShell } from "@/app/_components/ReportPagedBackdropShell";

const REPORT_BACKDROP_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

/** Match A4 height so short reports still rasterize a full page; backdrop `cover` uses this frame (see article canvas min-height). */
const REPORT_PDF_CAPTURE_MIN_HEIGHT = "297mm";

function reportPdfBackdropFillsFrame(p: ReportPresentation): boolean {
  const url = normalizeBackdropPhotoUrl(p.backdropPhotoUrl);
  return Boolean(url && p.backdropPhotoOpacity > 0);
}

type SourcePostRow = {
  id: string;
  title: string;
  section: string;
  authorName: string | null;
  createdAt: string;
  centerCity: string | null;
  sevaCategory: string | null;
  sevaDate: string | null;
};

type ReportApi = {
  id: string;
  reportTitle: string | null;
  createdAt: string;
  updatedAt: string;
  dateFrom: string;
  dateTo: string;
  centerFilter: string | null;
  regionFilter: string | null;
  sevaCategoryFilter: string | null;
  targetWordCount: number;
  userInstructions: string | null;
  generatedBody: string;
  editedBody: string | null;
  presentation?: ReportPresentation;
  sourcePostCount: number;
  sourcePosts: SourcePostRow[];
  canEdit: boolean;
};

function formatListDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function safeFileBase(s: string): string {
  return s.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80) || "blog-report";
}

type ReportListRow = {
  id: string;
  reportTitle: string | null;
  createdAt: string;
  sourcePostCount: number;
};

function SavedReportsListBlock({ currentId }: { currentId: string }) {
  const [rows, setRows] = useState<ReportListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setListError(null);
    fetch("/api/blog-reports", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${res.status}`);
        }
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setRows(
          list
            .filter((r: ReportListRow) => r.id && r.id !== currentId)
            .map((r: ReportListRow) => ({
              id: r.id,
              reportTitle: r.reportTitle,
              createdAt: r.createdAt,
              sourcePostCount: typeof r.sourcePostCount === "number" ? r.sourcePostCount : 0,
            }))
        );
      })
      .catch((e) => {
        if (!cancelled) {
          setListError(e instanceof Error ? e.message : "Could not load reports.");
          setRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentId]);

  const q = filterQuery.trim().toLowerCase();
  const filteredRows = q
    ? rows.filter((r) => {
        const title = (r.reportTitle || "Untitled report").toLowerCase();
        const date = r.createdAt.slice(0, 10);
        const posts = String(r.sourcePostCount);
        return title.includes(q) || date.includes(q) || posts.includes(q);
      })
    : rows;

  return (
    <section className="mx-auto mt-12 max-w-lg rounded-xl border border-[#e8b4a0]/60 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#f0e6e0] pb-3">
        <div className="min-w-0">
          <h2 className="font-serif text-base font-semibold text-[#5a4538]">Saved reports</h2>
          <p className="mt-0.5 text-[11px] leading-snug text-[#7a6b65]">Open another report from your saved list.</p>
        </div>
        <Link
          href="/seva-blog#stories"
          className="shrink-0 rounded-md border border-[#c4b8a8] bg-[#fffdfb] px-2.5 py-1 text-xs font-semibold text-[#6b5344] hover:bg-[#fdf2f0]"
        >
          ← Seva Blog
        </Link>
      </div>
      {!loading && !listError && rows.length > 0 ? (
        <label className="mt-3 block text-[11px] font-medium text-[#8b7355]">
          Filter
          <input
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Title, date, or post count…"
            className="mt-1 w-full rounded-md border border-[#e8dccf] bg-[#fefaf8] px-2 py-1.5 text-sm text-[#3d3530] outline-none placeholder:text-[#b5a8a0] focus:border-[#c4a090] focus:ring-1 focus:ring-[#8b6b5c]/25"
            autoComplete="off"
          />
        </label>
      ) : null}
      {loading ? (
        <p className="mt-3 text-sm text-[#7a6b65]">Loading list…</p>
      ) : listError ? (
        <p className="mt-3 text-sm text-red-700">{listError}</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-[#7a6b65]">No other reports yet.</p>
      ) : filteredRows.length === 0 ? (
        <p className="mt-3 text-sm text-[#7a6b65]">No reports match this filter.</p>
      ) : (
        <ul className="mt-2 max-h-56 divide-y divide-[#f8e4e1] overflow-y-auto text-sm">
          {filteredRows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[#4a3f3a]">{r.reportTitle || "Untitled report"}</p>
                <p className="truncate text-[11px] text-[#7a6b65]">
                  {r.createdAt.slice(0, 10)} · {r.sourcePostCount} posts
                </p>
              </div>
              <Link
                href={`/blog-reports/${r.id}?from=admin`}
                className="shrink-0 rounded-md border border-[#8b6b5c] bg-[#fdf2f0] px-2 py-1 text-[11px] font-semibold text-[#6b5344] hover:bg-white"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReportStyledBody({
  workingBody,
  presentation,
  className = "",
  stripHeightCss,
}: {
  workingBody: string;
  presentation: ReportPresentation;
  className?: string;
  /** Fixed backdrop strip height (CSS); PDF uses mm so each page gets its own `cover` instance. */
  stripHeightCss?: string;
}) {
  if (reportUsesPagedBackdropPhoto(presentation)) {
    return (
      <ReportPagedBackdropShell
        presentation={presentation}
        className={className}
        stripHeightCss={stripHeightCss}
        innerClassName={`${REPORT_BODY_PROSE_CLASS} prose prose-sm max-w-none text-[#3d3530] sm:prose-base [&_a]:text-[#8b6b5c] [&_a]:underline`}
      >
        <div
          dangerouslySetInnerHTML={{
            __html: sanitizeReportHtml(workingBody || "<p></p>"),
          }}
        />
      </ReportPagedBackdropShell>
    );
  }

  const layers = getReportBodyShellLayers(presentation);
  return (
    <div className={className} style={layers.outer}>
      <div aria-hidden style={layers.colorLayer} />
      {layers.photoLayer ? <div aria-hidden style={layers.photoLayer} /> : null}
      {layers.photoBleachLayer ? <div aria-hidden style={layers.photoBleachLayer} /> : null}
      <div
        className={`${REPORT_BODY_PROSE_CLASS} prose prose-sm max-w-none text-[#3d3530] sm:prose-base [&_a]:text-[#8b6b5c] [&_a]:underline`}
        style={layers.inner}
        dangerouslySetInnerHTML={{
          __html: sanitizeReportHtml(workingBody || "<p></p>"),
        }}
      />
    </div>
  );
}

/** Same pattern as `ArticleCanvasChrome`: backdrop layers + transparent editor on top. */
function ReportEditCanvasShell({
  presentation,
  children,
  className = "",
}: {
  presentation: ReportPresentation;
  children: ReactNode;
  className?: string;
}) {
  if (reportUsesPagedBackdropPhoto(presentation)) {
    return (
      <ReportPagedBackdropShell
        presentation={presentation}
        className={`flex min-h-0 w-full flex-col overflow-hidden ${className}`}
        innerClassName="flex min-h-0 w-full flex-col overflow-visible"
        innerStyle={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
        measureWrapperClassName="flex min-h-0 min-w-0 w-full flex-col"
      >
        {children}
      </ReportPagedBackdropShell>
    );
  }

  const layers = getReportBodyShellLayers(presentation);
  return (
    <div className={`flex min-h-0 w-full flex-col overflow-hidden ${className}`} style={layers.outer}>
      <div aria-hidden style={layers.colorLayer} />
      {layers.photoLayer ? <div aria-hidden style={layers.photoLayer} /> : null}
      {layers.photoBleachLayer ? <div aria-hidden style={layers.photoBleachLayer} /> : null}
      <div
        className="flex min-h-0 w-full flex-1 flex-col overflow-visible"
        style={{
          ...layers.inner,
          display: "flex",
          flexDirection: "column",
          flex: "1 1 auto",
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function BlogReportView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const fromAdmin = searchParams.get("from") === "admin";
  const backHref = fromAdmin ? "/admin/blog-reports" : "/seva-blog";
  const backLabel = fromAdmin ? "← All reports" : "← Seva Blog";

  const [report, setReport] = useState<ReportApi | null>(null);
  const [workingBody, setWorkingBody] = useState("");
  const [presentation, setPresentation] = useState<ReportPresentation>(DEFAULT_REPORT_PRESENTATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfWorking, setPdfWorking] = useState(false);
  const [backdropUploading, setBackdropUploading] = useState(false);
  const reportBackdropFileRef = useRef<HTMLInputElement>(null);

  const pdfCaptureRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/blog-reports/${id}`, { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setError("You do not have access to this report.");
        setReport(null);
        return;
      }
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Could not load report.");
        setReport(null);
        return;
      }
      const r = data as ReportApi;
      setReport(r);
      setWorkingBody(normalizeReportBodyHtml((r.editedBody ?? r.generatedBody) || ""));
      setPresentation(normalizePresentation(r.presentation));
      setEditing(false);
    } catch {
      setError("Network error loading report.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReportBackdropFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !report?.canEdit) return;
      setBackdropUploading(true);
      setSaveError(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/blog-posts/upload", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          window.alert(data.error || "Upload failed.");
          return;
        }
        setPresentation((p) => ({ ...p, backdropPhotoUrl: data.url! }));
      } catch {
        window.alert("Upload failed.");
      } finally {
        setBackdropUploading(false);
      }
    },
    [report?.canEdit]
  );

  async function saveEdits() {
    if (!report?.canEdit) return;
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/blog-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ editedBody: workingBody, presentation }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof data?.error === "string" ? data.error : "Save failed.");
        return;
      }
      if (data?.presentation) {
        setPresentation(normalizePresentation(data.presentation));
      }
      setReport((prev) =>
        prev
          ? {
              ...prev,
              editedBody: workingBody,
              presentation: data?.presentation ? normalizePresentation(data.presentation) : presentation,
              updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : prev.updatedAt,
            }
          : prev
      );
      setEditing(false);
    } catch {
      setSaveError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadPdf() {
    if (!report) return;
    setPdfError(null);
    setPdfWorking(true);
    try {
      const el = pdfCaptureRef.current;
      if (!el) {
        setPdfError("Could not prepare PDF (missing content).");
        return;
      }
      const titleRaw = report.reportTitle || "Seva blog report";
      const filename = `${safeFileBase(titleRaw)}.pdf`;
      await downloadElementAsPdf(el, filename);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not build PDF.";
      setPdfError(msg);
      console.error("PDF export failed:", e);
    } finally {
      setPdfWorking(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/seva-blog#stories" className="text-sm font-semibold text-[#8b6b5c] hover:underline">
          ← Seva Blog
        </Link>
        <p className="mt-8 text-center text-zinc-600">Loading report…</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-center text-sm">
          <Link href="/seva-blog#stories" className="font-semibold text-[#8b6b5c] underline hover:text-[#6b5344]">
            ← Seva Blog
          </Link>
          {fromAdmin ? (
            <Link href={backHref} className="font-semibold text-[#8b6b5c] underline hover:text-[#6b5344]">
              {backLabel}
            </Link>
          ) : null}
        </p>
        <p className="mt-6 text-center text-red-700">{error || "Report not found."}</p>
      </div>
    );
  }

  const meta = [
    `${report.dateFrom.slice(0, 10)} → ${report.dateTo.slice(0, 10)}`,
    report.centerFilter ? `Center: ${report.centerFilter}` : null,
    report.regionFilter ? `Region: ${report.regionFilter}` : null,
    report.sevaCategoryFilter ? `Seva category: ${report.sevaCategoryFilter}` : null,
    !report.centerFilter && !report.regionFilter ? "Geography: all centers / regions" : null,
    `~${report.targetWordCount} words requested`,
    `${report.sourcePostCount} posts analyzed`,
  ]
    .filter(Boolean)
    .join(" · ");

  const pdfMetaLine = [
    `${report.dateFrom.slice(0, 10)} – ${report.dateTo.slice(0, 10)}`,
    `${report.sourcePostCount} posts`,
    `~${report.targetWordCount} words target`,
  ].join(" · ");

  const sourcePosts = Array.isArray(report.sourcePosts) ? report.sourcePosts : [];

  const titleDisplay = report.reportTitle || "Blog analytics report";
  const compactMeta = `${report.dateFrom.slice(0, 10)} – ${report.dateTo.slice(0, 10)} · ${report.sourcePostCount} posts · ~${report.targetWordCount} words`;

  const screenPresentation =
    report.canEdit && !editing
      ? reportPresentationForReading(presentation)
      : presentation;

  const pdfBackdropPageFill = reportPdfBackdropFillsFrame(presentation);

  return (
    <div className="min-h-screen bg-[#fefaf8] px-4 py-10">
      {/* Off-screen: exact snapshot for PDF (matches screen styling). */}
      <div
        ref={pdfCaptureRef}
        className={`pointer-events-none fixed top-0 -left-[14000px] z-0 box-border w-[210mm] bg-[#fefaf8] p-[12mm] text-[#3d3530] shadow-none ${
          pdfBackdropPageFill ? "flex flex-col" : ""
        }`}
        style={pdfBackdropPageFill ? { minHeight: REPORT_PDF_CAPTURE_MIN_HEIGHT } : undefined}
        aria-hidden
      >
        <div className={pdfBackdropPageFill ? "shrink-0" : undefined}>
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "22px",
              fontWeight: 700,
              color: "#5a4538",
              margin: "0 0 8px 0",
              lineHeight: 1.25,
            }}
          >
            {titleDisplay}
          </h1>
          <p style={{ fontSize: "10.5pt", color: "#5c534e", margin: "0 0 14px 0" }}>{pdfMetaLine}</p>
        </div>
        <ReportStyledBody
          workingBody={workingBody}
          presentation={presentation}
          className={pdfBackdropPageFill ? "flex min-h-0 min-w-0 grow flex-col" : undefined}
          stripHeightCss={
            reportUsesPagedBackdropPhoto(presentation)
              ? REPORT_PAGED_BACKDROP_STRIP_HEIGHT_PDF
              : undefined
          }
        />
      </div>

      <div className="mx-auto max-w-3xl">
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <Link href="/seva-blog#stories" className="font-semibold text-[#8b6b5c] hover:underline">
            ← Seva Blog
          </Link>
          {fromAdmin ? (
            <Link href={backHref} className="font-semibold text-[#8b6b5c] hover:underline">
              {backLabel}
            </Link>
          ) : null}
        </nav>
        <h1 className="mt-4 font-serif text-2xl font-bold text-[#5a4538] sm:text-3xl">{titleDisplay}</h1>
        <p className="mt-2 text-sm text-[#7a6b65]">{compactMeta}</p>

        <details className="mt-3 rounded-lg border border-[#e8dccf] bg-white/80 px-3 py-2 text-sm text-[#6b5344] [&_summary]:cursor-pointer">
          <summary className="font-medium text-[#6b5344]">Scope &amp; instructions used for generation</summary>
          <div className="mt-2 space-y-2 border-t border-[#f0e6e0] pt-2 text-xs leading-relaxed text-[#7a6b65]">
            <p>{meta}</p>
            {report.userInstructions ? (
              <p>
                <span className="font-semibold text-[#6b5344]">Your instructions: </span>
                {report.userInstructions}
              </p>
            ) : (
              <p className="italic text-[#8b7368]">No extra instructions were provided.</p>
            )}
          </div>
        </details>

        <div className="mt-8 space-y-4">
          {report.canEdit && editing ? (
            <>
              <section className="space-y-3 rounded-lg border border-[#e0d0c8] bg-[#faf8f6] px-3 py-3">
                <p className="text-sm font-semibold text-[#6b5344]">Article-style appearance</p>
                <p className="text-xs text-[#7a6b65]">
                  Same controls as the blog compose editor: background, frame, optional backdrop. The preview below
                  matches the PDF; use <strong className="text-[#6b5344]">Save changes</strong> to persist.
                </p>
                <div className="flex flex-wrap items-end gap-4 border-b border-[#f0e6e0] pb-3">
                  <label className="flex flex-col gap-1 text-xs font-medium text-[#8b7355]">
                    Background
                    <select
                      className="rounded-lg border border-[#e8b4a0] bg-white px-3 py-2 text-sm text-[#3d3530]"
                      value={presentation.backgroundId}
                      onChange={(e) =>
                        setPresentation((p) => ({ ...p, backgroundId: e.target.value }))
                      }
                    >
                      {REPORT_BACKGROUND_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-[#8b7355]">
                    Frame
                    <select
                      className="rounded-lg border border-[#e8b4a0] bg-white px-3 py-2 text-sm text-[#3d3530]"
                      value={presentation.borderId}
                      onChange={(e) => setPresentation((p) => ({ ...p, borderId: e.target.value }))}
                    >
                      {REPORT_BORDER_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <input
                  ref={reportBackdropFileRef}
                  type="file"
                  accept={REPORT_BACKDROP_IMAGE_ACCEPT}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(ev) => void handleReportBackdropFile(ev)}
                />
                <label className="block text-xs font-medium text-[#8b7355]">Backdrop image URL (optional)</label>
                <input
                  type="text"
                  value={presentation.backdropPhotoUrl ?? ""}
                  onChange={(e) =>
                    setPresentation((p) => ({
                      ...p,
                      backdropPhotoUrl: e.target.value.trim() === "" ? null : e.target.value,
                    }))
                  }
                  onBlur={() =>
                    setPresentation((p) => ({
                      ...p,
                      backdropPhotoUrl: normalizeBackdropPhotoUrl(p.backdropPhotoUrl) ?? null,
                    }))
                  }
                  placeholder="https://… or /uploads/…"
                  className="mt-1 w-full rounded-lg border border-[#e8b4a0] px-3 py-2 text-sm text-[#4a3f3a] outline-none focus:ring-2 focus:ring-[#8b6b5c]/30"
                  autoComplete="off"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={backdropUploading}
                    onClick={() => reportBackdropFileRef.current?.click()}
                    className="rounded-lg border border-[#c4b8a8] bg-white px-3 py-1.5 text-xs font-semibold text-[#6b5344] hover:bg-[#fdf2f0] disabled:opacity-60"
                  >
                    {backdropUploading ? "Uploading…" : "Upload image…"}
                  </button>
                  {presentation.backdropPhotoUrl ? (
                    <button
                      type="button"
                      onClick={() => setPresentation((p) => ({ ...p, backdropPhotoUrl: null }))}
                      className="rounded-lg border border-dashed border-[#c4a8a0] px-3 py-1.5 text-xs font-semibold text-[#8b6b5c] hover:bg-[#fff8f5]"
                    >
                      Clear backdrop
                    </button>
                  ) : null}
                </div>
                {presentation.backdropPhotoUrl ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="flex justify-between text-xs font-medium text-[#8b7355]">
                        Photo strength
                        <span className="tabular-nums text-[#6b5344]">
                          {presentation.backdropPhotoOpacity.toFixed(2)}
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={presentation.backdropPhotoOpacity}
                        onChange={(e) =>
                          setPresentation((p) => ({
                            ...p,
                            backdropPhotoOpacity: Number(e.target.value),
                          }))
                        }
                        className="mt-1 w-full accent-[#8b6b5c]"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-xs font-medium text-[#8b7355]">
                        Paper over photo
                        <span className="tabular-nums text-[#6b5344]">
                          {presentation.backdropPhotoBleach.toFixed(2)}
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={0.92}
                        step={0.02}
                        value={presentation.backdropPhotoBleach}
                        onChange={(e) =>
                          setPresentation((p) => ({
                            ...p,
                            backdropPhotoBleach: Number(e.target.value),
                          }))
                        }
                        className="mt-1 w-full accent-[#8b6b5c]"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-xs font-medium text-[#8b7355]">
                        Position ↔
                        <span className="tabular-nums text-[#6b5344]">
                          {Math.round(presentation.backdropPhotoPosX)}
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={presentation.backdropPhotoPosX}
                        onChange={(e) =>
                          setPresentation((p) => ({
                            ...p,
                            backdropPhotoPosX: Number(e.target.value),
                          }))
                        }
                        className="mt-1 w-full accent-[#8b6b5c]"
                      />
                    </div>
                    <div>
                      <label className="flex justify-between text-xs font-medium text-[#8b7355]">
                        Position ↕
                        <span className="tabular-nums text-[#6b5344]">
                          {Math.round(presentation.backdropPhotoPosY)}
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={presentation.backdropPhotoPosY}
                        onChange={(e) =>
                          setPresentation((p) => ({
                            ...p,
                            backdropPhotoPosY: Number(e.target.value),
                          }))
                        }
                        className="mt-1 w-full accent-[#8b6b5c]"
                      />
                    </div>
                  </div>
                ) : null}
                {presentation.backdropPhotoUrl ? (
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-[#4a3f3a]">
                    <input
                      type="checkbox"
                      checked={presentation.backdropPhotoRepeat}
                      onChange={(e) =>
                        setPresentation((p) => ({ ...p, backdropPhotoRepeat: e.target.checked }))
                      }
                      className="accent-[#8b6b5c]"
                    />
                    Tile / repeat backdrop for long reports
                  </label>
                ) : null}
              </section>
              <p className="text-[11px] text-[#7a6b65]">
                Toolbar: fonts, lists, links, colors, <strong className="text-[#6b5344]">Image ▼</strong>.
              </p>
              <ReportEditCanvasShell
                presentation={presentation}
                className="min-h-[min(72vh,640px)] shadow-sm"
              >
                <RichTextEditor
                  surface="canvas"
                  value={workingBody}
                  onChange={setWorkingBody}
                  placeholder="Edit your report…"
                  minHeight={
                    reportUsesPagedBackdropPhoto(presentation)
                      ? "min(14vh, 160px)"
                      : "min(50vh, 400px)"
                  }
                  className={
                    reportUsesPagedBackdropPhoto(presentation) ? "min-h-0 w-full" : "min-h-0 flex-1"
                  }
                />
              </ReportEditCanvasShell>
            </>
          ) : (
            <ReportStyledBody workingBody={workingBody} presentation={screenPresentation} />
          )}

          {saveError && <p className="text-sm text-red-700">{saveError}</p>}
          {pdfError && (
            <p className="text-sm text-red-700" role="alert">
              PDF: {pdfError}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {report.canEdit && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg bg-[#8b6b5c] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#6b5344]"
              >
                Edit report
              </button>
            )}
            {report.canEdit && editing && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveEdits()}
                  className="rounded-lg bg-[#8b6b5c] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#6b5344] disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setWorkingBody(
                      normalizeReportBodyHtml((report.editedBody ?? report.generatedBody) || "")
                    );
                    setPresentation(normalizePresentation(report.presentation));
                    setEditing(false);
                    setSaveError(null);
                  }}
                  className="rounded-lg border border-[#8b6b5c] bg-white px-5 py-2.5 text-sm font-semibold text-[#8b6b5c] hover:bg-[#fdf2f0]"
                >
                  Cancel edit
                </button>
              </>
            )}
            <button
              type="button"
              disabled={pdfWorking}
              onClick={() => void downloadPdf()}
              className="rounded-lg border border-[#8b6b5c] bg-white px-5 py-2.5 text-sm font-semibold text-[#8b6b5c] hover:bg-[#fdf2f0] disabled:opacity-60"
            >
              {pdfWorking ? "Preparing PDF…" : "Download PDF"}
            </button>
          </div>
        </div>

        <section className="mt-10 rounded-xl border border-[#e8b4a0]/60 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-[#5a4538]">Source blog stories</h2>
          <p className="mt-1 text-xs text-[#7a6b65]">
            Posts included when this report was generated (links open the live story).
          </p>
          {sourcePosts.length === 0 ? (
            <p className="mt-3 text-sm text-[#7a6b65]">No source posts recorded.</p>
          ) : (
            <ul className="mt-4 max-h-64 divide-y divide-[#f8e4e1] overflow-y-auto text-sm">
              {sourcePosts.map((p) => (
                <li key={p.id} className="py-2.5">
                  <Link
                    href={`/seva-blog/post/${p.id}`}
                    className="font-medium text-[#8b6b5c] hover:underline"
                  >
                    {p.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-[#7a6b65]">
                    {p.section}
                    {p.authorName ? ` · ${p.authorName}` : ""}
                    {p.sevaDate
                      ? ` · Seva ${formatListDate(p.sevaDate)}`
                      : ` · Posted ${formatListDate(p.createdAt)}`}
                    {p.centerCity ? ` · ${p.centerCity}` : ""}
                    {p.sevaCategory ? ` · ${p.sevaCategory}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {fromAdmin && id ? <SavedReportsListBlock currentId={id} /> : null}
      </div>
    </div>
  );
}
