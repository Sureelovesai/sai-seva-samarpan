/**
 * Home page (/) QA matrix for domain testers → docs/qa/Home_Page_Testing.xlsx
 * Run from apps/web: npm run qa:export:home
 */

const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const OUT_DIR = path.join(__dirname, "..", "..", "..", "docs", "qa");
const OUT_FILE = path.join(OUT_DIR, "Home_Page_Testing.xlsx");

/** Layman-friendly columns — easy for non-professional testers */
const HEADERS = [
  "Test #",
  "Page",
  "Section on page",
  "What we are testing",
  "Who should test this",
  "Before you start",
  "Steps to follow",
  "What you should see (expected result)",
  "Test on",
  "Pass? (Yes / No / Blocked / Skip)",
  "Your notes or issues",
  "Priority",
];

const ROWS = [
  [
    "HP-01",
    "Home",
    "Whole page",
    "Home page opens and looks complete",
    "Anyone (guest or logged in)",
    "Internet connection works; use Chrome or Safari",
    "1. Open the website home page.\n2. Wait until loading finishes.\n3. Slowly scroll from top to bottom.",
    "No error messages; you see banner, menu, buttons, calendar, impact numbers, and featured section (or a clear “no featured activities” message).",
    "Both phone and computer",
    "",
    "",
    "Must test",
  ],
  [
    "HP-02",
    "Home",
    "Top menu",
    "Guest sees Login and no admin links",
    "Guest (not logged in)",
    "You are logged out",
    "1. Open home page.\n2. Look at the top menu.\n3. Check if a second row appears below the main menu.",
    "You see **Login**. You do **not** see Seva Admin Dashboard or Roles.",
    "Both",
    "",
    "",
    "Must test",
  ],
  [
    "HP-03",
    "Home",
    "Top menu",
    "Volunteer does not see admin menu",
    "Logged-in volunteer (no coordinator/admin role)",
    "Log in as a regular volunteer account",
    "1. Open home page.\n2. Check top menu and any second row.",
    "You see **Logout**. No second row with Seva Admin Dashboard.",
    "Both",
    "",
    "",
    "Must test",
  ],
  [
    "HP-04",
    "Home",
    "Top menu",
    "Admin sees Seva Admin Dashboard and Roles",
    "Admin",
    "Log in as Admin",
    "1. Open home page.\n2. Look for the second menu row.",
    "Second row shows **Seva Admin Dashboard** and **Roles**.",
    "Computer (phone optional)",
    "",
    "",
    "Must test",
  ],
  [
    "HP-05",
    "Home",
    "Top menu",
    "Seva Coordinator sees admin link but not Roles",
    "Seva Coordinator (not Admin)",
    "Log in as coordinator only",
    "1. Open home page.\n2. Check second row.",
    "**Seva Admin Dashboard** appears. **Roles** does **not** appear (unless you are also Admin).",
    "Both",
    "",
    "",
    "Should test",
  ],
  [
    "HP-06",
    "Home",
    "Top menu",
    "Blog Admin sees Seva Admin Dashboard",
    "Blog Admin (not Admin)",
    "Log in as Blog Admin",
    "1. Open home page.\n2. Check second row.",
    "**Seva Admin Dashboard** visible; **Roles** only if you are also Admin.",
    "Both",
    "",
    "",
    "Should test",
  ],
  [
    "HP-07",
    "Home",
    "Top menu",
    "Event-only admin sees Event Admin Dashboard",
    "Event Admin only",
    "Account with Event Admin role only",
    "1. Open home page.\n2. Check second row.",
    "Only **Event Admin Dashboard** in second row — not full Seva admin tools.",
    "Both",
    "",
    "",
    "Should test",
  ],
  [
    "HP-08",
    "Home",
    "Top menu — mobile",
    "Mobile menu opens and links work",
    "Anyone",
    "Use a phone or narrow browser window",
    "1. Open home on phone.\n2. Tap the menu (hamburger) icon.\n3. Tap Home, Find Seva, Login.",
    "Menu opens; links go to the right pages; menu closes when you pick a link.",
    "Phone",
    "",
    "",
    "Must test",
  ],
  [
    "HP-09",
    "Home",
    "Hero banner",
    "Welcome banner displays",
    "Anyone",
    "—",
    "1. Open home page.\n2. Look at the large image/banner at the top.",
    "Banner image loads (or a fallback image — not a broken picture icon).",
    "Both",
    "",
    "",
    "Must test",
  ],
  [
    "HP-10",
    "Home",
    "Main buttons",
    "Find Seva button works",
    "Anyone",
    "—",
    "1. On home page, click **Find Seva**.",
    "You go to the Find Seva page where you can search activities.",
    "Both",
    "",
    "",
    "Must test",
  ],
  [
    "HP-11",
    "Home",
    "Main buttons",
    "My Seva Dashboard button works",
    "Anyone",
    "—",
    "1. On home page, click **My Seva Dashboard**.",
    "You go to the dashboard page (guests may see a login prompt — that is OK).",
    "Both",
    "",
    "",
    "Must test",
  ],
  [
    "HP-12",
    "Home",
    "Seva Activity Calendar",
    "Calendar section shows on home",
    "Anyone",
    "—",
    "1. Scroll to **Seva Activity Calendar**.\n2. Check that dates/activities appear or a clear empty state.",
    "Calendar area is visible; you can interact without logging in.",
    "Both",
    "",
    "",
    "Must test",
  ],
  [
    "HP-13",
    "Home",
    "Our Impact",
    "Impact numbers load",
    "Anyone",
    "—",
    "1. Scroll to **Our Impact**.\n2. Wait a few seconds.",
    "Three boxes show numbers (activities, volunteers, hours) — not stuck on “…” forever.",
    "Both",
    "",
    "",
    "Must test",
  ],
  [
    "HP-14",
    "Home",
    "Featured Seva",
    "Featured activities carousel",
    "Anyone",
    "At least one activity marked “featured” in admin (ask coordinator if empty)",
    "1. Scroll to **Featured Seva**.\n2. If there are cards, use arrows or swipe.\n3. Click **View More** on one card.",
    "Cards show title and category; sliding works; **View More** opens activity details.",
    "Both",
    "",
    "",
    "Must test",
  ],
  [
    "HP-15",
    "Home",
    "Featured Seva",
    "Empty featured list message",
    "Anyone",
    "No featured activities in system (or test in staging)",
    "1. Open home.\n2. Scroll to Featured Seva.",
    "Friendly message that no featured activities are available — page is not broken.",
    "Both",
    "",
    "",
    "Nice to have",
  ],
  [
    "HP-16",
    "Home",
    "Top menu",
    "Community Network dropdown",
    "Anyone",
    "—",
    "1. Click **Community Network** in the menu.\n2. Try each submenu link.",
    "Dropdown opens; links go to Community Outreach, Find Community Activity, or Partner Organizations.",
    "Computer (phone: use mobile menu)",
    "",
    "",
    "Should test",
  ],
  [
    "HP-17",
    "Home",
    "Top menu",
    "Home link highlights on home page",
    "Anyone",
    "—",
    "1. On home page, look at **Home** in the menu.",
    "Home looks selected/active while you are on the home page.",
    "Both",
    "",
    "",
    "Nice to have",
  ],
  [
    "HP-18",
    "Home",
    "Footer",
    "Footer links and text",
    "Anyone",
    "—",
    "1. Scroll to the bottom of the home page.\n2. Tap or click footer links if any.",
    "Footer appears; links work or open expected pages.",
    "Both",
    "",
    "",
    "Should test",
  ],
  [
    "HP-19",
    "Home",
    "Chat assistant",
    "Chatbot answers home page questions",
    "Anyone",
    "Chat bubble visible (bottom-right on most pages)",
    "1. Open chat.\n2. Ask: “What should I see on the home page?”\n3. Ask: “How do I test the home page?”",
    "Clear, helpful steps; may offer buttons to Find Seva or Dashboard.",
    "Both",
    "",
    "",
    "Should test",
  ],
  [
    "HP-20",
    "Home",
    "After login",
    "Menu updates after role change",
    "Anyone with a new role",
    "Admin just assigned you coordinator or admin role",
    "1. Log out completely.\n2. Log back in.\n3. Open home and check the menu.",
    "New admin/coordinator links appear if your role allows them.",
    "Both",
    "",
    "",
    "Must test",
  ],
];

const PASS_VALIDATION = {
  type: "list",
  allowBlank: true,
  formulae: ['"Yes,No,Blocked,Skip"'],
};

const PRIORITY_VALIDATION = {
  type: "list",
  allowBlank: true,
  formulae: ['"Must test,Should test,Nice to have"'],
};

const TEST_ON_VALIDATION = {
  type: "list",
  allowBlank: true,
  formulae: ['"Phone,Computer,Both"'],
};

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sai Seva Samarpan QA";
  wb.created = new Date();

  const ws = wb.addWorksheet("Home page tests", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.addRow(HEADERS);
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD4E4F7" },
  };
  headerRow.alignment = { vertical: "middle", wrapText: true };

  for (const r of ROWS) {
    const row = ws.addRow(r);
    row.alignment = { wrapText: true, vertical: "top" };
  }

  const passCol = HEADERS.indexOf("Pass? (Yes / No / Blocked / Skip)") + 1;
  const priorityCol = HEADERS.indexOf("Priority") + 1;
  const testOnCol = HEADERS.indexOf("Test on") + 1;
  for (let i = 2; i <= ROWS.length + 1; i++) {
    ws.getCell(i, passCol).dataValidation = PASS_VALIDATION;
    ws.getCell(i, priorityCol).dataValidation = PRIORITY_VALIDATION;
    ws.getCell(i, testOnCol).dataValidation = TEST_ON_VALIDATION;
  }

  ws.columns = [
    { width: 8 },
    { width: 10 },
    { width: 18 },
    { width: 32 },
    { width: 28 },
    { width: 24 },
    { width: 38 },
    { width: 38 },
    { width: 14 },
    { width: 22 },
    { width: 28 },
    { width: 12 },
  ];

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: HEADERS.length },
  };

  const instructions = wb.addWorksheet("How to use this file");
  instructions.addRow(["Sai Seva Samarpan — Home page testing guide"]);
  instructions.getRow(1).font = { bold: true, size: 14 };
  const guide = [
    [""],
    ["Who this is for", "Domain volunteers and coordinators who know seva — not professional QA."],
    [""],
    ["How to test", "Work one row at a time on the “Home page tests” sheet."],
    ["", "1. Read “What we are testing” and “Who should test this” — skip rows that don’t apply to your account."],
    ["", "2. Follow “Steps to follow” exactly."],
    ["", "3. Compare with “What you should see”."],
    ["", "4. Choose Pass? = Yes, No, Blocked (couldn’t test), or Skip."],
    ["", "5. Write problems in “Your notes or issues” (what you did, what happened, phone or computer)."],
    [""],
    ["Priority", "Must test = do first. Should test = important. Nice to have = if time allows."],
    [""],
    ["Roles cheat sheet", "See “Menu by role” sheet."],
    [""],
    ["Need help?", "Use the chat bubble on the website and ask: “How do I test the home page?”"],
    [""],
    ["Next pages", "Find Seva, Dashboard, and Admin sheets will be added in follow-up releases."],
  ];
  for (const line of guide) instructions.addRow(line);
  instructions.columns = [{ width: 22 }, { width: 72 }];

  const roles = wb.addWorksheet("Menu by role");
  roles.addRow(["Your role", "What you should see on the menu (home and other pages)"]);
  roles.getRow(1).font = { bold: true };
  const roleRows = [
    ["Guest", "Login only — no Seva Admin Dashboard"],
    ["Volunteer (logged in)", "Logout — no admin second row"],
    ["Seva Coordinator", "Seva Admin Dashboard — no Roles link"],
    ["Blog Admin", "Seva Admin Dashboard — Roles only if also Admin"],
    ["Regional / National Coordinator", "Same as Seva Coordinator"],
    ["Admin", "Seva Admin Dashboard + Roles"],
    ["Event Admin only", "Event Admin Dashboard only"],
  ];
  for (const rr of roleRows) roles.addRow(rr);
  roles.columns = [{ width: 32 }, { width: 55 }];

  await wb.xlsx.writeFile(OUT_FILE);
  console.log("Wrote", OUT_FILE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
