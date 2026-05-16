/**
 * My Seva Dashboard — full section coverage.
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
    intro: introBody ? { title: introTitle || "Dashboard", body: introBody } : null,
    tests,
  };
}

function buildDashboardPageTests(prefix, opts) {
  const { roleTitle, intro, before, guestWall } = opts;

  if (guestWall) {
    return page(
      "My Seva Dashboard",
      intro,
      [
        T(
          prefix,
          1,
          "Login required",
          "1. While logged out, open **My Seva Dashboard**.",
          "Message to log in; yellow background with **Login** button.",
          before
        ),
      ],
      `${roleTitle} — Dashboard`
    );
  }

  let n = 0;
  return page(
    "My Seva Dashboard (all sections)",
    intro,
    [
      T(prefix, ++n, "Welcome banner", "1. Open dashboard.", "**WELCOME BACK!** and Love All Serve All image visible.", before),
      T(prefix, ++n, "Total Hours Served", "1. Check **Total Hours Served** card.", "Number loads (may be zero).", before),
      T(prefix, ++n, "Total Seva Activities", "1. Check **Total Seva Activities** card.", "Number loads.", before),
      T(prefix, ++n, "Upcoming sign-ups", "1. Find upcoming activities section.\n2. Click a card.", "Your joined activities listed; detail dialog opens.", "You have a sign-up or section empty"),
      T(prefix, ++n, "Withdraw", "1. In dialog, **Withdraw**.", "Sign-up removed.", "Upcoming sign-up exists"),
      T(prefix, ++n, "Log Hours history", "1. Scroll to **Your Log Hours history**.", "Table or empty message with link to Log Hours.", before),
      T(prefix, ++n, "View certificate", "1. Click **View certificate** on a logged row.", "Certificate opens.", "Logged hour exists"),
      T(prefix, ++n, "Pagination", "1. If many rows, use next/previous page.", "Different rows load.", "More than 5 log entries"),
      T(prefix, ++n, "Log Hours button", "1. Click **Log Hours** link on dashboard.", "Goes to Log Hours form.", before),
      T(prefix, ++n, "Find Seva link", "1. Use link to Find Seva if shown.", "Opens Find Seva.", "Link exists"),
    ],
    `${roleTitle} — Dashboard`
  );
}

module.exports = { buildDashboardPageTests };
