/**
 * Builds the volunteer certificate as a self-contained HTML document for expo-print.
 * Mirrors the web certificate (gold frame, headings, name, recognition text, org footer)
 * but uses no external images so PDF generation is reliable on-device.
 */

export type CertificateLayout = "portrait" | "landscape";

export type CertificateData = {
  volunteerName: string;
  hours: string | number;
  activity: string;
  location: string;
  serviceDate: string; // YYYY-MM-DD
};

const ORG_NAME =
  "The Sri Sathya Sai Global Council Foundation, Inc. (EIN: 88-0716268) is a U.S.-based 501(c)(3) nonprofit that supports global humanitarian and community service initiatives inspired by the teachings of Bhagawan Sri Sathya Sai Baba.";
const SERVICE_TYPE = "Sri Sathya Sai Center/Group of";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function longDate(value: string): string {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function certificateFileBase(name: string): string {
  const cleaned = name
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return cleaned ? `certificate-${cleaned}` : "volunteer-certificate";
}

export function buildCertificateHtml(data: CertificateData, layout: CertificateLayout): string {
  const name = esc(data.volunteerName || "Volunteer Name");
  const hours = esc(String(data.hours ?? "0"));
  const activity =
    data.activity && data.activity.trim() && data.activity !== "Seva Activity"
      ? esc(data.activity)
      : "seva";
  const location = esc(data.location || "");
  const dateStr = esc(longDate(data.serviceDate));
  const issuedOn = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const dateClause = dateStr ? ` on <b>${dateStr}</b>` : "";
  const locationClause = location ? ` <b>${location}</b>` : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: letter ${layout}; margin: 0.4in; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Georgia, "Times New Roman", serif; color: #3f3527; background: #ffffff; }
  .sheet { position: relative; border: 14px solid #c9a861; padding: 34px 40px 28px; background: #ffffff; }
  .sheet:before {
    content: ""; position: absolute; left: 8px; right: 8px; top: 8px; bottom: 8px;
    border: 2px solid #a67c2e; pointer-events: none;
  }
  .corner { position: absolute; width: 26px; height: 26px; border: 0 solid #a67c2e; }
  .c-tl { left: 14px; top: 14px; border-left-width: 2px; border-top-width: 2px; }
  .c-tr { right: 14px; top: 14px; border-right-width: 2px; border-top-width: 2px; }
  .c-bl { left: 14px; bottom: 14px; border-left-width: 2px; border-bottom-width: 2px; }
  .c-br { right: 14px; bottom: 14px; border-right-width: 2px; border-bottom-width: 2px; }
  .content { position: relative; z-index: 1; }
  .emblem { text-align: center; font-size: 13px; letter-spacing: 3px; color: #a67c2e; font-weight: bold; }
  .title { text-align: center; font-size: 46px; font-weight: 800; letter-spacing: 6px; color: #a67c2e; margin-top: 16px; }
  .subtitle { text-align: center; font-size: 19px; font-weight: bold; letter-spacing: 3px; color: #c99a3b; margin-top: 6px; }
  .awarded { text-align: center; font-size: 14px; color: #5c5444; margin-top: 18px; }
  .name {
    text-align: center; font-size: 30px; font-weight: 600; color: #1f2937;
    border-bottom: 2px solid rgba(182,138,51,.7); padding-bottom: 8px; margin: 24px auto 0; max-width: 80%;
  }
  .desc { text-align: center; font-size: 16px; line-height: 1.6; color: #4b4636; margin: 24px auto 0; max-width: 92%; }
  .desc b { color: #1f2937; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 44px; }
  .issued-label { font-size: 12px; color: #6b6555; font-weight: bold; }
  .issued-date { font-size: 15px; color: #1f2937; font-weight: bold; margin-top: 4px; }
  .sign { text-align: left; }
  .sign-line { width: 220px; border-bottom: 2px solid rgba(182,138,51,.7); }
  .sign-title { font-size: 13px; font-weight: bold; color: #3f3527; margin-top: 8px; }
  .org { border-top: 1px solid rgba(201,168,97,.5); margin-top: 30px; padding-top: 14px; text-align: center; }
  .org-label { font-size: 13px; font-weight: bold; color: #6b6555; }
  .org-text { font-size: 11.5px; line-height: 1.5; color: #4b4636; margin-top: 6px; }
</style>
</head>
<body>
  <div class="sheet">
    <span class="corner c-tl"></span>
    <span class="corner c-tr"></span>
    <span class="corner c-bl"></span>
    <span class="corner c-br"></span>
    <div class="content">
      <div class="emblem">SRI SATHYA SAI SEVA</div>
      <div class="title">VOLUNTEER</div>
      <div class="subtitle">CERTIFICATION OF APPRECIATION</div>
      <div class="awarded">This certificate is awarded with great pride to</div>
      <div class="name">${name}</div>
      <div class="desc">
        In recognition of the dedication and commitment shown in offering <b>${hours}</b> hour(s)
        of service through <b>${activity}</b> towards the <b>${SERVICE_TYPE}</b>${locationClause}${dateClause}.
        <br />May Swami&rsquo;s blessings be always with you.
      </div>
      <div class="footer">
        <div>
          <div class="issued-label">Issued on</div>
          <div class="issued-date">${esc(issuedOn)}</div>
        </div>
        <div class="sign">
          <div class="sign-line"></div>
          <div class="sign-title">Service Coordinator</div>
        </div>
      </div>
      <div class="org">
        <div class="org-label">Organization</div>
        <div class="org-text">${esc(ORG_NAME)}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
