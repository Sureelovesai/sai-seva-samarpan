/**
 * Full Home page element coverage — shared across all roles.
 * Role-specific expectations only for menu and dashboard button.
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
    intro: introBody
      ? { title: introTitle || "Home page", body: introBody }
      : null,
    tests,
  };
}

/** @param {string} prefix GST | VOL | CRD | BLG | ADM | EVT */
function buildHomePageTests(prefix, opts) {
  const {
    roleTitle,
    intro,
    menuSteps,
    menuExpected,
    menuBefore,
    secondRowCheck,
    secondRowExpected,
    dashboardExpected,
    featuredExtra,
  } = opts;

  let n = 0;
  const tests = [];

  tests.push(
    T(
      prefix,
      ++n,
      "Hero banner (top image)",
      "1. Open Home.\n2. Look at the large image at the very top.",
      "Welcome banner image loads (wide on computer; tall image on phone held upright). No large empty white gap under the image.",
      menuBefore
    )
  );

  tests.push(
    T(
      prefix,
      ++n,
      "Top menu (main row)",
      menuSteps ||
        "1. Look at the top menu below the logo.",
      menuExpected,
      menuBefore
    )
  );

  if (secondRowCheck) {
    tests.push(
      T(
        prefix,
        ++n,
        "Second menu row (admin links)",
        "1. Look directly under the main menu for a second row of links.",
        secondRowExpected,
        menuBefore
      )
    );
  }

  tests.push(
    T(
      prefix,
      ++n,
      "Find Seva button",
      "1. Scroll to the two large round buttons below the banner.\n2. Click **Find Seva**.",
      "You go to the Find Seva page to browse activities.",
      "—"
    )
  );

  tests.push(
    T(
      prefix,
      ++n,
      "My Seva Dashboard button",
      "1. Return to Home.\n2. Click **My Seva Dashboard**.",
      dashboardExpected,
      menuBefore
    )
  );

  tests.push(
    T(
      prefix,
      ++n,
      "Seva Activity Calendar — section",
      "1. Scroll to **Seva Activity Calendar**.\n2. Confirm the section title is visible.",
      "Blue calendar panel with title **Seva Activity Calendar** is shown. No login required.",
      "—"
    )
  );

  tests.push(
    T(
      prefix,
      ++n,
      "Seva Activity Calendar — level tabs",
      "1. In the calendar, tap **Center level**, **Regional level**, and **National level** tabs.",
      "Each tab selects; calendar refreshes. Short help text may appear for Regional or National.",
      "—"
    )
  );

  tests.push(
    T(
      prefix,
      ++n,
      "Seva Activity Calendar — filters",
      "1. On **Center level**, change **Center** and **USA Region** if shown.\n2. Change **Month** and **Year**.\n3. Wait for the calendar to update.",
      "Calendar grid updates. Days with activities may show a count or highlight.",
      "—"
    )
  );

  tests.push(
    T(
      prefix,
      ++n,
      "Seva Activity Calendar — open a day",
      "1. Find a day that shows activity (not zero).\n2. Click that day.",
      "Find Seva opens with that date (and filters you chose) already applied.",
      "—"
    )
  );

  tests.push(
    T(
      prefix,
      ++n,
      "Our Impact — section and quote",
      "1. Scroll to **Our Impact**.\n2. Read the quote at the top of the section.",
      "Section title **Our Impact** and Sri Sathya Sai Baba quote are visible.",
      "—"
    )
  );

  tests.push(
    T(
      prefix,
      ++n,
      "Our Impact — three numbers",
      "1. Look at the three boxes: Activities, Volunteers, Hours.\n2. Wait a few seconds.",
      "Each box shows a number (not stuck on dots forever). Labels read Activities, Volunteers, and Hours.",
      "—"
    )
  );

  tests.push(
    T(
      prefix,
      ++n,
      "Featured Seva Activities — section",
      "1. Scroll to **Featured Seva Activities**.",
      "Section title is visible. Either activity cards appear OR a clear message that no featured activities are set yet.",
      "—"
    )
  );

  tests.push(
    T(
      prefix,
      ++n,
      "Featured Seva — cards and View More",
      "1. If cards are shown, read title, center, and short description.\n2. Click **View More** on one card.",
      "Card looks complete. **View More** opens the seva activity details page for that activity.",
      "At least one featured activity exists (ask coordinator if empty)"
    )
  );

  tests.push(
    T(
      prefix,
      ++n,
      "Featured Seva — slider controls",
      "1. If more than one featured activity, use **‹** and **›** arrows or dots below the slider.",
      "Different cards slide into view; layout does not break on phone or computer.",
      "Two or more featured activities in the system"
    )
  );

  if (featuredExtra) {
    tests.push(
      T(
        prefix,
        ++n,
        "Featured Seva — coordinator or admin check",
        featuredExtra.steps,
        featuredExtra.expected,
        featuredExtra.before || "You published and marked an activity as Featured"
      )
    );
  }

  tests.push(
    T(
      prefix,
      ++n,
      "Footer",
      "1. Scroll to the very bottom of the page.",
      "Footer shows foundation logo, organization text, and contact email **LoveSaiServeSai@gmail.com**.",
      "—"
    )
  );

  tests.push(
    T(
      prefix,
      ++n,
      "Full page scroll (order of sections)",
      "1. From top to bottom, confirm order: Banner → Find Seva / Dashboard buttons → Calendar → Our Impact → Featured Seva → Footer.",
      "All sections appear in this order with nothing missing or overlapping badly.",
      "—"
    )
  );

  return page(
    "Home (all sections)",
    intro +
      "\n\nTest every section on this sheet: hero, buttons, calendar, Our Impact, Featured Seva, and footer. Menu rules are specific to your role.",
    tests,
    `${roleTitle} — Home`
  );
}

const GUEST_HOME = buildHomePageTests("GST", {
  roleTitle: "Guest",
  intro:
    "You are **not logged in**. The home page is public. You should see **Login** and no admin links.",
  menuBefore: "Logged out (use private/incognito window if needed)",
  menuSteps:
    "1. Confirm you are logged out.\n2. Check the top menu.",
  menuExpected:
    "Home, Find Seva, My Seva Dashboard, Seva Blog, Community Network, About Us, Resources, and **Login**. No second row with Seva Admin Dashboard or Roles.",
  dashboardExpected:
    "Dashboard page opens and asks you to **log in** or sign up (expected for guest).",
});

const VOLUNTEER_HOME = buildHomePageTests("VOL", {
  roleTitle: "Volunteer",
  intro:
    "You are logged in as a **volunteer only** (no coordinator or admin role). Same home sections as guest; menu shows **Logout** and no admin row.",
  menuBefore: "Logged in as volunteer-only account",
  menuSteps: "1. Log in.\n2. Open Home and check the menu.",
  menuExpected:
    "**Logout** in the menu. **No** second row with Seva Admin Dashboard or Roles.",
  dashboardExpected:
    "Your **My Seva Dashboard** opens with your sign-ups and logged hours (not a login wall).",
});

const COORDINATOR_HOME = buildHomePageTests("CRD", {
  roleTitle: "Seva Coordinator",
  intro:
    "You are a **Seva Coordinator** (or Regional/National coordinator). Home content is the same for everyone; your menu adds **Seva Admin Dashboard** without **Roles**.",
  menuBefore: "Logged in as coordinator",
  menuSteps: "1. Log in.\n2. Open Home.",
  menuExpected: "Main menu plus **Logout**. Second row includes **Seva Admin Dashboard** only (not Roles unless you are also Admin).",
  secondRowCheck: true,
  secondRowExpected:
    "**Seva Admin Dashboard** link is visible. **Roles** is hidden unless you are also Admin.",
  dashboardExpected: "Dashboard opens with your personal seva sign-ups and hours.",
  featuredExtra: {
    steps:
      "1. In admin, mark a test activity as **Featured**.\n2. Return to Home and check Featured Seva Activities.",
    expected:
      "Your featured activity card appears (title and center match what you published).",
  },
});

const BLOG_ADMIN_HOME = buildHomePageTests("BLG", {
  roleTitle: "Blog Admin",
  intro:
    "You are **Blog Admin**. Home sections match other roles; menu includes **Seva Admin Dashboard** for blog and seva tools.",
  menuBefore: "Logged in as Blog Admin",
  menuSteps: "1. Log in.\n2. Open Home.",
  menuExpected:
    "**Logout** and second row with **Seva Admin Dashboard**. **Roles** only if you are also Admin.",
  secondRowCheck: true,
  secondRowExpected: "**Seva Admin Dashboard** visible. **Roles** only for Admin.",
  dashboardExpected: "Dashboard opens normally while logged in.",
});

const ADMIN_HOME = buildHomePageTests("ADM", {
  roleTitle: "Admin",
  intro:
    "You are **Admin** with full access. All home sections are public; your menu includes **Seva Admin Dashboard** and **Roles**.",
  menuBefore: "Logged in as Admin",
  menuSteps: "1. Log in.\n2. Open Home.",
  menuExpected:
    "Second row shows **Seva Admin Dashboard** and **Roles**.",
  secondRowCheck: true,
  secondRowExpected: "Both **Seva Admin Dashboard** and **Roles** links are visible.",
  dashboardExpected: "Dashboard opens with your volunteer data.",
  featuredExtra: {
    steps:
      "1. Ensure at least one activity is marked Featured in Manage Seva.\n2. Check Featured Seva on Home.",
    expected: "Featured cards display; **View More** works.",
  },
});

const EVENT_ADMIN_HOME = buildHomePageTests("EVT", {
  roleTitle: "Event Admin",
  intro:
    "You are **Event Admin only**. Home page sections (calendar, impact, featured) are the same; your extra menu link is **Event Admin Dashboard**, not Seva admin.",
  menuBefore: "Logged in as Event Admin only",
  menuSteps: "1. Log in.\n2. Open Home.",
  menuExpected:
    "Second row shows **Event Admin Dashboard** only — **not** Seva Admin Dashboard or Roles.",
  secondRowCheck: true,
  secondRowExpected:
    "**Event Admin Dashboard** only. No **Seva Admin Dashboard** or **Roles**.",
  dashboardExpected:
    "My Seva Dashboard still opens (personal volunteer view if you use it).",
});

module.exports = {
  buildHomePageTests,
  GUEST_HOME,
  VOLUNTEER_HOME,
  COORDINATOR_HOME,
  BLOG_ADMIN_HOME,
  ADMIN_HOME,
  EVENT_ADMIN_HOME,
};
