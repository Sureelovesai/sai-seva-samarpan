/**
 * Expanded section-level tests for remaining pages (all roles).
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
    intro: introBody ? { title: introTitle || sheetName, body: introBody } : null,
    tests,
  };
}

function buildSevaDetailsPageTests(prefix, opts) {
  const { roleTitle, guest, before } = opts;
  let n = 0;
  return page(
    "Seva Details (all sections)",
    "Open from Find Seva → View details.",
    [
      T(prefix, ++n, "Activity header", "1. Read title, center, dates, and location.", "Information is complete and readable.", before),
      T(prefix, ++n, "Description", "1. Scroll through description and coordinator contact if shown.", "Details make sense for volunteers.", before),
      T(prefix, ++n, "Join Seva button", "1. Tap **Join Seva**.\n2. Complete form if logged in.", guest ? "Login or sign-up required." : "Confirmation; signup succeeds or waitlist message.", before),
      T(prefix, ++n, "Register — items to bring", "1. Find **Register** or items section.\n2. Sign up for an item if listed.", guest ? "Login required." : "Item registration confirmation (separate from on-site join).", before),
      T(prefix, ++n, "Contribution items list", "1. Review listed items and quantities needed.", "Items show clearly if coordinator added them.", "Activity has item list"),
      T(prefix, ++n, "Map or address", "1. Check location / address / map link if present.", "Volunteers can find the venue.", "Activity has location"),
    ],
    `${roleTitle} — Seva Details`
  );
}

function buildLogHoursPageTests(prefix, opts) {
  const { roleTitle, before } = opts;
  let n = 0;
  return page(
    "Log Hours (all sections)",
    null,
    [
      T(prefix, ++n, "Page opens", "1. Open **Log Hours** (menu or dashboard link).", "Form loads while logged in.", before),
      T(prefix, ++n, "Activity and category", "1. Select or enter seva activity and category.", "Fields accept your input.", before),
      T(prefix, ++n, "Date and hours", "1. Enter date and hours served.", "Values save correctly.", before),
      T(prefix, ++n, "Location and comments", "1. Fill location and optional comments.", "Form complete.", before),
      T(prefix, ++n, "Submit", "1. Submit the form.", "Success message; hours recorded.", before),
      T(prefix, ++n, "View certificate", "1. Click **View Certificate** after submit.", "Certificate page opens.", before),
    ],
    `${roleTitle} — Log Hours`
  );
}

function buildCertificatePageTests(prefix, opts) {
  const { roleTitle, before } = opts;
  return page(
    "Certificate",
    null,
    [
      T(prefix, 1, "Certificate content", "1. Open certificate from Log Hours or Dashboard.\n2. Check name, hours, activity, date.", "Information matches what you submitted.", before),
      T(prefix, 2, "Print or save", "1. Use Print or Save as PDF on your device.", "Certificate fits on page; readable.", before),
      T(prefix, 3, "Portrait and landscape", "1. Try print preview in both orientations if available.", "Layout acceptable in at least one orientation.", "Optional"),
    ],
    `${roleTitle} — Certificate`
  );
}

function buildSevaAdminDashboardTests(prefix, opts) {
  const {
    roleTitle,
    hasRolesTile,
    hasBlogPending,
    hasOutreachPending,
    hasAnalytics,
    canDeleteBlog,
    before,
  } = opts;
  let n = 0;
  const tests = [
    T(
      prefix,
      ++n,
      "Open page from menu",
      "1. Log in with your test account.\n2. Open **Seva Admin Dashboard** from the menu (second row).",
      "Page loads with banner and title **Seva Admin Dashboard**.",
      before
    ),
    T(
      prefix,
      ++n,
      "Tile — Add Seva",
      "1. On the dashboard, click the **Add Seva** tile.",
      "Add Seva Activity page opens.",
      before
    ),
    T(
      prefix,
      ++n,
      "Tile — Manage Seva",
      "1. Return to dashboard.\n2. Click **Manage Seva** tile.",
      "Manage Seva list opens.",
      before
    ),
    T(
      prefix,
      ++n,
      "Tile — View Sign Ups",
      "1. Return to dashboard.\n2. Click **View Sign Ups** tile.",
      "Sign-ups page opens.",
      before
    ),
  ];
  if (hasRolesTile) {
    tests.push(
      T(
        prefix,
        ++n,
        "Tile — Roles",
        "1. On dashboard, click **Roles** tile.",
        "Roles management page opens.",
        before
      )
    );
  } else {
    tests.push(
      T(
        prefix,
        ++n,
        "No Roles tile",
        "1. Check the tile row on the dashboard.",
        "**Roles** tile is **not** shown (Admin only).",
        before
      )
    );
  }
  if (hasBlogPending) {
    tests.push(
      T(
        prefix,
        ++n,
        "Blog analytics reports link",
        "1. Under the tiles, click **Blog analytics reports**.",
        "Blog reports page opens (summaries by date, center, or region).",
        before
      ),
      T(
        prefix,
        ++n,
        "Pending Blog Posts — section",
        "1. Scroll to **Pending Blog Posts**.",
        "Section title and short explanation about approve / reject / delete.",
        before
      ),
      T(
        prefix,
        ++n,
        "Pending blog — View",
        "1. If a post is waiting, click **View** on one row.",
        "Full post opens in a popup with image and text.",
        "At least one pending blog post"
      ),
      T(
        prefix,
        ++n,
        "Pending blog — Approve",
        "1. From the list or popup, click **Approve** on a test post.",
        "Post leaves the queue and can appear on Seva Blog.",
        "Test pending post you may approve"
      ),
      T(
        prefix,
        ++n,
        "Pending blog — Reject",
        "1. Click **Reject** on a test post.\n2. Add a note if asked.",
        "Post removed from queue; submitter can be notified.",
        "Test pending post you may reject"
      )
    );
    if (canDeleteBlog) {
      tests.push(
        T(
          prefix,
          ++n,
          "Pending blog — Delete",
          "1. Click **Delete** on a test pending post.",
          "Entry removed from queue (Admin only).",
          "Test pending post you may delete"
        )
      );
    }
  }
  if (hasOutreachPending) {
    tests.push(
      T(
        prefix,
        ++n,
        "Community outreach — quick links",
        "1. Under the tiles, find **Community outreach — pending profiles** and **Full-page list** links.",
        "Both links work; one scrolls on this page, one opens the full review list.",
        before
      ),
      T(
        prefix,
        ++n,
        "Pending organization profiles — section",
        "1. Scroll to **Pending organization profiles**.",
        "Section explains coordinator vs admin visibility.",
        before
      ),
      T(
        prefix,
        ++n,
        "Pending outreach — View",
        "1. If a profile is waiting, click **View**.",
        "Organization details open in a popup.",
        "At least one pending outreach profile"
      ),
      T(
        prefix,
        ++n,
        "Pending outreach — Approve or Reject",
        "1. Use **Approve** or **Reject** on a test profile.",
        "Queue updates; submitter can be emailed.",
        "Test pending profile you may change"
      )
    );
  }
  tests.push(
    T(
      prefix,
      ++n,
      "Our Impact — section",
      "1. Scroll to **Our Impact**.",
      "Four numbers shown: Total Activities, Active Activities, Total Volunteers, Total Hours.",
      before
    ),
    T(
      prefix,
      ++n,
      "Our Impact — numbers load",
      "1. Wait a few seconds on **Our Impact**.",
      "Numbers show real counts or **—** if data cannot load (not a blank broken box).",
      before
    )
  );
  if (hasAnalytics) {
    tests.push(
      T(
        prefix,
        ++n,
        "Analytics — section title",
        "1. Scroll to dark **Analytics** block.",
        "Title **Analytics** and filter row visible.",
        before
      ),
      T(
        prefix,
        ++n,
        "Analytics — filters",
        "1. Change **Center**, **Category**, **From**, **To**, or search text.\n2. Click **Apply**.\n2. Click **Reset**.",
        "Charts and table refresh after Apply; Reset clears filters.",
        before
      ),
      T(
        prefix,
        ++n,
        "Analytics — summary cards",
        "1. Review the five cards at top of Analytics.",
        "Active Projects, Volunteers, Seva Hours, This Month, Top Category show numbers or zero.",
        before
      ),
      T(
        prefix,
        ++n,
        "Analytics — charts",
        "1. Review **Category Distribution** and center charts.",
        "Charts render with bars or an empty state (no broken layout).",
        before
      ),
      T(
        prefix,
        ++n,
        "Analytics — recent activities table",
        "1. Scroll to recent activities table inside Analytics.",
        "Rows list activities; links open details if present.",
        before
      ),
      T(
        prefix,
        ++n,
        "Analytics — Export CSV",
        "1. In Analytics filters row, click **Export CSV**.",
        "File downloads or a clear message if nothing to export.",
        before
      )
    );
  }
  tests.push(
    T(
      prefix,
      ++n,
      "Activities by Category",
      "1. Scroll to **Activities by Category** (purple section).",
      "Each seva category shows a count card.",
      before
    ),
    T(
      prefix,
      ++n,
      "Recent Signups",
      "1. In the same purple section, find **Recent Signups**.",
      "Up to three signup cards with volunteer name and activity (or empty placeholders).",
      before
    ),
    T(
      prefix,
      ++n,
      "Export CSV — bottom section",
      "1. Scroll to yellow **Export CSV** at bottom.\n2. Pick dates and status.\n3. Click **Export**.",
      "CSV downloads or a clear message; form fields work.",
      before
    )
  );
  return page(
    "Seva Admin Dashboard",
    "Main admin hub at /admin/seva-dashboard — test every tile and section on this page only.",
    tests,
    `${roleTitle} — Seva Admin Dashboard`
  );
}

function buildAddSevaActivityTests(prefix, opts) {
  const { roleTitle, before } = opts;
  let n = 0;
  return page(
    "Add Seva Activity",
    null,
    [
      T(prefix, ++n, "Basic details", "1. Fill title, center, category, description.", "Fields work.", before),
      T(prefix, ++n, "Dates and times", "1. Set start/end date and time.", "Saves correctly.", before),
      T(prefix, ++n, "Scope level", "1. Choose Center / Regional / National scope if shown.", "Matches your role permissions.", before),
      T(prefix, ++n, "Coordinator contact", "1. Fill coordinator name, email, phone.", "Saved on activity.", before),
      T(prefix, ++n, "Contribution items", "1. Add items to bring if needed.", "Items appear on activity details.", before),
      T(prefix, ++n, "Save draft", "1. **Save & Draft**.", "Saved without publishing.", before),
      T(prefix, ++n, "Publish", "1. **Save & Publish**.", "Activity on Find Seva.", before),
      T(prefix, ++n, "Featured checkbox", "1. Mark **Featured**.", "Shows on home Featured section.", before),
      T(prefix, ++n, "Bulk Excel section", "1. After save, **Download Excel template**.", "Template downloads; upload area explained.", "Activity saved"),
    ],
    `${roleTitle} — Add Seva`
  );
}

function buildManageSevaTests(prefix, opts) {
  const { roleTitle, before } = opts;
  let n = 0;
  return page(
    "Manage Seva",
    null,
    [
      T(prefix, ++n, "Activity list", "1. Open Manage Seva.", "Activities listed with filters if any.", before),
      T(prefix, ++n, "Search or filter", "1. Use search/filter.", "List narrows correctly.", before),
      T(prefix, ++n, "Edit activity", "1. Open **Edit** on one activity.", "Edit form loads with existing data.", before),
      T(prefix, ++n, "Save edits", "1. Change a field and save.", "Updates on Find Seva.", before),
      T(prefix, ++n, "Featured flag", "1. Toggle Featured on edit.", "Home Featured section updates.", before),
    ],
    `${roleTitle} — Manage Seva`
  );
}

function buildSevaSignUpsTests(prefix, opts) {
  const { roleTitle, before } = opts;
  let n = 0;
  return page(
    "Seva Sign Ups",
    null,
    [
      T(prefix, ++n, "Select activity", "1. Open View Sign Ups.\n2. Pick an activity.", "Volunteer list loads.", before),
      T(prefix, ++n, "Volunteer roster", "1. Review on-site sign-ups.", "Names, adults/kids counts shown.", before),
      T(prefix, ++n, "Item sign-ups", "1. Switch to item/contributions tab if present.", "Item donors listed.", "Activity has items"),
      T(prefix, ++n, "Approve waitlist", "1. Approve a pending volunteer.", "Status becomes approved.", "Waitlist exists"),
      T(prefix, ++n, "Export", "1. Export sign-ups if button exists.", "File downloads.", before),
    ],
    `${roleTitle} — Sign Ups`
  );
}

function buildRolesPageTests(prefix, opts) {
  const { before } = opts;
  return page(
    "Roles",
    "Admin only.",
    [
      T(prefix, 1, "Role list", "1. Open **Roles**.", "Email and role assignments listed.", before),
      T(prefix, 2, "Add assignment", "1. Add role for test email (staging).", "Saves successfully.", before),
      T(prefix, 3, "Cities or regions", "1. For coordinator roles, set cities/regions.", "Scope saved.", before),
    ],
    "Admin — Roles"
  );
}

function buildCommunityOutreachTests(prefix, opts) {
  const { roleTitle, before } = opts;
  let n = 0;
  return page(
    "Community Outreach",
    null,
    [
      T(prefix, ++n, "Wizard steps", "1. Open Community Outreach.", "Step-by-step flow explained.", before),
      T(prefix, ++n, "Organization profile", "1. Fill organization details.", "Fields accept input.", before),
      T(prefix, ++n, "Submit for review", "1. Submit profile.", "Pending review message.", before),
      T(prefix, ++n, "Post activity", "1. After approval, post an activity.", "Activity can go to Find Seva / community listings.", "Profile approved"),
    ],
    `${roleTitle} — Outreach`
  );
}

function buildFindCommunityTests(prefix, opts) {
  const { roleTitle, before } = opts;
  let n = 0;
  return page(
    "Find Community Activity",
    null,
    [
      T(prefix, ++n, "List loads", "1. Menu → Find Community Activity.", "Activities listed.", before),
      T(prefix, ++n, "Filters", "1. Use filters.", "List updates.", before),
      T(prefix, ++n, "View details", "1. Open one activity.", "Community details page opens.", before),
    ],
    `${roleTitle} — Find Community`
  );
}

function buildCommunityDetailsTests(prefix, opts) {
  const { roleTitle, guest, before } = opts;
  return page(
    "Community Details",
    null,
    [
      T(prefix, 1, "Activity info", "1. Read title, org, dates, description.", "Complete and readable.", before),
      T(prefix, 2, "Join Seva", "1. **Join Seva**.", guest ? "Login required." : "Sign-up works.", before),
      T(prefix, 3, "Register items", "1. **Register** for items if listed.", guest ? "Login required." : "Item sign-up works.", before),
    ],
    `${roleTitle} — Community Details`
  );
}

function buildPartnerOrgsTests(prefix, opts) {
  const { roleTitle, before } = opts;
  return page(
    "Partner Organizations",
    null,
    [
      T(prefix, 1, "Directory", "1. Open Partner Organizations.", "Organizations listed with names.", before),
      T(prefix, 2, "Organization detail", "1. Open one entry if clickable.", "Details or contact info shown.", "Entries exist"),
    ],
    `${roleTitle} — Partners`
  );
}

function buildLoginPageTests(prefix, opts) {
  const { before } = opts;
  return page(
    "Login and Sign up",
    null,
    [
      T(prefix, 1, "Login", "1. Enter email and password → Login.", "Signed in; menu shows Logout.", before),
      T(prefix, 2, "Forgot password", "1. Forgot password flow.", "Reset email instructions.", before),
      T(prefix, 3, "Sign up", "1. Create new account.", "Account created or clear error.", before),
      T(prefix, 4, "Logout", "1. Log out from menu.", "Returned to guest state.", "Logged in first"),
    ],
    "Login"
  );
}

function buildEventsPublicTests(prefix, opts) {
  const { roleTitle, before } = opts;
  let n = 0;
  return page(
    "Events (public)",
    null,
    [
      T(prefix, ++n, "Events list", "1. Open **Events**.", "Published events shown.", before),
      T(prefix, ++n, "Event detail", "1. Open one event.", "Description, date, venue, flyer if any.", before),
      T(prefix, ++n, "RSVP form", "1. Submit RSVP Yes / No / Maybe with name and email.", "Confirmation message.", before),
      T(prefix, ++n, "Attendance summary", "1. Check public attendance table if shown.", "Counts visible.", "Event allows public summary"),
    ],
    `${roleTitle} — Events`
  );
}

function buildEventAdminTests(prefix, opts) {
  const { sheetName, roleTitle, before } = opts;
  let n = 0;
  return page(
    sheetName,
    null,
    [
      T(prefix, ++n, "Page opens", `1. Open **${sheetName}**.`, "Page loads without errors.", before),
      T(prefix, ++n, "Create or list", "1. Complete main action on this page (add, edit, or view list).", "Works as expected for Event Admin.", before),
    ],
    `${roleTitle} — ${sheetName}`
  );
}

module.exports = {
  buildSevaDetailsPageTests,
  buildLogHoursPageTests,
  buildCertificatePageTests,
  buildSevaAdminDashboardTests,
  buildAddSevaActivityTests,
  buildManageSevaTests,
  buildSevaSignUpsTests,
  buildRolesPageTests,
  buildCommunityOutreachTests,
  buildFindCommunityTests,
  buildCommunityDetailsTests,
  buildPartnerOrgsTests,
  buildLoginPageTests,
  buildEventsPublicTests,
  buildEventAdminTests,
};
