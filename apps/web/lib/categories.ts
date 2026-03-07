/**
 * Service categories for Seva activities.
 * Use SEVA_CATEGORIES for dropdowns (Add Seva Activity, Manage Seva, Log Hours).
 * Use SEVA_CATEGORIES_FOR_FILTER (includes "All") for Find Seva filter.
 */

const SEVA_CATEGORIES_SORTED = [
  "Animal Care",
  "Children",
  "Cultural or Places of Worship",
  "Educare",
  "Environmental",
  "Go Green",
  "Homeless Shelters",
  "Medicare",
  "Narayana Seva/Food",
  "Other",
  "Senior Citizens",
  "Sociocare",
  "Veterans",
  "Women Seva",
] as const;

export const SEVA_CATEGORIES = SEVA_CATEGORIES_SORTED;

/** For filter dropdowns (Find Seva): "All" first, then categories in alphabetical order */
export const SEVA_CATEGORIES_FOR_FILTER = ["All", ...SEVA_CATEGORIES] as const;

export type SevaCategory = (typeof SEVA_CATEGORIES)[number];
