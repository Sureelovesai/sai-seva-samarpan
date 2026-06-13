/** Helpers for working with the blog's stored HTML content on native. */

/** Strip HTML tags → plain text excerpt for list cards. */
export function htmlToExcerpt(html: string | null | undefined, maxLen = 160): string {
  if (!html) return "";
  const text = html
    .replace(/<\/(p|div|h[1-6]|li|br)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLen ? text.slice(0, maxLen).trim() + "…" : text;
}

/** Wrap post HTML in a styled, mobile-friendly document for a WebView. */
export function buildPostHtmlDocument(content: string, title: string): string {
  const safeTitle = title.replace(/[<>&]/g, "");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 16px;
    font-family: -apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1f2937;
    line-height: 1.6;
    font-size: 17px;
    background: #ffffff;
    -webkit-text-size-adjust: 100%;
  }
  h1, h2, h3 { color: #0f172a; line-height: 1.25; }
  h1 { font-size: 24px; }
  h2 { font-size: 20px; }
  img { max-width: 100%; height: auto; border-radius: 12px; }
  a { color: #2563eb; }
  blockquote {
    margin: 12px 0; padding: 8px 14px; border-left: 4px solid #0ea5e9;
    background: #f0f9ff; color: #334155; border-radius: 6px;
  }
  p { margin: 0 0 14px; }
  ul, ol { padding-left: 22px; }
</style>
<title>${safeTitle}</title>
</head>
<body>${content}</body>
</html>`;
}
