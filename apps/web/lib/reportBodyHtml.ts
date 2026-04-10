import { htmlToPlain } from "@/lib/htmlToPlain";

/** Match blog post display sanitization — allow rich text + images, strip scripts. */
export function sanitizeReportHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\s+on\w+\s*=\s*[^\s>]*/gi, "");
}

export function looksLikeHtml(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return /<(p|div|br|strong|em|b|i|u|span|h[1-6]|ul|ol|li|blockquote|a|img|font)\b/i.test(t);
}

function escapeHtmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Light markdown for AI-generated reports: **bold**, *italic*, paragraphs. */
export function markdownishToHtml(s: string): string {
  const normalized = s.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";
  return normalized
    .split(/\n\n+/)
    .map((para) => {
      let t = escapeHtmlText(para);
      t = t.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
      t = t.replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");
      return `<p>${t.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");
}

/** Stored report body may be markdown (AI) or HTML (after rich edit). */
export function normalizeReportBodyHtml(body: string): string {
  if (!body || typeof body !== "string") return "";
  const b = body.trim();
  if (!b) return "";
  if (looksLikeHtml(body)) return body;
  return markdownishToHtml(body);
}

export function reportBodyToPlainForPdf(body: string): string {
  const html = normalizeReportBodyHtml(body);
  return htmlToPlain(html);
}
