import type { SevaContributionItem } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  syncSevaContributionItems,
  type ContributionItemInput,
} from "@/lib/syncSevaContributionItems";
import type { BulkGridError, ParsedContributionItemRow } from "@/lib/sevaBulkImport";

/**
 * Sync from the Contribution items sheet (Excel row order = sort order on the activity).
 * - If **any** row has Item ID: the sheet is the full ordered list (same as Manage Seva): update by ID,
 *   create rows with blank ID, remove DB items missing from the sheet (per sync rules / claims).
 * - If **no** row has Item ID: only new rows are appended; existing activity items are kept.
 */
export async function syncContributionItemsFromExcel(
  activityId: string,
  parsed: ParsedContributionItemRow[]
): Promise<{ ok: false; errors: BulkGridError[] } | { ok: true }> {
  if (parsed.length === 0) return { ok: true };

  const dbItems = await prisma.sevaContributionItem.findMany({
    where: { activityId },
    orderBy: { sortOrder: "asc" },
  });
  const dbById: Map<string, SevaContributionItem> = new Map(
    dbItems.map((i: SevaContributionItem): [string, SevaContributionItem] => [i.id, i]),
  );

  const errors: BulkGridError[] = [];
  const seenIds = new Set<string>();

  for (const row of parsed) {
    if (row.itemId) {
      if (seenIds.has(row.itemId)) {
        errors.push({
          row: row.excelRow,
          column: "Item ID",
          message: "Duplicate Item ID in Contribution items sheet.",
        });
      }
      seenIds.add(row.itemId);
      if (!dbById.has(row.itemId)) {
        errors.push({
          row: row.excelRow,
          column: "Item ID",
          message: `Unknown Item ID for this activity: ${row.itemId}`,
        });
      }
    }
  }
  if (errors.length) return { ok: false, errors };

  const hasAnyId = parsed.some((r) => r.itemId);

  let inputs: ContributionItemInput[];

  if (!hasAnyId) {
    /** Only new rows (no Item ID): append — do not delete existing activity items. */
    const preserved: ContributionItemInput[] = dbItems.map((db: SevaContributionItem) => ({
      id: db.id,
      name: db.name,
      category: db.category ?? "",
      neededLabel: db.neededLabel ?? "",
      maxQuantity: db.maxQuantity,
    }));
    const appended: ContributionItemInput[] = parsed.map((row) => ({
      name: row.name.trim(),
      category: "",
      maxQuantity: row.maxQuantity,
    }));
    inputs = [...preserved, ...appended];
  } else {
    inputs = parsed.map((row) => {
      if (row.itemId) {
        const db = dbById.get(row.itemId)!;
        return {
          id: row.itemId,
          name: row.name.trim() ? row.name.trim() : db.name,
          category: db.category ?? "",
          neededLabel: db.neededLabel ?? "",
          maxQuantity: row.maxQuantity,
        };
      }
      return {
        name: row.name.trim(),
        category: "",
        maxQuantity: row.maxQuantity,
      };
    });
  }

  try {
    await syncSevaContributionItems(activityId, inputs);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      errors: [{ row: 1, column: "Contribution items", message: msg }],
    };
  }
  return { ok: true };
}

/** @deprecated Use syncContributionItemsFromExcel */
export const applyContributionCapsFromExcel = syncContributionItemsFromExcel;
