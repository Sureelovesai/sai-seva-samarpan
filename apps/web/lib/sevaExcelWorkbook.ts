import ExcelJS from "exceljs";

import { SEVA_CATEGORIES } from "@/lib/categories";
import { CITIES } from "@/lib/cities";
import { CONTRIBUTION_ITEMS_SHEET } from "@/lib/sevaBulkImport";

/** Visible sheet 2 — activity definition (human-readable columns + dropdowns). */
export const ADD_SEVA_ACTIVITY_SHEET = "Add Seva Activity";

/** Visible sheet 3 — one row per individual; contribution items map via item__ columns + quantities (bulk import reads this sheet). */
export const JOIN_SEVA_ACTIVITY_SHEET = "Join Seva Activity";

/** @deprecated Use JOIN_SEVA_ACTIVITY_SHEET */
export const JOIN_SEVA_SHEET = JOIN_SEVA_ACTIVITY_SHEET;

/** @deprecated Use ADD_SEVA_ACTIVITY_SHEET */
export const SEVA_WORKBOOK_ACTIVITY_SHEET = ADD_SEVA_ACTIVITY_SHEET;

/** Hidden sheet holding list sources for data validation. */
const LISTS_SHEET = "_Lists";

export type SevaWorkbookActivityRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  capacity: number | null;
  startDate: Date | null;
  endDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  durationHours: number | null;
  city: string;
  organizationName: string | null;
  locationName: string | null;
  address: string | null;
  coordinatorName: string | null;
  coordinatorEmail: string | null;
  coordinatorPhone: string | null;
  isActive: boolean;
  isFeatured: boolean;
  listedAsCommunityOutreach: boolean;
  status: string;
  imageUrl: string | null;
};

export type SevaWorkbookItem = {
  id: string;
  name: string;
  maxQuantity: number;
  /** Sum of confirmed claims at export (for Contribution items sheet). */
  filledQuantity?: number;
};

const BLANK_CONTRIBUTION_EXAMPLES: { name: string; max: number }[] = [
  { name: "Drinking water (cases)", max: 24 },
  { name: "Sandwich platters", max: 8 },
  { name: "Fruit trays", max: 12 },
  { name: "Napkins (packs)", max: 200 },
];

/** Muted styling for template-only sample rows (same idea as Contribution items examples). */
const SAMPLE_ROW_FONT: Partial<ExcelJS.Font> = {
  italic: true,
  color: { argb: "FF9CA3AF" },
};

function sampleCityForTemplate(): string {
  return CITIES.find((c) => c === "Charlotte") ?? CITIES[0] ?? "Charlotte";
}

/** Full sample row for Add Seva Activity (blank template only; row 2 is for real data — this row is not parsed). */
function blankTemplateAddSevaSampleRow(): (string | number)[] {
  const city = sampleCityForTemplate();
  return [
    "",
    "Weekend community lunch (example)",
    SEVA_CATEGORIES[0],
    "Arrive 30 minutes early. Closed-toe shoes; hair tied back for kitchen.",
    40,
    "2026-06-15",
    "09:00",
    "2026-06-15",
    "13:00",
    3,
    city,
    "Sai Center — main hall",
    "123 Example Street (sample), " + city,
    "R. Coordinator (example)",
    "coordinator.sample@example.com",
    "+1-555-0100",
    "Active",
    "",
  ];
}

export type SevaWorkbookSignup = {
  id: string;
  volunteerName: string;
  email: string;
  phone: string | null;
  adultsCount: number;
  kidsCount: number;
  status: string;
  comment: string | null;
  createdAt: Date;
};

export type SevaWorkbookClaim = {
  itemId: string;
  email: string;
  quantity: number;
  status: string;
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toISOString().slice(0, 10);
}

function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toISOString().replace("T", " ").slice(0, 19);
}

function quarterHourTimes(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}

const ACTIVE_FEATURED_OPTIONS = ["Active", "Active & Featured", "Inactive"] as const;

const DURATION_OPTIONS = ["0.5", "1", "1.5", "2", "2.5", "3", "4", "5", "6", "8", "10", "12"];

function encodeActiveFeatured(isActive: boolean, isFeatured: boolean): string {
  if (!isActive) return "Inactive";
  if (isFeatured) return "Active & Featured";
  return "Active";
}

/** Row 1 headers for the Add Seva Activity sheet (display labels). Trailing * = required for upload (stripped when parsing). */
export function addSevaActivityDisplayHeaders(): string[] {
  return [
    "Activity ID (system — leave blank for new) (optional)",
    "Seva Activity *",
    "Find Service (Service Category) *",
    "Description (optional)",
    "Capacity *",
    "Start Date *",
    "Start Time *",
    "End Date *",
    "End Time *",
    "Duration (hours) *",
    "City *",
    "Location Name (optional)",
    "Address *",
    "Coordinator name *",
    "Coordinator Email *",
    "Coordinator Phone Number *",
    "Active / Featured (optional — default Active)",
    "Contribution items (optional — summary only)",
  ];
}

function contributionItemsSummary(items: SevaWorkbookItem[]): string {
  if (!items.length) return "";
  return items.map((it) => `${it.name} (max ${it.maxQuantity})`).join("; ");
}

function addSevaDataValues(
  mode: "blank" | "filled",
  activity: SevaWorkbookActivityRow | undefined,
  items: SevaWorkbookItem[]
): (string | number)[] {
  if (mode !== "filled" || !activity) {
    return addSevaActivityDisplayHeaders().map(() => "");
  }
  return [
    activity.id,
    activity.title,
    activity.category,
    activity.description ?? "",
    activity.capacity ?? "",
    fmtDate(activity.startDate),
    activity.startTime ?? "",
    fmtDate(activity.endDate),
    activity.endTime ?? "",
    activity.durationHours ?? "",
    activity.city,
    activity.locationName ?? "",
    activity.address ?? "",
    activity.coordinatorName ?? "",
    activity.coordinatorEmail ?? "",
    activity.coordinatorPhone ?? "",
    encodeActiveFeatured(activity.isActive, activity.isFeatured),
    contributionItemsSummary(items),
  ];
}

function joinSevaDisplayHeaders(items: SevaWorkbookItem[]): string[] {
  return [
    "Signup ID (optional — export only)",
    "Volunteer name *",
    "Email *",
    "Phone *",
    "Adults count *",
    "Kids count (optional)",
    "Signup status (optional)",
    "Comment (optional)",
    "Created at (optional — export only)",
    ...items.map((it) => `item__${it.id}`),
  ];
}

function claimsByEmailLower(
  claims: SevaWorkbookClaim[]
): Map<string, Map<string, number>> {
  const m = new Map<string, Map<string, number>>();
  for (const c of claims) {
    if (c.status === "CANCELLED") continue;
    const e = c.email.trim().toLowerCase();
    if (!m.has(e)) m.set(e, new Map());
    const im = m.get(e)!;
    im.set(c.itemId, (im.get(c.itemId) ?? 0) + c.quantity);
  }
  return m;
}

function signupDataRow(
  s: SevaWorkbookSignup,
  items: SevaWorkbookItem[],
  claimMap: Map<string, Map<string, number>>
): (string | number)[] {
  const key = s.email.trim().toLowerCase();
  const perItem = claimMap.get(key);
  const itemCells = items.map((it) => {
    const q = perItem?.get(it.id);
    return q != null && q > 0 ? q : "";
  });
  return [
    s.id,
    s.volunteerName,
    s.email,
    s.phone ?? "",
    s.adultsCount,
    s.kidsCount,
    s.status,
    s.comment ?? "",
    fmtDateTime(s.createdAt),
    ...itemCells,
  ];
}

function exampleJoinSevaRow(items: SevaWorkbookItem[]): (string | number)[] {
  return [
    "",
    "Sample Volunteer",
    "volunteer@example.com",
    "+1-555-0100",
    1,
    0,
    "",
    "",
    "",
    ...items.map(() => ""),
  ];
}

/** Second gray sample row on blank Join Seva template (skipped on upload with exampleJoinSevaRow). */
function secondExampleJoinSevaRow(items: SevaWorkbookItem[]): (string | number)[] {
  const itemCells = items.map((_, i) => (i === 0 ? 2 : i === 1 ? 1 : ""));
  return [
    "",
    "Priya Sharma (sample)",
    "priya.sample@example.com",
    "+1-555-0199",
    2,
    1,
    "",
    "",
    "",
    ...itemCells,
  ];
}

function instructionLineForItem(it: SevaWorkbookItem): string {
  const name = it.name.replace(/\s+/g, " ").trim() || "(unnamed item)";
  return `    • ${name} — activity max (total units/slots for everyone): ${it.maxQuantity} — column header: item__${it.id}`;
}

function buildInstructionLines(items: SevaWorkbookItem[]): string[] {
  const lines: string[] = [
    "Seva Activity — Excel workbook",
    "",
    "Tab order: Instructions → Add Seva Activity → Contribution items → Join Seva Activity",
    "",
    "Light gray italic rows are EXAMPLES ONLY (like Contribution items). They are not imported. Enter real data in the normal (non-gray) rows.",
    "",
    "SHEET: Add Seva Activity",
    "  Row 1: column names. Row 2: one activity (blank in the blank template; filled when you download after saving).",
    "  REQUIRED columns end with * or say (required). (optional) may be left blank. Capacity must be a whole number ≥ 1 (column formatted as a number).",
    "  Start Date and End Date (columns F and H): use the in-cell date picker (calendar) or type YYYY-MM-DD.",
    "  On Upload filled Excel: if you upload from Add Seva **without** a published activity saved in that browser session, row 2 **creates** a new published activity, then Contribution items and Join Seva Activity are applied. If you already have a published activity saved on that page, row 2 **updates** that activity first.",
    "  Activity ID: Do NOT invent an ID. Leave blank when creating from a blank template; upload assigns a real ID. After you download a template for an existing activity, the ID is filled for reference (must match when updating that same activity).",
    "  Dropdowns: Find Service (Service Category) = Find Seva categories; Start Time / End Time = 15-minute slots; Duration (hours); Active / Featured.",
    "  Contribution items column: short summary. The Contribution items tab is the place to edit activity-wide max (and names) in Excel — those values apply on upload before volunteer rows are imported.",
    "  Required on the website / upload: same as columns marked * on the sheet (title, category, capacity as integer, dates, times, duration, city, address, coordinator name/email/phone).",
    "  Dates: use YYYY-MM-DD. For draft/publish, image URL, or community-outreach-only listing, use the Add / Manage Seva pages.",
    "",
    "SHEET: Contribution items (full list for this activity — manage in Excel)",
    "  One row per item. New rows: Item name * and Activity max (total) * as a whole number. Columns: Item ID (optional when creating), Item name, Activity max (number), Claimed so far (export), Remaining (formula).",
    "  If any row has an Item ID, the sheet is the full ordered list (same as Manage Seva): update by ID, add rows with blank ID, and items missing from the sheet may be removed if unclaimed. If every Item ID is blank, only new rows are added — existing items are kept.",
    "  Blank-template sample names (e.g. Drinking water (cases)) are ignored on upload. After new items are created, re-download the template to get item__… columns on Join Seva Activity for those items.",
    "  Join Seva Activity: each volunteer row’s name, email, and phone are stored on the signup and on each item claim for that person (same as Join Seva on the website).",
    "",
    "SHEET: Join Seva Activity (map every contribution item to an individual here)",
    "  Blank template: two light gray sample rows show the format; they are ignored on upload. Replace with real volunteers or delete them.",
    "  Each ROW = one person (individual). Name, email, phone appear once per person.",
    "  Each ITEM is a COLUMN to the right (header item__...). That maps many contribution items to the same individual: enter a quantity in each column for that row, or leave blank for items they are not bringing.",
    "  Example: one volunteer can enter quantities in several item__ columns on the same row — each column is a different item for that same person.",
    "  Do NOT duplicate the person on extra rows just to add another item; add more item columns from a fresh template if the activity has many items.",
    "  Activity-wide maximum per item (total across everyone) is set on the website; upload rejects if quantities would exceed what is left.",
    "  Bulk upload imports this sheet only (name: Join Seva Activity, or legacy Join Seva / Volunteers).",
    "  Required (columns with *): Volunteer name, Email, Phone, Adults count (use whole numbers).",
    "  Optional: Signup ID (export only — do not invent), Kids count, Signup status, Comment, Created at.",
    "",
    "  ——— SAMPLE: one volunteer row, many contribution items + activity max (illustration only) ———",
    "  Suppose Manage Seva defines these items (max = total units/slots for the ENTIRE activity, everyone combined):",
    "    • Drinking water (cases) — activity max 24",
    "    • Sandwich platters — activity max 8",
    "    • Fruit trays — activity max 12",
    "    • Napkins (packs) — activity max 200",
    "  Your downloaded file uses real column headers item__<id> for each item (hover a header for the friendly name + max).",
    "  One row for Priya (identity columns once; then one quantity per item column):",
    "    Volunteer name: Priya Sharma | Email: priya@example.com | Phone: +1-555-0100 | Adults count: 2 | …",
    "    item__(water): 3 | item__(sandwiches): 1 | item__(fruit): (leave blank) | item__(napkins): 20",
    "  Meaning: Priya brings 3 cases of water, 1 sandwich platter, no fruit tray, 20 napkin packs — all on the SAME row.",
    "  Upload adds these claims only if 3 / 1 / 20 still fit what is left under each item’s activity max after existing sign-ups.",
  ];

  if (items.length === 0) {
    lines.push(
      "  No item__ columns on a blank template: define items on the Contribution items sheet and upload to create the activity + items together, or add items on the website and download again for item__ columns."
    );
  } else {
    lines.push("  Item columns (hover the header row on Join Seva Activity for the same info):");
    for (const it of items) lines.push(instructionLineForItem(it));
  }

  lines.push("", "Hidden sheet _Lists: supplies dropdown options (do not delete).");
  return lines;
}

function itemColumnHeaderNote(it: SevaWorkbookItem): string {
  const name = it.name.replace(/\s+/g, " ").trim() || "Item";
  return [
    `Contribution item: ${name}`,
    `Mapped to each individual on this sheet: use one row per person; this column is their quantity for this item.`,
    `Activity max (all people combined): ${it.maxQuantity} units/slots`,
    "Rows below: whole number = how many this row's person brings, or blank if none.",
    "Do not rename this column header.",
  ].join("\n");
}

function listsSheetRef(col: string, fromRow: number, toRow: number): string {
  return `'${LISTS_SHEET}'!$${col}$${fromRow}:$${col}$${toRow}`;
}

/** exceljs Worksheet typings omit `dataValidations` in some releases; it exists at runtime. */
function addListValidation(ws: ExcelJS.Worksheet, range: string, formulae: string[]): void {
  (
    ws as unknown as {
      dataValidations: {
        add: (
          r: string,
          o: { type: "list"; allowBlank: boolean; formulae: string[] }
        ) => void;
      };
    }
  ).dataValidations.add(range, { type: "list", allowBlank: true, formulae });
}

/** Excel date picker (between) for Start / End date columns — typ. F and H on Add Seva Activity. */
function addDateBetweenValidation(ws: ExcelJS.Worksheet, range: string): void {
  (
    ws as unknown as {
      dataValidations: {
        add: (
          r: string,
          o: {
            type: "date";
            operator: "between";
            allowBlank: boolean;
            formulae: Date[];
          }
        ) => void;
      };
    }
  ).dataValidations.add(range, {
    type: "date",
    operator: "between",
    allowBlank: true,
    formulae: [new Date(2020, 0, 1), new Date(2036, 11, 31)],
  });
}

/**
 * Full workbook: Instructions, Add Seva Activity, Contribution items (caps), Join Seva Activity (individuals + quantities).
 */
export async function buildSevaActivityWorkbookBuffer(params: {
  mode: "blank" | "filled";
  activity?: SevaWorkbookActivityRow;
  items: SevaWorkbookItem[];
  signups?: SevaWorkbookSignup[];
  claims?: SevaWorkbookClaim[];
}): Promise<Buffer> {
  const { mode, items } = params;
  const activity = params.activity;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Sai Seva";

  const listWs = wb.addWorksheet(LISTS_SHEET, { state: "veryHidden" });

  SEVA_CATEGORIES.forEach((cat, i) => {
    listWs.getCell(i + 1, 1).value = cat;
  });
  const nCat = SEVA_CATEGORIES.length;

  ACTIVE_FEATURED_OPTIONS.forEach((opt, i) => {
    listWs.getCell(i + 1, 2).value = opt;
  });
  const nActive = ACTIVE_FEATURED_OPTIONS.length;

  const times = quarterHourTimes();
  times.forEach((t, i) => {
    listWs.getCell(i + 1, 3).value = t;
  });
  const nTime = times.length;

  DURATION_OPTIONS.forEach((d, i) => {
    listWs.getCell(i + 1, 4).value = d;
  });
  const nDur = DURATION_OPTIONS.length;

  listWs.getCell(1, 5).value = "APPROVED";
  listWs.getCell(2, 5).value = "PENDING";

  const instr = wb.addWorksheet("Instructions");
  const instructionLines = buildInstructionLines(items);
  instructionLines.forEach((line, i) => {
    instr.getCell(i + 1, 1).value = line;
  });
  instr.getColumn(1).width = 100;

  const addWs = wb.addWorksheet(ADD_SEVA_ACTIVITY_SHEET);
  const addHeaders = addSevaActivityDisplayHeaders();
  addWs.addRow(addHeaders);
  addWs.addRow(addSevaDataValues(mode, activity, items));

  if (mode === "blank") {
    const nCol = addHeaders.length;
    addWs.mergeCells(3, 1, 3, nCol);
    const hint = addWs.getRow(3).getCell(1);
    hint.value =
      "Example row below (light gray) is for reference only — not imported. Enter your real activity in row 2.";
    hint.font = SAMPLE_ROW_FONT;
    hint.alignment = { vertical: "middle", wrapText: true };
    addWs.addRow(blankTemplateAddSevaSampleRow());
    addWs.getRow(4).eachCell({ includeEmpty: true }, (cell) => {
      cell.font = SAMPLE_ROW_FONT;
    });
  }

  addWs.getRow(1).font = { bold: true };
  addWs.getRow(1).alignment = { wrapText: true, vertical: "middle" };

  const addWidths = [38, 28, 30, 40, 10, 12, 10, 12, 10, 14, 14, 22, 36, 20, 28, 22, 18, 48];
  addWidths.forEach((w, i) => {
    addWs.getColumn(i + 1).width = w;
  });

  addListValidation(addWs, "C2:C500", [listsSheetRef("A", 1, nCat)]);
  addListValidation(addWs, "G2:G500", [listsSheetRef("C", 1, nTime)]);
  addListValidation(addWs, "I2:I500", [listsSheetRef("C", 1, nTime)]);
  addListValidation(addWs, "J2:J500", [listsSheetRef("D", 1, nDur)]);
  addListValidation(addWs, "Q2:Q500", [listsSheetRef("B", 1, nActive)]);
  addDateBetweenValidation(addWs, "F2:F500");
  addDateBetweenValidation(addWs, "H2:H500");

  /** Capacity (column 5): integer number format for data row and template cells */
  for (let r = 2; r <= 500; r++) {
    addWs.getCell(r, 5).numFmt = "0";
  }
  const capHeader = addWs.getRow(1).getCell(5);
  capHeader.note =
    "Required. Whole number ≥ 1 (maximum on-site volunteers). Use digits only — cell is formatted as a number.";

  const ciHeaders = [
    "Item ID (do not change) (optional for new items)",
    "Item name *",
    "Activity max (total) *",
    "Claimed so far (at download) (optional)",
    "Remaining (formula)",
  ];
  const ciWs = wb.addWorksheet(CONTRIBUTION_ITEMS_SHEET);
  ciWs.addRow(ciHeaders);
  ciWs.getRow(1).font = { bold: true };
  ciWs.getRow(1).alignment = { wrapText: true, vertical: "middle" };

  if (mode === "filled" && items.length > 0) {
    items.forEach((it, i) => {
      const r = i + 2;
      const claimed = it.filledQuantity ?? 0;
      ciWs.getCell(`A${r}`).value = it.id;
      ciWs.getCell(`B${r}`).value = it.name;
      ciWs.getCell(`C${r}`).value = it.maxQuantity;
      ciWs.getCell(`D${r}`).value = claimed;
      ciWs.getCell(`E${r}`).value = { formula: `MAX(0,C${r}-D${r})` };
    });
  } else if (mode === "blank" && items.length === 0) {
    BLANK_CONTRIBUTION_EXAMPLES.forEach((ex, i) => {
      const r = i + 2;
      ciWs.getCell(`A${r}`).value = "";
      ciWs.getCell(`B${r}`).value = ex.name;
      ciWs.getCell(`B${r}`).font = SAMPLE_ROW_FONT;
      ciWs.getCell(`C${r}`).value = ex.max;
      ciWs.getCell(`C${r}`).font = SAMPLE_ROW_FONT;
    });
  }

  [40, 34, 22, 28, 14].forEach((w, i) => {
    ciWs.getColumn(i + 1).width = w;
  });

  for (let r = 2; r <= 500; r++) {
    ciWs.getCell(r, 3).numFmt = "0";
  }

  const claimMap = params.claims?.length ? claimsByEmailLower(params.claims) : new Map<string, Map<string, number>>();
  const vHeaders = joinSevaDisplayHeaders(items);

  let volunteerRows: (string | number)[][];
  if (mode === "filled" && params.signups !== undefined) {
    volunteerRows =
      params.signups.length > 0
        ? [vHeaders, ...params.signups.map((s) => signupDataRow(s, items, claimMap))]
        : [vHeaders];
  } else {
    volunteerRows = [vHeaders, exampleJoinSevaRow(items), secondExampleJoinSevaRow(items)];
  }

  const joinWs = wb.addWorksheet(JOIN_SEVA_ACTIVITY_SHEET);
  volunteerRows.forEach((row) => joinWs.addRow(row));
  joinWs.getRow(1).font = { bold: true };

  if (mode === "blank") {
    joinWs.getRow(2).eachCell({ includeEmpty: true }, (cell) => {
      cell.font = SAMPLE_ROW_FONT;
    });
    joinWs.getRow(3).eachCell({ includeEmpty: true }, (cell) => {
      cell.font = SAMPLE_ROW_FONT;
    });
  }

  const joinBaseWidths = [12, 22, 28, 14, 12, 12, 14, 28, 20];
  joinBaseWidths.forEach((w, i) => {
    joinWs.getColumn(i + 1).width = w;
  });
  items.forEach((_, i) => {
    const col = joinBaseWidths.length + i + 1;
    joinWs.getColumn(col).width = 14;
    for (let r = 2; r <= 500; r++) {
      joinWs.getCell(r, col).numFmt = "0";
    }
  });

  addListValidation(joinWs, "G2:G500", [listsSheetRef("E", 1, 2)]);

  for (let r = 2; r <= 500; r++) {
    joinWs.getCell(r, 5).numFmt = "0";
    joinWs.getCell(r, 6).numFmt = "0";
  }

  const firstItemCol = joinBaseWidths.length + 1;
  items.forEach((it, i) => {
    const col = firstItemCol + i;
    const cell = joinWs.getRow(1).getCell(col);
    cell.note = itemColumnHeaderNote(it);
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/** @deprecated Use addSevaActivityDisplayHeaders */
export function activityWorkbookHeaders(): string[] {
  return addSevaActivityDisplayHeaders();
}
