import * as XLSX from "xlsx";

/** Legacy sheet name; bulk import also accepts "Join Seva Activity" and "Join Seva". */
export const BULK_VOLUNTEERS_SHEET = "Volunteers";

/** Current Excel template tab for signups + per-person item quantities. */
export const BULK_JOIN_SEVA_ACTIVITY_SHEET = "Join Seva Activity";

/** Worksheet for activity-wide item caps (editable); applied on bulk upload before Join Seva rows. */
export const CONTRIBUTION_ITEMS_SHEET = "Contribution items";

/** Resolve worksheet used for volunteer rows (new template or legacy). */
export function resolveBulkVolunteersSheetName(sheetNames: string[]): string | undefined {
  return sheetNames.find((n) => {
    const t = n.trim().toLowerCase();
    return (
      t === BULK_JOIN_SEVA_ACTIVITY_SHEET.toLowerCase() ||
      t === "join seva" ||
      t === BULK_VOLUNTEERS_SHEET.toLowerCase()
    );
  });
}

/** Canonical column keys (first-row headers after normalization). */
export const BULK_REQUIRED_KEYS = ["volunteer_name", "email", "phone", "adults_count"] as const;

export type BulkGridError = {
  /** Excel row number (1-based), including header row as row 1 for header errors. */
  row: number;
  column: string;
  message: string;
};

export type ParsedBulkVolunteerRow = {
  excelRow: number;
  volunteer_name: string;
  email: string;
  phone: string;
  adults_count: number;
  kids_count: number;
  signup_status: "" | "APPROVED" | "PENDING";
  comment: string | null;
  items: { itemId: string; quantity: number }[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function cellStr(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.trunc(v) === v ? v : v);
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function cellInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.floor(v);
  const t = String(v).trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

/** Map header cell to canonical key or item__id or null if unknown (ignored). */
export function normalizeBulkHeader(raw: string, validItemIds: Set<string>): string | null {
  const h = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (!h) return null;

  const itemM = raw.trim().match(/^item__(.+)$/i);
  if (itemM) {
    const id = itemM[1].trim();
    if (validItemIds.has(id)) return `item__${id}`;
    return null;
  }

  const map: Record<string, string> = {
    volunteer_name: "volunteer_name",
    name: "volunteer_name",
    volunteer: "volunteer_name",
    full_name: "volunteer_name",
    email: "email",
    e_mail: "email",
    phone: "phone",
    phone_number: "phone",
    mobile: "phone",
    adults_count: "adults_count",
    adults: "adults_count",
    adult_count: "adults_count",
    kids_count: "kids_count",
    kids: "kids_count",
    child_count: "kids_count",
    children: "kids_count",
    signup_status: "signup_status",
    status: "signup_status",
    join_status: "signup_status",
    comment: "comment",
    notes: "comment",
    note: "comment",
    signup_id: "signup_id",
    created_at: "created_at",
    created: "created_at",
  };
  return map[h] ?? null;
}

/** Extract item id from canonical header item__{id} */
export function itemIdFromHeader(canonical: string): string | null {
  if (!canonical.startsWith("item__")) return null;
  return canonical.slice("item__".length) || null;
}

function normalizeContribItemHeader(
  raw: string
): "item_id" | "item_name" | "activity_max" | "_skip" | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return null;
  if (t.startsWith("item id")) return "item_id";
  if (t === "item name") return "item_name";
  if (t.includes("activity max") || t.includes("max (total)")) return "activity_max";
  if (t.includes("claimed")) return "_skip";
  if (t.includes("remaining")) return "_skip";
  return null;
}

export type ParsedContributionItemRow = {
  excelRow: number;
  /** Empty string = new item to create (name + max required). */
  itemId: string;
  name: string;
  maxQuantity: number;
};

/** Sample item names on the blank template — never turned into real DB rows on upload. */
export const BLANK_CONTRIBUTION_EXAMPLE_NAMES = new Set([
  "drinking water (cases)",
  "sandwich platters",
  "fruit trays",
  "napkins (packs)",
]);

export function isBlankContributionExampleName(name: string): boolean {
  return BLANK_CONTRIBUTION_EXAMPLE_NAMES.has(name.trim().toLowerCase().replace(/\s+/g, " "));
}

/**
 * Read Contribution items sheet (if present).
 * Rows with Item ID update existing items; rows with blank ID + name + max create new items (full list sync).
 */
export function parseContributionItemsWorkbook(buffer: Buffer): {
  errors: BulkGridError[];
  rows: ParsedContributionItemRow[];
} {
  const errors: BulkGridError[] = [];
  const rows: ParsedContributionItemRow[] = [];
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    errors.push({
      row: 1,
      column: "file",
      message: "Could not read file. Use a valid .xlsx or .xls workbook.",
    });
    return { errors, rows: [] };
  }

  const sheetName = wb.SheetNames.find(
    (n) => n.trim().toLowerCase() === CONTRIBUTION_ITEMS_SHEET.toLowerCase()
  );
  if (!sheetName) return { errors: [], rows: [] };

  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null | undefined)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  if (!matrix.length) return { errors: [], rows: [] };

  const headerCells = (matrix[0] ?? []).map((c) => cellStr(c));
  const colMap: Record<string, number> = {};
  const dedup = new Set<string>();

  for (let c = 0; c < headerCells.length; c++) {
    const raw = headerCells[c];
    if (!raw) continue;
    const key = normalizeContribItemHeader(raw);
    if (!key || key === "_skip") continue;
    if (dedup.has(key)) {
      errors.push({
        row: 1,
        column: XLSX.utils.encode_col(c),
        message: `Duplicate Contribution items column: "${raw}".`,
      });
      continue;
    }
    dedup.add(key);
    colMap[key] = c;
  }

  if (errors.length) return { errors, rows: [] };

  let willParseAny = false;
  for (let r = 1; r < matrix.length; r++) {
    const rowArr = matrix[r] ?? [];
    const itemId =
      colMap.item_id !== undefined ? cellStr(rowArr[colMap.item_id]).trim() : "";
    const name =
      colMap.item_name !== undefined ? cellStr(rowArr[colMap.item_name]).trim() : "";
    const maxRaw = colMap.activity_max !== undefined ? rowArr[colMap.activity_max] : "";
    const maxQ = cellInt(maxRaw);
    if (itemId) {
      willParseAny = true;
      break;
    }
    if (
      name &&
      !isBlankContributionExampleName(name) &&
      maxQ !== null &&
      maxQ >= 1
    ) {
      willParseAny = true;
      break;
    }
  }

  if (willParseAny) {
    if (colMap.activity_max === undefined || colMap.item_name === undefined) {
      errors.push({
        row: 1,
        column: "Contribution items",
        message:
          'Contribution items sheet must include "Item name" and "Activity max (total)" when you list items.',
      });
      return { errors, rows: [] };
    }
  }

  for (let r = 1; r < matrix.length; r++) {
    const excelRow = r + 1;
    const rowArr = matrix[r] ?? [];
    const get = (key: "item_id" | "item_name" | "activity_max"): unknown => {
      const idx = colMap[key];
      if (idx === undefined) return "";
      return rowArr[idx] ?? "";
    };

    const itemId = colMap.item_id !== undefined ? cellStr(get("item_id")).trim() : "";
    const name = colMap.item_name !== undefined ? cellStr(get("item_name")).trim() : "";
    const maxRaw = get("activity_max");
    const maxQ = cellInt(maxRaw);

    if (!itemId) {
      if (!name) {
        if (cellStr(maxRaw).trim()) {
          errors.push({
            row: excelRow,
            column: "Item name",
            message: "Item name is required when Activity max is set (or use Item ID for existing items).",
          });
        }
        continue;
      }
      if (isBlankContributionExampleName(name)) continue;
      if (maxQ === null || maxQ < 1) {
        errors.push({
          row: excelRow,
          column: "Activity max (total)",
          message: "Must be a whole number ≥ 1 for each new item.",
        });
        continue;
      }
      rows.push({ excelRow, itemId: "", name, maxQuantity: maxQ });
      continue;
    }

    if (colMap.activity_max === undefined) {
      errors.push({
        row: 1,
        column: "Contribution items",
        message: 'Missing "Activity max (total)" column.',
      });
      return { errors, rows: [] };
    }

    if (maxQ === null || maxQ < 1) {
      errors.push({
        row: excelRow,
        column: "Activity max (total)",
        message: "Must be a whole number ≥ 1.",
      });
      continue;
    }

    rows.push({ excelRow, itemId, name, maxQuantity: maxQ });
  }

  return { errors, rows };
}

export const BULK_IMPORT_MAX_ROWS = 500;
export const BULK_IMPORT_MAX_BYTES = 2 * 1024 * 1024;

export function parseBulkVolunteerWorkbook(
  buffer: Buffer,
  validItemIds: Set<string>
): {
  errors: BulkGridError[];
  rows: ParsedBulkVolunteerRow[];
  headerRow: Record<string, number>;
} {
  const errors: BulkGridError[] = [];
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    errors.push({ row: 1, column: "file", message: "Could not read file. Use a valid .xlsx or .xls workbook." });
    return { errors, rows: [], headerRow: {} };
  }

  const sheetName = resolveBulkVolunteersSheetName(wb.SheetNames) ?? wb.SheetNames[0];
  if (!sheetName) {
    errors.push({ row: 1, column: "file", message: "The workbook has no sheets." });
    return { errors, rows: [], headerRow: {} };
  }

  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null | undefined)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  if (!matrix.length) {
    errors.push({
      row: 1,
      column: sheetName,
      message: "The Join Seva Activity (or legacy Join Seva / Volunteers) sheet is empty.",
    });
    return { errors, rows: [], headerRow: {} };
  }

  const headerCells = (matrix[0] ?? []).map((c) => cellStr(c));
  const headerRow: Record<string, number> = {};
  const duplicateCheck = new Set<string>();

  for (let c = 0; c < headerCells.length; c++) {
    const raw = headerCells[c];
    if (!raw) continue;
    const canon = normalizeBulkHeader(raw, validItemIds);
    if (!canon) {
      errors.push({
        row: 1,
        column: XLSX.utils.encode_col(c),
        message: `Unknown or invalid column header: "${raw}". Use the downloaded template.`,
      });
      continue;
    }
    if (duplicateCheck.has(canon)) {
      errors.push({
        row: 1,
        column: XLSX.utils.encode_col(c),
        message: `Duplicate column: "${canon}".`,
      });
      continue;
    }
    duplicateCheck.add(canon);
    headerRow[canon] = c;
  }

  for (const req of BULK_REQUIRED_KEYS) {
    if (headerRow[req] === undefined) {
      errors.push({
        row: 1,
        column: "headers",
        message: `Missing required column: "${req}". Download the template for the correct headers.`,
      });
    }
  }

  if (errors.some((e) => e.row === 1 && e.column === "headers")) {
    return { errors, rows: [], headerRow };
  }

  const dataRows: ParsedBulkVolunteerRow[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const excelRow = r + 1;
    const rowArr = matrix[r] ?? [];

    const get = (key: string): unknown => {
      const idx = headerRow[key];
      if (idx === undefined) return "";
      return rowArr[idx];
    };

    const volunteer_name = cellStr(get("volunteer_name"));
    const email = cellStr(get("email")).toLowerCase();
    const phone = cellStr(get("phone"));
    const adultsRaw = get("adults_count");
    const kidsRaw = headerRow.kids_count !== undefined ? get("kids_count") : "";

    const allEmpty =
      !volunteer_name &&
      !email &&
      !phone &&
      (adultsRaw === "" || adultsRaw == null) &&
      (kidsRaw === "" || kidsRaw == null) &&
      !cellStr(get("signup_status")) &&
      !cellStr(get("comment"));

    let itemAny = false;
    for (const key of Object.keys(headerRow)) {
      const id = itemIdFromHeader(key);
      if (!id) continue;
      const q = cellStr(get(key));
      if (q) itemAny = true;
    }
    if (allEmpty && !itemAny) continue;

    if (dataRows.length >= BULK_IMPORT_MAX_ROWS) {
      errors.push({
        row: excelRow,
        column: "—",
        message: `Maximum ${BULK_IMPORT_MAX_ROWS} data rows allowed.`,
      });
      break;
    }

    const rowErrors: BulkGridError[] = [];

    if (!volunteer_name) {
      rowErrors.push({ row: excelRow, column: "volunteer_name", message: "Required." });
    }
    if (!email) {
      rowErrors.push({ row: excelRow, column: "email", message: "Required." });
    } else if (!EMAIL_RE.test(email)) {
      rowErrors.push({ row: excelRow, column: "email", message: "Invalid email format." });
    }
    if (!phone) {
      rowErrors.push({ row: excelRow, column: "phone", message: "Required." });
    }

    const adultsParsed = cellInt(adultsRaw);
    if (adultsParsed === null) {
      rowErrors.push({ row: excelRow, column: "adults_count", message: "Must be a whole number (0 or greater)." });
    } else if (adultsParsed < 0) {
      rowErrors.push({ row: excelRow, column: "adults_count", message: "Must be >= 0." });
    }

    let kidsParsed = 0;
    if (headerRow.kids_count !== undefined) {
      const k = cellInt(kidsRaw);
      if (kidsRaw !== "" && kidsRaw != null && k === null) {
        rowErrors.push({ row: excelRow, column: "kids_count", message: "Must be a whole number (0 or greater)." });
      } else {
        kidsParsed = k ?? 0;
        if (kidsParsed < 0) {
          rowErrors.push({ row: excelRow, column: "kids_count", message: "Must be >= 0." });
        }
      }
    }

    const adults_count = adultsParsed ?? 0;
    if (adultsParsed !== null && kidsParsed >= 0 && adults_count + kidsParsed < 1) {
      rowErrors.push({
        row: excelRow,
        column: "adults_count",
        message: "Adults + kids must be at least 1.",
      });
    }

    let signup_status: "" | "APPROVED" | "PENDING" = "";
    const st = cellStr(get("signup_status")).toUpperCase();
    if (st) {
      if (st !== "APPROVED" && st !== "PENDING") {
        rowErrors.push({
          row: excelRow,
          column: "signup_status",
          message: 'Leave blank or use APPROVED or PENDING.',
        });
      } else {
        signup_status = st as "APPROVED" | "PENDING";
      }
    }

    const commentRaw = cellStr(get("comment"));
    const comment = commentRaw || null;

    const items: { itemId: string; quantity: number }[] = [];
    for (const key of Object.keys(headerRow)) {
      const itemId = itemIdFromHeader(key);
      if (!itemId) continue;
      const rawQ = get(key);
      const qs = cellStr(rawQ);
      if (!qs) continue;
      const q = cellInt(rawQ);
      if (q === null || q < 1) {
        rowErrors.push({
          row: excelRow,
          column: key,
          message: "Must be a positive whole number or leave empty.",
        });
        continue;
      }
      items.push({ itemId, quantity: q });
    }

    if (rowErrors.length) {
      errors.push(...rowErrors);
      continue;
    }

    if (adultsParsed === null) continue;

    dataRows.push({
      excelRow,
      volunteer_name,
      email,
      phone,
      adults_count,
      kids_count: kidsParsed,
      signup_status,
      comment,
      items,
    });
  }

  return { errors, rows: dataRows, headerRow };
}

export function simulateBulkSignupRows(
  rows: ParsedBulkVolunteerRow[],
  capacity: number | null,
  initialApprovedParticipants: number,
  itemFilled: Map<string, number>,
  itemMax: Map<string, number>
): BulkGridError[] {
  const errors: BulkGridError[] = [];
  let usedParticipants = initialApprovedParticipants;
  const simItem = new Map(itemFilled);

  for (const row of rows) {
    const parts = row.adults_count + row.kids_count;
    const rowErrs: BulkGridError[] = [];
    let status: "APPROVED" | "PENDING";

    if (row.signup_status === "APPROVED") {
      if (capacity != null && capacity > 0 && usedParticipants + parts > capacity) {
        rowErrs.push({
          row: row.excelRow,
          column: "signup_status",
          message: `APPROVED would exceed activity capacity (${capacity} participant slots after prior rows).`,
        });
      }
      status = "APPROVED";
    } else if (row.signup_status === "PENDING") {
      status = "PENDING";
    } else {
      const over = capacity != null && capacity > 0 && usedParticipants + parts > capacity;
      status = over ? "PENDING" : "APPROVED";
    }

    for (const it of row.items) {
      const filled = simItem.get(it.itemId) ?? 0;
      const max = itemMax.get(it.itemId) ?? 0;
      const rem = max - filled;
      if (it.quantity > rem) {
        rowErrs.push({
          row: row.excelRow,
          column: `item__${it.itemId}`,
          message: `Only ${rem} unit(s) still available for this item (after prior rows and existing sign-ups).`,
        });
      }
    }

    if (rowErrs.length) {
      errors.push(...rowErrs);
      continue;
    }

    if (status === "APPROVED") usedParticipants += parts;
    for (const it of row.items) {
      simItem.set(it.itemId, (simItem.get(it.itemId) ?? 0) + it.quantity);
    }
  }

  return errors;
}

const BULK_ADD_SEVA_ACTIVITY_SHEET = "Add Seva Activity";

export type SevaActivityExcelPayload = {
  sheetActivityId: string;
  title: string;
  category: string;
  description: string | null;
  capacity: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  city: string;
  locationName: string | null;
  address: string;
  coordinatorName: string;
  coordinatorEmail: string;
  coordinatorPhone: string;
  isActive: boolean;
  isFeatured: boolean;
};

type AddSevaColKey =
  | "activity_id"
  | "title"
  | "category"
  | "description"
  | "capacity"
  | "start_date"
  | "end_date"
  | "start_time"
  | "end_time"
  | "duration_hours"
  | "city"
  | "location_name"
  | "address"
  | "coordinator_name"
  | "coordinator_email"
  | "coordinator_phone"
  | "active_featured"
  | "_skip";

function normalizeAddSevaHeader(raw: string): AddSevaColKey | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return null;
  if (t.startsWith("activity id")) return "activity_id";
  if (t === "seva activity") return "title";
  if (t.includes("find service") || (t.includes("service") && t.includes("category")))
    return "category";
  if (t === "description") return "description";
  if (t === "capacity") return "capacity";
  if (t === "start date") return "start_date";
  if (t === "start time") return "start_time";
  if (t === "end date") return "end_date";
  if (t === "end time") return "end_time";
  if (t.includes("duration")) return "duration_hours";
  if (t === "city") return "city";
  if (t === "location name") return "location_name";
  if (t === "address") return "address";
  if (t.includes("coordinator") && t.includes("email")) return "coordinator_email";
  if (t.includes("coordinator") && (t.includes("phone") || t.includes("number")))
    return "coordinator_phone";
  if (t === "coordinator name" || (t.includes("coordinator") && t.includes("name")))
    return "coordinator_name";
  if (t.includes("active") && t.includes("featured")) return "active_featured";
  if (t.includes("contribution item")) return "_skip";
  return null;
}

function parseExcelDateCell(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    const utc = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(utc);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = cellStr(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function decodeActiveFeaturedFromCell(raw: string): { isActive: boolean; isFeatured: boolean } {
  const u = raw.trim();
  if (!u) return { isActive: true, isFeatured: false };
  if (/^inactive$/i.test(u)) return { isActive: false, isFeatured: false };
  if (/featured/i.test(u)) return { isActive: true, isFeatured: true };
  return { isActive: true, isFeatured: false };
}

/** Read row 2 of Add Seva Activity when the user edited core fields; otherwise null. */
export function parseAddSevaActivityWorkbook(buffer: Buffer): {
  errors: BulkGridError[];
  payload: SevaActivityExcelPayload | null;
} {
  const errors: BulkGridError[] = [];
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    errors.push({
      row: 1,
      column: "file",
      message: "Could not read file. Use a valid .xlsx or .xls workbook.",
    });
    return { errors, payload: null };
  }

  const sheetName = wb.SheetNames.find(
    (n) => n.trim().toLowerCase() === BULK_ADD_SEVA_ACTIVITY_SHEET.toLowerCase()
  );
  if (!sheetName) return { errors: [], payload: null };

  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null | undefined)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  if (matrix.length < 2) return { errors: [], payload: null };

  const headerCells = (matrix[0] ?? []).map((c) => cellStr(c));
  const colMap = {} as Partial<Record<AddSevaColKey, number>>;
  const dedup = new Set<string>();

  for (let c = 0; c < headerCells.length; c++) {
    const raw = headerCells[c];
    if (!raw) continue;
    const key = normalizeAddSevaHeader(raw);
    if (!key || key === "_skip") continue;
    if (dedup.has(key)) {
      errors.push({
        row: 1,
        column: XLSX.utils.encode_col(c),
        message: `Duplicate Add Seva Activity column: "${raw}".`,
      });
      continue;
    }
    dedup.add(key);
    colMap[key] = c;
  }

  if (errors.length) return { errors, payload: null };

  const rowArr = (matrix[1] ?? []) as unknown[];
  const get = (key: AddSevaColKey): unknown => {
    const idx = colMap[key];
    if (idx === undefined) return "";
    return rowArr[idx] ?? "";
  };

  const keysThatTrigger: AddSevaColKey[] = [
    "title",
    "category",
    "description",
    "capacity",
    "start_date",
    "end_date",
    "start_time",
    "end_time",
    "duration_hours",
    "city",
    "location_name",
    "address",
    "coordinator_name",
    "coordinator_email",
    "coordinator_phone",
    "active_featured",
  ];

  let wants = false;
  for (const k of keysThatTrigger) {
    if (colMap[k] === undefined) continue;
    if (cellStr(get(k)).trim()) {
      wants = true;
      break;
    }
  }

  if (!wants) return { errors: [], payload: null };

  const sheetActivityId = cellStr(get("activity_id")).trim();
  const title = cellStr(get("title")).trim();
  const category = cellStr(get("category")).trim();
  const descriptionRaw = cellStr(get("description")).trim();
  const startDate = parseExcelDateCell(get("start_date"));
  const endDate = parseExcelDateCell(get("end_date"));
  const startTime = cellStr(get("start_time")).trim();
  const endTime = cellStr(get("end_time")).trim();
  const durRaw = get("duration_hours");
  const city = cellStr(get("city")).trim();
  const locationNameRaw = cellStr(get("location_name")).trim();
  const address = cellStr(get("address")).trim();
  const coordinatorName = cellStr(get("coordinator_name")).trim();
  const coordinatorEmail = cellStr(get("coordinator_email")).trim().toLowerCase();
  const coordinatorPhone = cellStr(get("coordinator_phone")).trim();
  const af = decodeActiveFeaturedFromCell(cellStr(get("active_featured")));

  if (cellStr(get("start_date")) && !startDate) {
    errors.push({
      row: 2,
      column: "Start Date",
      message: "Use a valid date (YYYY-MM-DD or Excel date picker).",
    });
  }
  if (cellStr(get("end_date")) && !endDate) {
    errors.push({
      row: 2,
      column: "End Date",
      message: "Use a valid date (YYYY-MM-DD or Excel date picker).",
    });
  }

  let capacityNum = 0;
  const capRaw = get("capacity");
  if (cellStr(capRaw)) {
    const c = cellInt(capRaw);
    if (c === null || c < 1) {
      errors.push({ row: 2, column: "Capacity", message: "Whole number ≥ 1." });
    } else {
      capacityNum = c;
    }
  }

  let durationHours = 0;
  if (cellStr(durRaw)) {
    const d =
      typeof durRaw === "number" && Number.isFinite(durRaw) ? durRaw : parseFloat(cellStr(durRaw));
    if (!Number.isFinite(d) || d <= 0) {
      errors.push({ row: 2, column: "Duration (hours)", message: "Must be a number greater than 0." });
    } else {
      durationHours = d;
    }
  }

  if (errors.length) return { errors, payload: null };

  const payload: SevaActivityExcelPayload = {
    sheetActivityId,
    title,
    category,
    description: descriptionRaw || null,
    capacity: capacityNum,
    startDate: startDate ?? "",
    endDate: endDate ?? "",
    startTime,
    endTime,
    durationHours,
    city,
    locationName: locationNameRaw || null,
    address,
    coordinatorName,
    coordinatorEmail,
    coordinatorPhone,
    isActive: af.isActive,
    isFeatured: af.isFeatured,
  };

  return { errors, payload };
}
