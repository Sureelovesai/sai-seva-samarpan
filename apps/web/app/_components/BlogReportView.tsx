"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RichTextEditor } from "@/app/seva-blog/RichTextEditor";
import { downloadElementAsPdf } from "@/lib/htmlToPdf";
import {
  normalizeReportBodyHtml,
  sanitizeReportHtml,
} from "@/lib/reportBodyHtml";
import {
  DEFAULT_REPORT_PRESENTATION,
  REPORT_BACKGROUND_OPTIONS,
  REPORT_BORDER_OPTIONS,
  REPORT_BODY_PROSE_CLASS,
  type ReportPresentation,
  getReportBodyShellStyles,
  normalizePresentation,
} from "@/lib/reportPresentation";

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

type SevaActivityRow = {
  id: string;
  title: string;
  category: string;
  city: string;
  startDate: string | null;
  status: string;
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
  relatedSevaActivities: SevaActivityRow[];
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

function ReportStyledBody({
  workingBody,
  presentation,
  className = "",
}: {
  workingBody: string;
  presentation: ReportPresentation;
  className?: string;
}) {
  const shell = getReportBodyShellStyles(presentation);
  return (
    <div className={className} style={shell.outer}>
      <div
        className={`${REPORT_BODY_PROSE_CLASS} prose prose-sm max-w-none text-[#3d3530] sm:prose-base [&_a]:text-[#8b6b5c] [&_a]:underline`}
        style={shell.inner}
        dangerouslySetInnerHTML={{
          __html: sanitizeReportHtml(workingBody || "<p></p>"),
        }}
      />
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
  const [presentationSaving, setPresentationSaving] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfWorking, setPdfWorking] = useState(false);

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

  async function persistPresentation(next: ReportPresentation) {
    if (!report?.canEdit) return;
    const previous = presentation;
    setPresentation(next);
    setPresentationSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/blog-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ presentation: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPresentation(previous);
        setSaveError(typeof data?.error === "string" ? data.error : "Could not save layout.");
        return;
      }
      setReport((prev) =>
        prev
          ? {
              ...prev,
              presentation: next,
              updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : prev.updatedAt,
            }
          : prev
      );
    } catch {
      setPresentation(previous);
      setSaveError("Network error while saving layout.");
    } finally {
      setPresentationSaving(false);
    }
  }

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
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-zinc-600">
        Loading report…
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-center text-red-700">{error || "Report not found."}</p>
        <p className="mt-6 text-center">
          <Link href={backHref} className="font-semibold text-amber-900 underline">
            {backLabel}
          </Link>
        </p>
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
  const sevaActivities = Array.isArray(report.relatedSevaActivities)
    ? report.relatedSevaActivities
    : [];

  const titleDisplay = report.reportTitle || "Blog analytics report";

  return (
    <div className="min-h-screen bg-[#fefaf8] px-4 py-10">
      {/* Off-screen: exact snapshot for PDF (matches screen styling). */}
      <div
        ref={pdfCaptureRef}
        className="pointer-events-none fixed top-0 -left-[14000px] z-0 box-border w-[210mm] bg-[#fefaf8] p-[12mm] text-[#3d3530] shadow-none"
        aria-hidden
      >
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
        <ReportStyledBody workingBody={workingBody} presentation={presentation} />
      </div>

      <div className="mx-auto max-w-3xl">
        <Link href={backHref} className="text-sm font-semibold text-[#8b6b5c] hover:underline">
          {backLabel}
        </Link>
        <h1 className="mt-4 font-serif text-2xl font-bold text-[#5a4538] sm:text-3xl">{titleDisplay}</h1>
        <p className="mt-2 text-sm text-[#7a6b65]">{meta}</p>
        {report.userInstructions ? (
          <p className="mt-3 rounded-lg border border-[#e8b4a0]/50 bg-white/80 px-4 py-3 text-sm text-[#6b5344]">
            <span className="font-semibold">Your instructions: </span>
            {report.userInstructions}
          </p>
        ) : null}

        <section className="mt-8 rounded-xl border border-[#e8b4a0]/60 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-[#5a4538]">
            Blog stories in this report
          </h2>
          <p className="mt-1 text-xs text-[#7a6b65]">
            Same scope as above: dates (seva date when set, else posted date), center, region, and seva
            category when you generated the report.
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

        <section className="mt-6 rounded-xl border border-[#e8b4a0]/60 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-[#5a4538]">
            Seva activities (same filters)
          </h2>
          <p className="mt-1 text-xs text-[#7a6b65]">
            Published, active activities in the report date range, matching center or region and seva category
            when those filters were set.
          </p>
          {sevaActivities.length === 0 ? (
            <p className="mt-3 text-sm text-[#7a6b65]">No matching activities in this window.</p>
          ) : (
            <ul className="mt-4 max-h-64 divide-y divide-[#f8e4e1] overflow-y-auto text-sm">
              {sevaActivities.map((a) => (
                <li key={a.id} className="py-2.5">
                  <span className="font-medium text-[#6b5344]">{a.title}</span>
                  <p className="mt-0.5 text-xs text-[#7a6b65]">
                    {a.category} · {a.city}
                    {a.startDate ? ` · ${formatListDate(a.startDate)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-8 space-y-4">
          <div className="rounded-xl border border-[#e8b4a0]/50 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8b7355]">
              Report layout (screen + PDF)
            </p>
            <p className="mt-1 text-xs text-[#7a6b65]">
              Background and frame use inline styles so the downloaded PDF matches what you see.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1 text-sm text-[#5a4538]">
                <span className="font-medium">Background</span>
                <select
                  className="rounded-lg border border-[#e8b4a0] bg-white px-3 py-2 text-[#3d3530] disabled:opacity-60"
                  disabled={!report.canEdit || presentationSaving}
                  value={presentation.backgroundId}
                  onChange={(e) => {
                    void persistPresentation({ ...presentation, backgroundId: e.target.value });
                  }}
                >
                  {REPORT_BACKGROUND_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-[#5a4538]">
                <span className="font-medium">Frame</span>
                <select
                  className="rounded-lg border border-[#e8b4a0] bg-white px-3 py-2 text-[#3d3530] disabled:opacity-60"
                  disabled={!report.canEdit || presentationSaving}
                  value={presentation.borderId}
                  onChange={(e) => {
                    void persistPresentation({ ...presentation, borderId: e.target.value });
                  }}
                >
                  {REPORT_BORDER_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {presentationSaving ? (
                <span className="text-xs text-[#7a6b65]">Saving layout…</span>
              ) : null}
            </div>
          </div>

          {report.canEdit && editing ? (
            <RichTextEditor
              value={workingBody}
              onChange={setWorkingBody}
              placeholder="Edit your report…"
              minHeight="min(70vh, 520px)"
              className="shadow-sm"
            />
          ) : (
            <ReportStyledBody workingBody={workingBody} presentation={presentation} />
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
      </div>
    </div>
  );
}
