/**
 * One-sheet quick checklist for Seva Coordinator testers (no Community Network rows).
 * Does not modify Seva_Coordinator_Testing_Checklist.xlsx (full multi-tab workbook).
 *
 * Run: node scripts/qa/export-seva-coordinator-quick-checklist.cjs
 */

const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const OUT_DIR = path.join(__dirname, "..", "..", "docs", "qa", "Seva_Coordinator");
const OUT_FILE = "Seva_Coordinator_Quick_Testing_Checklist.xlsx";

const HEADERS = [
  "Center Name",
  "Page",
  "What to check (important points in one place)",
  "Pass / Fail",
  "Comments",
];

const PASS_VALIDATION = {
  type: "list",
  allowBlank: true,
  formulae: ['"Pass,Fail"'],
};

/** Consolidated rows — center seva, admin, blog, and personal dashboard (no Community Network pages) */
const ROWS = [
  {
    page: "Home",
    description:
      "Log in as Seva Coordinator. Check: hero banner; top menu and **Logout**; second row shows **Seva Admin Dashboard** only (**Roles** must NOT appear unless you are also Admin). **Find Seva** and **My Seva Dashboard** buttons work. **Seva Activity Calendar** (Center / Regional / National tabs, filters, open a day with activities). **Our Impact** quote and three stat boxes. **Featured Seva Activities** (cards, View More, slider if multiple; confirm your featured publish shows if you marked one). Footer contact email. Full scroll order: banner → buttons → calendar → impact → featured → footer.",
  },
  {
    page: "Find Seva",
    description:
      "Open from menu or Home. Check: page loads; **Center / Regional / National** tabs; center, USA region, category, and date filters; search if shown; activity rows (title, center, date); spots remaining when applicable; **View details** opens Seva Details; you can **Join Seva** personally when logged in.",
  },
  {
    page: "Seva Details",
    description:
      "Open any activity from Find Seva. Check: title, center, date/time, location, description, coordinator contact; contribution items if any; capacity / spots; **Join Seva** (or waitlist) works for you as a volunteer; back navigation returns to Find Seva.",
  },
  {
    page: "Seva Admin Dashboard",
    description:
      "Open **Seva Admin Dashboard** from the second menu row. Check: banner and title; tiles **Add Seva**, **Manage Seva**, **View Sign Ups** open correct pages; **Roles** tile is absent; **Blog analytics reports** / generate report link if shown; stats or export (**Export CSV**) for your assigned cities; no Blog pending queue unless you are also Blog Admin.",
  },
  {
    page: "Add Seva Activity",
    description:
      "From dashboard → **Add Seva**. Check: title, center (only your assigned cities), category, description; start/end date and time; scope level (Center / Regional / National per your role); coordinator contact fields; optional contribution items; **Save & Draft** and **Save & Publish**; **Featured** checkbox; after save, Excel template download/upload area if you use bulk upload.",
  },
  {
    page: "Manage Seva",
    description:
      "Open **Manage Seva**. Check: your activities list and search/filter; **Edit** loads existing data; save changes appear on Find Seva; toggle **Featured** and confirm Home Featured section updates.",
  },
  {
    page: "Seva Sign Ups",
    description:
      "Open **View Sign Ups**. Check: pick an activity in your cities; on-site volunteer roster (names, adults/kids); item/contributions tab if the activity has items; approve waitlist volunteer if any; export sign-ups if the button exists.",
  },
  {
    page: "Seva Blog",
    description:
      "Open **Seva Blog**. Check: hero and stats cards; four info cards; **Create Post** opens the form and submits with thank-you message; community guidelines; stories grid and search; open a story card; **Generate report** (coordinator) if shown; react to a post if available.",
  },
  {
    page: "Blog Post Detail",
    description:
      "Click a story from Seva Blog. Check: full article (title, image, body, date); back to blog works; share or react controls if shown; no edit button unless you are also Blog Admin.",
  },
  {
    page: "My Seva Dashboard",
    description:
      "Open **My Seva Dashboard** from menu or Home button. Check: welcome area; upcoming sign-ups; past activities; hours summary; links to **Log Hours** and activity details; personal data matches sign-ups you made as a volunteer.",
  },
  {
    page: "Log Hours",
    description:
      "Open from dashboard. Check: page loads; select activity and service category; date and hours fields; notes if any; submit saves and hours appear on your dashboard/certificate path.",
  },
  {
    page: "Menu & role rules",
    description:
      "While logged in as coordinator only: confirm main menu (Home, Find Seva, My Seva Dashboard, Seva Blog, About, Resources, Logout). Second row = **Seva Admin Dashboard** only. You must NOT see **Roles** or **Event Admin Dashboard** unless your account has those extra roles.",
  },
  {
    page: "End-to-end coordinator flow",
    description:
      "One full pass: **Add Seva** → publish → find on **Find Seva** → mark **Featured** in **Manage Seva** → see on **Home** Featured section → sign up as volunteer on **Seva Details** → see yourself on **Seva Sign Ups** → optional **Log Hours** for that activity. Use a test activity in your assigned center only.",
  },
];

function styleHeaderRow(row) {
  row.font = { bold: true, size: 11 };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD4E4F7" },
  };
  row.alignment = { vertical: "middle", wrapText: true };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, OUT_FILE);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sai Seva Samarpan QA";
  wb.created = new Date();

  const ws = wb.addWorksheet("Seva Coordinator — Quick test", {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  ws.mergeCells(1, 1, 1, HEADERS.length);
  const title = ws.getCell(1, 1);
  title.value = "Seva Coordinator — Quick testing checklist (one sheet)";
  title.font = { bold: true, size: 13 };
  title.alignment = { wrapText: true };

  ws.mergeCells(2, 1, 2, HEADERS.length);
  const note = ws.getCell(2, 1);
  note.value =
    "Use this sheet for a faster pass (center seva, admin, blog, and dashboard — no Community Network pages). For every detailed step, use Seva_Coordinator_Testing_Checklist.xlsx (all tabs). Fill Center Name, mark Pass/Fail, and add Comments for any issue.";
  note.alignment = { wrapText: true, vertical: "top" };
  ws.getRow(2).height = 36;

  const headerRowNum = 3;
  ws.getRow(headerRowNum).values = HEADERS;
  styleHeaderRow(ws.getRow(headerRowNum));

  const passCol = HEADERS.indexOf("Pass / Fail") + 1;

  ROWS.forEach((row, i) => {
    const rowNum = headerRowNum + 1 + i;
    ws.addRow(["", row.page, row.description, "", ""]);
    const excelRow = ws.getRow(rowNum);
    excelRow.alignment = { wrapText: true, vertical: "top" };
    ws.getCell(rowNum, passCol).dataValidation = PASS_VALIDATION;
  });

  ws.columns = [
    { width: 22 },
    { width: 28 },
    { width: 72 },
    { width: 14 },
    { width: 36 },
  ];

  ws.autoFilter = {
    from: { row: headerRowNum, column: 1 },
    to: { row: headerRowNum + ROWS.length, column: HEADERS.length },
  };

  const stamp = new Date().toISOString().slice(0, 10);
  const fallbacks = [
    outPath,
    outPath.replace(/\.xlsx$/i, "_UPDATED.xlsx"),
    outPath.replace(/\.xlsx$/i, `_${stamp}.xlsx`),
  ];

  for (let i = 0; i < fallbacks.length; i++) {
    try {
      await wb.xlsx.writeFile(fallbacks[i]);
      console.log("Wrote: " + fallbacks[i]);
      return;
    } catch (err) {
      if (err && err.code === "EBUSY" && i < fallbacks.length - 1) continue;
      throw err;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
