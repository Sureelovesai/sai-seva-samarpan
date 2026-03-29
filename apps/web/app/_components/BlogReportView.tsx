"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

/**
 * jsPDF's built-in fonts only support WinAnsI-ish Latin. AI text often has smart quotes / em dashes / emoji
 * which throw or corrupt output. Normalize + drop unsupported code points.
 */
function textSafeForPdf(input: string): string {
  let s = input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/\u2018/g, "'")
    .replace(/\u2019/g, "'")
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/\u200B/g, "");
  s = s.replace(/[^\n\t\x20-\x7E]/g, "");
  return s;
}

function buildWrappedLines(doc: { splitTextToSize: (t: string, w: number) => string | string[] }, body: string, maxW: number): string[] {
  const paras = body.split(/\n+/);
  const lines: string[] = [];
  for (const p of paras) {
    const t = p.trimEnd();
    if (t.length === 0) {
      lines.push("");
      continue;
    }
    const part = doc.splitTextToSize(t, maxW);
    const arr = Array.isArray(part) ? part : [part];
    lines.push(...arr.map(String));
  }
  return lines;
}

function triggerPdfDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfWorking, setPdfWorking] = useState(false);

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
      setWorkingBody((r.editedBody ?? r.generatedBody) || "");
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

  async function saveEdits() {
    if (!report?.canEdit) return;
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/blog-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ editedBody: workingBody }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof data?.error === "string" ? data.error : "Save failed.");
        return;
      }
      setReport((prev) =>
        prev
          ? {
              ...prev,
              editedBody: workingBody,
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
      const { jsPDF } = await import("jspdf");
      const titleRaw = report.reportTitle || "Seva blog report";
      const title = textSafeForPdf(titleRaw).slice(0, 200) || "Seva blog report";
      const body = textSafeForPdf(workingBody || "") || "(No content)";

      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      doc.setFont("helvetica", "normal");

      const margin = 14;
      const pageBottom = 287;
      const lineHeight = 5.5;
      const maxW = 182;

      let y = margin;
      doc.setFontSize(14);
      const titleLines = buildWrappedLines(doc, title, maxW);
      for (const line of titleLines) {
        if (y > pageBottom - lineHeight) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight + 0.5;
      }

      y += 4;
      doc.setFontSize(10.5);
      const metaLine = textSafeForPdf(
        [
          `${report.dateFrom.slice(0, 10)} – ${report.dateTo.slice(0, 10)}`,
          `${report.sourcePostCount} posts`,
          `~${report.targetWordCount} words target`,
        ].join(" · ")
      );
      if (metaLine) {
        const metaWrapped = buildWrappedLines(doc, metaLine, maxW);
        for (const line of metaWrapped) {
          if (y > pageBottom - lineHeight) {
            doc.addPage();
            y = margin;
          }
          doc.setTextColor(80, 80, 80);
          doc.text(line, margin, y);
          y += lineHeight;
        }
        doc.setTextColor(0, 0, 0);
        y += 3;
      }

      const lines = buildWrappedLines(doc, body, maxW);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (y > pageBottom - lineHeight) {
          doc.addPage();
          y = margin;
        }
        doc.text(line || " ", margin, y);
        y += lineHeight;
      }

      const filename = `${safeFileBase(titleRaw)}.pdf`;
      const blob = doc.output("blob");
      triggerPdfDownload(blob, filename);
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

  const sourcePosts = Array.isArray(report.sourcePosts) ? report.sourcePosts : [];
  const sevaActivities = Array.isArray(report.relatedSevaActivities)
    ? report.relatedSevaActivities
    : [];

  return (
    <div className="min-h-screen bg-[#fefaf8] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href={backHref} className="text-sm font-semibold text-[#8b6b5c] hover:underline">
          {backLabel}
        </Link>
        <h1 className="mt-4 font-serif text-2xl font-bold text-[#5a4538] sm:text-3xl">
          {report.reportTitle || "Blog analytics report"}
        </h1>
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
          {report.canEdit && editing ? (
            <textarea
              value={workingBody}
              onChange={(e) => setWorkingBody(e.target.value)}
              rows={22}
              className="w-full rounded-xl border border-[#e8b4a0] bg-white p-4 font-sans text-sm leading-relaxed text-[#3d3530] shadow-sm"
            />
          ) : (
            <div className="whitespace-pre-wrap rounded-xl border border-[#e8b4a0]/60 bg-white p-6 text-sm leading-relaxed text-[#3d3530] shadow-sm">
              {workingBody}
            </div>
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
                  onClick={saveEdits}
                  className="rounded-lg bg-[#8b6b5c] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#6b5344] disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setWorkingBody((report.editedBody ?? report.generatedBody) || "");
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
