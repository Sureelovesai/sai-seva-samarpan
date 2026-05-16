/**
 * Role-based QA workbooks → docs/qa/<RoleFolder>/<Role>_Testing.xlsx
 * One sheet per page; functionality-only language (no APIs / error codes).
 *
 * Run: npm run qa:export
 */

const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const { ROLES } = require("./rolesData.cjs");

/** Next to the web app (apps/web/docs/qa) — easy to find when working in apps/web */
const QA_ROOT = path.join(__dirname, "..", "..", "docs", "qa");

const TEST_HEADERS = [
  "Test #",
  "What we are checking",
  "Before you start",
  "Steps to follow",
  "What you should see",
  "Test on",
  "Pass? (Yes / No / Blocked / Skip)",
  "Your comments",
];

const PASS_VALIDATION = {
  type: "list",
  allowBlank: true,
  formulae: ['"Yes,No,Blocked,Skip"'],
};

const DEVICE_VALIDATION = {
  type: "list",
  allowBlank: true,
  formulae: ['"Phone,Computer,Both"'],
};

function sanitizeSheetName(name) {
  const cleaned = String(name).replace(/[\\/*?:\[\]]/g, " ").trim();
  return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned;
}

function styleHeaderRow(row) {
  row.font = { bold: true, size: 11 };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD4E4F7" },
  };
  row.alignment = { vertical: "middle", wrapText: true };
}

function addTestSheet(wb, page) {
  const ws = wb.addWorksheet(sanitizeSheetName(page.sheetName), {
    views: [{ state: "frozen", ySplit: page.intro ? 3 : 1 }],
  });

  let startRow = 1;
  if (page.intro) {
    ws.mergeCells(1, 1, 1, TEST_HEADERS.length);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = page.intro.title || page.sheetName;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { wrapText: true };

    ws.mergeCells(2, 1, 2, TEST_HEADERS.length);
    const introCell = ws.getCell(2, 1);
    introCell.value = page.intro.body;
    introCell.alignment = { wrapText: true, vertical: "top" };
    ws.getRow(2).height = Math.min(120, 15 + page.intro.body.split("\n").length * 14);

    startRow = 3;
  }

  ws.getRow(startRow).values = TEST_HEADERS;
  styleHeaderRow(ws.getRow(startRow));

  const passCol = TEST_HEADERS.indexOf("Pass? (Yes / No / Blocked / Skip)") + 1;
  const deviceCol = TEST_HEADERS.indexOf("Test on") + 1;

  page.tests.forEach((t, i) => {
    const rowNum = startRow + 1 + i;
    ws.addRow([
      t.id,
      t.check,
      t.before || "—",
      t.steps,
      t.expected,
      t.device || "Both",
      "",
      "",
    ]);
    const row = ws.getRow(rowNum);
    row.alignment = { wrapText: true, vertical: "top" };
    ws.getCell(rowNum, passCol).dataValidation = PASS_VALIDATION;
    ws.getCell(rowNum, deviceCol).dataValidation = DEVICE_VALIDATION;
  });

  ws.columns = [
    { width: 12 },
    { width: 34 },
    { width: 22 },
    { width: 40 },
    { width: 40 },
    { width: 12 },
    { width: 20 },
    { width: 32 },
  ];

  ws.autoFilter = {
    from: { row: startRow, column: 1 },
    to: { row: startRow, column: TEST_HEADERS.length },
  };
}

function addStartSheet(wb, role) {
  const ws = wb.addWorksheet("Start here", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.getColumn(1).width = 24;
  ws.getColumn(2).width = 70;

  const rows = [
    ["Role", role.title],
    ["Your login", role.loginHint],
    [""],
    ["How to use this file", ""],
    ["", "1. Stay logged in with ONLY this role’s test account (or stay logged out for Guest)."],
    ["", "2. Open each sheet tab below — each tab is one page on the website."],
    ["", "3. Follow the steps; compare with “What you should see.”"],
    ["", "4. Mark Pass? and write problems in Your comments (what you did, phone or computer, browser)."],
    [""],
    ["Pages in this workbook", "What this role should be able to do"],
    ...role.pageIndex.map((p) => [p.sheet, p.summary]),
    [""],
    ["What you should NOT see", role.shouldNotSee || "—"],
    [""],
    ["Need help?", "Use the chat bubble on the site. Say: “I am testing as " + role.title + "” and ask about the page."],
    [""],
    ["Notes for testers", role.testerNotes || "—"],
  ];

  for (const r of rows) {
    const row = ws.addRow(r);
    if (r[0] === "Role" || r[0] === "Pages in this workbook") {
      row.getCell(1).font = { bold: true };
    }
  }
}

async function exportRole(role) {
  const dir = path.join(QA_ROOT, role.folder);
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, role.fileName);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sai Seva Samarpan QA";
  wb.created = new Date();

  addStartSheet(wb, role);
  for (const page of role.pages) {
    addTestSheet(wb, page);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const fallbacks = [
    outPath,
    outPath.replace(/\.xlsx$/i, "_UPDATED.xlsx"),
    outPath.replace(/\.xlsx$/i, `_${stamp}.xlsx`),
  ];
  for (let i = 0; i < fallbacks.length; i++) {
    try {
      await wb.xlsx.writeFile(fallbacks[i]);
      if (i === 0) return fallbacks[i];
      return `${fallbacks[i]} (close open Excel files, then replace the older checklist)`;
    } catch (err) {
      if (err && err.code === "EBUSY" && i < fallbacks.length - 1) continue;
      throw err;
    }
  }
}

async function main() {
  fs.mkdirSync(QA_ROOT, { recursive: true });
  const written = [];
  for (const role of ROLES) {
    written.push(await exportRole(role));
  }
  console.log("Wrote role-based QA workbooks:\n" + written.map((p) => "  " + p).join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
