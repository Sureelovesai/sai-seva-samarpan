/** Terms & media-consent content, mirroring the web /terms-and-policy page. */

export const WAIVER_TITLE = "Acknowledgment, Release, and Media Consent";
export const WAIVER_INTRO = "I / We hereby understand, acknowledge, and agree to the following:";

export type WaiverSection = { num: string; title: string; body: string };

export const WAIVER_SECTIONS: WaiverSection[] = [
  {
    num: "1",
    title: "Voluntary Participation",
    body:
      "I / We voluntarily choose to participate in the Service Activities organized by the Participating Organizations (Sri Sathya Sai Centers/Groups and associated partners). Participation is entirely voluntary and undertaken of my / our own free will.",
  },
  {
    num: "2",
    title: "Release and Indemnification",
    body:
      "I / We agree to release, indemnify, and hold harmless the Participating Organizations, including their officers, volunteers, representatives, affiliates, and partners, from and against any and all claims, demands, liabilities, losses, damages, injuries, costs, or expenses (including reasonable attorneys' fees and court costs) arising out of or related to participation in these Service Activities, including any actions taken or omitted before, during, or after such activities.",
  },
  {
    num: "3",
    title: "Media Release",
    body:
      "I / We understand that photographs, videos, or audio recordings may be taken during these Service Activities and may include my / our image, voice, or likeness. I / We hereby grant permission to the Participating Organizations to use such photographs or recordings in publications, newsletters, promotional materials, websites, presentations, social media, or other organizational communications, without compensation or further approval.",
  },
  {
    num: "4",
    title: "Participation of Minors",
    body:
      "If any participant is under the age of 18 years, I / We confirm that participation is authorized by the child's parent or legal guardian. The parent or legal guardian agrees to all terms stated herein on behalf of the minor participant, including participation, release of liability, indemnification, and media consent.",
  },
  {
    num: "5",
    title: "Assumption of Risk",
    body:
      "I / We understand that participation in these Service Activities may involve certain inherent risks, including but not limited to travel, outdoor activities, physical activities, and use of tools or equipment. I / We voluntarily assume all such risks associated with participation.",
  },
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Self-contained HTML for on-device PDF generation (expo-print). */
export function buildWaiverHtml(): string {
  const sections = WAIVER_SECTIONS.map(
    (s) => `
      <section>
        <h2><span class="num">${s.num}</span>${escapeHtml(s.title)}</h2>
        <p>${escapeHtml(s.body)}</p>
      </section>`
  ).join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 32px; }
      h1 { text-align: center; font-size: 22px; color: #1e293b; margin: 0 0 6px; }
      .rule { width: 60px; height: 2px; background: #a5b4fc; margin: 8px auto 20px; }
      .intro { font-size: 14px; color: #334155; margin-bottom: 18px; }
      section { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
      h2 { display: flex; align-items: center; gap: 10px; font-size: 15px; color: #1e293b; margin: 0 0 8px; }
      .num { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 999px; background: #e0e7ff; color: #4338ca; font-size: 13px; font-weight: 800; }
      p { font-size: 12.5px; line-height: 1.6; color: #334155; margin: 0; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(WAIVER_TITLE)}</h1>
    <div class="rule"></div>
    <p class="intro">${escapeHtml(WAIVER_INTRO)}</p>
    ${sections}
  </body>
</html>`;
}
