import saiCenterRows from "./data/sai-centers-city-usa-region.json";

/**
 * USA Region labels (Sri Sathya Sai USA) — City column from center directory maps here.
 * Stored data: lib/data/sai-centers-city-usa-region.json
 */
export const USA_REGION_LABELS = [
  "Reg 1 (Northeast USA)",
  "Reg 2 (Mid-Atlantic USA)",
  "Reg 3 (Southeast USA)",
  "Reg 4 (Mid Central USA)",
  "Reg 5 (North Central USA)",
  "Reg 6 (Pacific USA)",
  "Reg 7/8 (Pacific USA)",
  "Reg 9 (Southwest USA)",
  "Reg 10 (Southcentral USA)",
] as const;

export type UsaRegionLabel = (typeof USA_REGION_LABELS)[number];

export const USA_REGIONS_FOR_FILTER = ["All", ...USA_REGION_LABELS] as const;

type Row = { city: string; usaRegion: string };

const rows: Row[] = saiCenterRows as Row[];

const regionByCanonicalCity = new Map<string, UsaRegionLabel>();
const canonicalCityByLower = new Map<string, string>();

for (const { city, usaRegion } of rows) {
  if (!(USA_REGION_LABELS as readonly string[]).includes(usaRegion)) continue;
  regionByCanonicalCity.set(city, usaRegion as UsaRegionLabel);
  canonicalCityByLower.set(city.trim().toLowerCase(), city);
}

export function isValidUsaRegion(value: string): value is UsaRegionLabel {
  return (USA_REGION_LABELS as readonly string[]).includes(value);
}

/** Canonical city names in the given region (for DB `in` / OR filters). */
export function getCitiesForUsaRegion(region: UsaRegionLabel): string[] {
  return rows.filter((r) => r.usaRegion === region).map((r) => r.city);
}

/**
 * Region for a center city name, or null if not in the directory (case-insensitive).
 */
export function getUsaRegionForCity(city: string): UsaRegionLabel | null {
  const trimmed = city?.trim();
  if (!trimmed) return null;
  const canon = canonicalCityByLower.get(trimmed.toLowerCase());
  if (!canon) return null;
  return regionByCanonicalCity.get(canon) ?? null;
}

/** Prisma-compatible OR of case-insensitive city matches for a region. */
export function prismaCityInUsaRegionOr(region: UsaRegionLabel) {
  const cities = getCitiesForUsaRegion(region);
  if (cities.length === 0) return { id: { in: [] as string[] } };
  return {
    OR: cities.map((c) => ({
      city: { equals: c, mode: "insensitive" as const },
    })),
  };
}

/** Same as prismaCityInUsaRegionOr but for BlogPost.centerCity. */
export function prismaCenterCityInUsaRegionOr(region: UsaRegionLabel) {
  const cities = getCitiesForUsaRegion(region);
  if (cities.length === 0) return { id: { in: [] as string[] } };
  return {
    OR: cities.map((c) => ({
      centerCity: { equals: c, mode: "insensitive" as const },
    })),
  };
}
