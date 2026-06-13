/** Category tint colors — mirrors web home featured cards (`page.tsx` CATEGORY_COLORS). */
export type CategoryStyle = { bg: string; border: string; text: string };

export const CATEGORY_COLORS: Record<string, CategoryStyle> = {
  "Animal Care": { bg: "#fef3c7", border: "#fcd34d", text: "#78350f" },
  Children: { bg: "#fce7f3", border: "#f9a8d4", text: "#831843" },
  "Cultural or Places of Worship": { bg: "#ede9fe", border: "#c4b5fd", text: "#4c1d95" },
  Educare: { bg: "#d1fae5", border: "#6ee7b7", text: "#064e3b" },
  Environmental: { bg: "#ccfbf1", border: "#5eead4", text: "#134e4a" },
  "Go Green": { bg: "#dcfce7", border: "#86efac", text: "#14532d" },
  "Homeless Shelters": { bg: "#f1f5f9", border: "#cbd5e1", text: "#0f172a" },
  Medicare: { bg: "#e0f2fe", border: "#7dd3fc", text: "#0c4a6e" },
  "Narayana Seva/Food": { bg: "#ffedd5", border: "#fdba74", text: "#7c2d12" },
  Online: { bg: "#cffafe", border: "#67e8f9", text: "#164e63" },
  Other: { bg: "#f4f4f5", border: "#d4d4d8", text: "#18181b" },
  "Senior Citizens": { bg: "#ffe4e6", border: "#fda4af", text: "#881337" },
  Sociocare: { bg: "#ffedd5", border: "#fdba74", text: "#7c2d12" },
  Veterans: { bg: "#e0e7ff", border: "#a5b4fc", text: "#312e81" },
  "Women Seva": { bg: "#fae8ff", border: "#e879f9", text: "#701a75" },
};

export function categoryStyle(category: string): CategoryStyle {
  return CATEGORY_COLORS[category] ?? { bg: "#e0e7ff", border: "#a5b4fc", text: "#312e81" };
}
