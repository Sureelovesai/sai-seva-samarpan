import type { Prisma, SevaContributionItem } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export type ContributionItemWithFilled = SevaContributionItem & { filledQuantity: number };

export type ContributionItemInput = {
  id?: string;
  name: string;
  category?: string;
  neededLabel?: string;
  maxQuantity?: number;
};

/**
 * Sync contribution items for an activity. Preserves items with signups; rejects removing them
 * or lowering maxQuantity below current filled total.
 */
export async function syncSevaContributionItems(
  activityId: string,
  items: ContributionItemInput[] | undefined | null
): Promise<void> {
  if (items === undefined || items === null) return;

  const itemApi = prisma.sevaContributionItem as { findMany?: unknown } | undefined;
  if (!itemApi || typeof itemApi.findMany !== "function") {
    throw new Error(
      "Database client is missing SevaContributionItem (outdated Prisma generate or stale dev server). From apps/web run: npx prisma generate && npx prisma migrate deploy — then restart npm run dev."
    );
  }

  const normalized = items
    .map((it) => ({
      id: typeof it.id === "string" && it.id.trim() ? it.id.trim() : undefined,
      name: String(it.name ?? "").trim(),
      category: String(it.category ?? "").trim(),
      neededLabel: String(it.neededLabel ?? "").trim(),
      maxQuantity: Math.max(1, Math.floor(Number(it.maxQuantity) || 1)),
    }))
    .filter((it) => it.name.length > 0);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing: Pick<SevaContributionItem, "id" | "name">[] =
      await tx.sevaContributionItem.findMany({
        where: { activityId },
        select: { id: true, name: true },
      });
    const existingIds = new Set(existing.map((e) => e.id));

    const incomingIds = new Set(normalized.filter((n) => n.id).map((n) => n.id!));

    for (const ex of existing) {
      if (!incomingIds.has(ex.id)) {
        const filled = await tx.sevaContributionClaim.aggregate({
          where: { itemId: ex.id, status: "CONFIRMED" },
          _sum: { quantity: true },
        });
        const sum = filled._sum.quantity ?? 0;
        if (sum > 0) {
          throw new Error(
            `Cannot remove item "${ex.name}" because volunteers have already signed up (${sum} units).`
          );
        }
        await tx.sevaContributionItem.delete({ where: { id: ex.id } });
      }
    }

    for (let i = 0; i < normalized.length; i++) {
      const it = normalized[i];
      const label =
        it.neededLabel ||
        `${it.maxQuantity} ${it.maxQuantity === 1 ? "unit" : "units"}`;

      if (it.id && existingIds.has(it.id)) {
        const filled = await tx.sevaContributionClaim.aggregate({
          where: { itemId: it.id, status: "CONFIRMED" },
          _sum: { quantity: true },
        });
        const sum = filled._sum.quantity ?? 0;
        if (it.maxQuantity < sum) {
          throw new Error(
            `Item "${it.name}": needed quantity (${it.maxQuantity}) cannot be less than already signed up (${sum}).`
          );
        }
        await tx.sevaContributionItem.update({
          where: { id: it.id },
          data: {
            name: it.name,
            category: it.category,
            neededLabel: label,
            maxQuantity: it.maxQuantity,
            sortOrder: i,
          },
        });
      } else {
        await tx.sevaContributionItem.create({
          data: {
            activityId,
            name: it.name,
            category: it.category,
            neededLabel: label,
            maxQuantity: it.maxQuantity,
            sortOrder: i,
          },
        });
      }
    }
  });
}

export async function getContributionItemsWithFilled(
  activityId: string
): Promise<ContributionItemWithFilled[]> {
  const items: SevaContributionItem[] = await prisma.sevaContributionItem.findMany({
    where: { activityId },
    orderBy: { sortOrder: "asc" },
  });
  if (items.length === 0) return [];
  const sums: { itemId: string; _sum: { quantity: number | null } }[] =
    await prisma.sevaContributionClaim.groupBy({
      by: ["itemId"],
      where: {
        itemId: { in: items.map((i: SevaContributionItem) => i.id) },
        status: "CONFIRMED",
      },
      _sum: { quantity: true },
    });
  const sumMap = new Map(
    sums.map((s: { itemId: string; _sum: { quantity: number | null } }) => [
      s.itemId,
      s._sum.quantity ?? 0,
    ])
  );
  return items.map((item: SevaContributionItem) => ({
    ...item,
    filledQuantity: sumMap.get(item.id) ?? 0,
  }));
}
