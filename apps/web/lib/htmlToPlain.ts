function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

/** Strip HTML to plain text for AI / excerpts. */
export function htmlToPlain(html: string, maxLen?: number): string {
  if (!html || typeof html !== "string") return "";
  const withoutTags = html.replace(/<[^>]*>/g, " ");
  const decoded = decodeHtmlEntities(withoutTags);
  const t = decoded.replace(/\s+/g, " ").trim();
  if (maxLen != null && t.length > maxLen) return t.slice(0, maxLen).trim() + "…";
  return t;
}
