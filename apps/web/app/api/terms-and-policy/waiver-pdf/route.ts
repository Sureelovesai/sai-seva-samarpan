import { NextResponse } from "next/server";

/**
 * Waiver PDF: built-in generator only. Do not add or import "jspdf" or any PDF library.
 * Minimal PDF generation. Builds a valid PDF 1.4 with text only.
 * A4: 595 x 842 points. We use 1 0 0 -1 0 842 so y is top-down, origin top-left.
 */
const A4 = { width: 595, height: 842 };
const MARGIN = 40;
const LINE_HEIGHT = 14;
const FONT_SIZE_TITLE = 18;
const FONT_SIZE_SUBTITLE = 14;
const FONT_SIZE_BODY = 11;
const FONT_SIZE_HEADING = 12;
const MAX_WIDTH = A4.width - 2 * MARGIN;

/** Escape string for PDF literal: ( ) \ must be escaped. */
function pdfEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Wrap text into lines that fit in maxWidth (approx chars for Helvetica 11pt). */
function wrap(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? line + " " + w : w;
    if (next.length <= maxCharsPerLine) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w.length > maxCharsPerLine ? w : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function buildWaiverPdf(): Buffer {
  const title = "Waiver of Liability & Consent Form";
  const subtitle = "Service Activities";
  const intro =
    "I / We hereby understand, acknowledge, and agree to the following:";
  const sections = [
    {
      num: "1",
      title: "Voluntary Participation",
      body:
        "I / We are voluntarily participating in the Service Activities organized by the Participating " +
        "Organizations (Sri Sathya Sai Centers/Groups and associated partners). Participation is entirely " +
        "voluntary and of my own free will.",
    },
    {
      num: "2",
      title: "Release and Indemnification",
      body:
        "I / We agree to release, indemnify, and hold harmless the Participating Organizations, their " +
        "officers, volunteers, partners, and representatives from any and all claims, demands, liabilities, " +
        "losses, damages, or expenses (including attorneys' fees and court costs) arising out of or related " +
        "to actions taken or not taken during or after these Service Activities.",
    },
    {
      num: "3",
      title: "Media Release",
      body:
        "I / We understand that activities during these Service Activities may be photographed or recorded. " +
        "Such photographs or recordings may include my image or likeness. I / We grant permission for these " +
        "images or recordings to be used in publications, promotional materials, websites, social media, or " +
        "other media formats for non-commercial and/or commercial purposes, without compensation.",
    },
  ];

  const charsPerLine = Math.floor(MAX_WIDTH / 6);
  const streamLines: string[] = [];
  streamLines.push("1 0 0 -1 0 842 cm");
  let y = MARGIN;

  function drawText(
    text: string,
    x: number,
    lineY: number,
    size: number,
    useBold: boolean
  ): void {
    const f = useBold ? 2 : 1;
    streamLines.push(
      `BT /F${f} ${size} Tf ${x} ${842 - lineY} Td (${pdfEscape(text)}) Tj ET`
    );
  }

  function drawTextCenter(
    text: string,
    lineY: number,
    size: number,
    bold: boolean
  ): void {
    const approxWidth = text.length * (size * 0.5);
    const x = (A4.width - approxWidth) / 2;
    drawText(text, x, lineY, size, bold);
  }

  drawTextCenter(title, y, FONT_SIZE_TITLE, true);
  y += FONT_SIZE_TITLE + 6;
  drawTextCenter(subtitle, y, FONT_SIZE_SUBTITLE, false);
  y += FONT_SIZE_SUBTITLE + 10;
  drawText(intro, MARGIN, y, FONT_SIZE_BODY, false);
  y += LINE_HEIGHT + 8;

  for (const sec of sections) {
    drawText(`${sec.num}. ${sec.title}`, MARGIN, y, FONT_SIZE_HEADING, true);
    y += LINE_HEIGHT;
    for (const line of wrap(sec.body, charsPerLine)) {
      drawText(line, MARGIN, y, FONT_SIZE_BODY, false);
      y += LINE_HEIGHT;
    }
    y += 10;
  }

  const streamContent = streamLines.join("\n");
  const font1 = `1 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  const font2 = `2 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;
  const stream = `3 0 obj\n<< /Length ${Buffer.byteLength(streamContent, "utf8")} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
  const pages = `4 0 obj\n<< /Type /Pages /Kids [5 0 R] /Count 1 >>\nendobj\n`;
  const page = `5 0 obj\n<< /Type /Page /Parent 4 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Contents 3 0 R /Resources << /Font << /F1 1 0 R /F2 2 0 R >> >> >>\nendobj\n`;
  const catalog = `6 0 obj\n<< /Type /Catalog /Pages 4 0 R >>\nendobj\n`;

  const header = "%PDF-1.4\n";
  const body = font1 + font2 + stream + pages + page + catalog;
  const bodyStart = header.length;
  let offset = bodyStart;
  const xrefEntries = [
    "0000000000 65535 f ",
    ...[
      font1,
      font2,
      stream,
      pages,
      page,
      catalog,
    ].map((block) => {
      const o = offset;
      offset += Buffer.byteLength(block, "utf8");
      return String(o).padStart(10, "0") + " 00000 n ";
    }),
  ];
  const xrefTable =
    "xref\n0 7\n" + xrefEntries.join("\n") + "\n";
  const startxrefVal = bodyStart + body.length;
  const trailer =
    "trailer\n<< /Size 7 /Root 6 0 R >>\nstartxref\n" +
    startxrefVal +
    "\n%%EOF\n";
  const full = header + body + xrefTable + trailer;
  return Buffer.from(full, "utf8");
}

/**
 * GET /api/terms-and-policy/waiver-pdf
 * Returns the Service Activities Waiver of Liability PDF (same content as Terms and Policy page;
 * no participant name, signature, date, or parent/guardian fields).
 */
export async function GET() {
  const pdfBuffer = buildWaiverPdf();
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="Service_Activities_Waiver_of_Liability.pdf"',
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
