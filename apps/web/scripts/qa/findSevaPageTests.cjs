/**
 * Find Seva — full section coverage.
 */

function T(prefix, n, check, steps, expected, before, device) {
  return {
    id: `${prefix}-${String(n).padStart(2, "0")}`,
    check,
    before: before || "—",
    steps,
    expected,
    device: device || "Both",
  };
}

function page(sheetName, introBody, tests, introTitle) {
  return {
    sheetName,
    intro: introBody ? { title: introTitle || "Find Seva", body: introBody } : null,
    tests,
  };
}

function buildFindSevaPageTests(prefix, opts) {
  const { roleTitle, intro, joinExpected, before } = opts;
  let n = 0;
  return page(
    "Find Seva (all sections)",
    intro,
    [
      T(prefix, ++n, "Page loads", "1. Open **Find Seva** from menu or home button.", "Page title and activity area visible.", before),
      T(prefix, ++n, "Level tabs", "1. Tap **Center level**, **Regional level**, **National level**.", "List and filters change per tab.", before),
      T(prefix, ++n, "Center filter", "1. On Center level, pick a **Sri Sathya Sai Center/Group**.", "List shows that center's activities.", before),
      T(prefix, ++n, "USA Region filter", "1. Pick **USA Region** when shown.", "List narrows to region.", before),
      T(prefix, ++n, "Category filter", "1. Pick a **service category**.", "Matching activities only.", before),
      T(prefix, ++n, "Date range", "1. Set **From** and **To** dates (or leave blank for upcoming).", "Activities in range appear.", before),
      T(prefix, ++n, "Apply / refresh list", "1. Change a filter and refresh or apply.", "List updates without page break.", before),
      T(prefix, ++n, "Search box", "1. Type in search if available.", "List filters by your text.", "Search field exists"),
      T(prefix, ++n, "Activity row", "1. Read one row: title, center, date, category.", "Information clear.", before),
      T(prefix, ++n, "Spots remaining", "1. Check capacity / spots left if shown.", "Makes sense for volunteers.", "Activity has capacity"),
      T(prefix, ++n, "View details", "1. Click **View details**.", "Seva Details page opens.", before),
      T(prefix, ++n, "Join from details", "1. On details, **Join Seva**.", joinExpected, before),
      T(prefix, ++n, "Program groups", "1. If activities are grouped under a program, expand the group.", "Grouped activities listed correctly.", "Program exists"),
    ],
    `${roleTitle} — Find Seva`
  );
}

module.exports = { buildFindSevaPageTests };
