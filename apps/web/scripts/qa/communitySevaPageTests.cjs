/**
 * Community Network / Community Seva — full section coverage for all roles.
 * (Find Community Activity, Community Details, Outreach program, Partner Orgs, admin review)
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

/** Menu: Community Network → Find Community Activity */
function buildFindCommunityActivityTests(prefix, opts) {
  const { roleTitle, intro, joinExpected, before } = opts;
  let n = 0;
  return page(
    "Find Community Activity",
    intro +
      "\n\nOpen via menu: **Community Network** → **Find Community Activity**. Not the same as **Find Seva**.",
    [
      T(prefix, ++n, "Page title and intro", "1. Open **Find Community Activity**.", "Title and note that listings are from Community Outreach organizations.", before),
      T(prefix, ++n, "Link to Find Seva", "1. Read intro text with **Find Seva** link.\n2. Click **Find Seva**.", "Goes to Find Seva (center seva listings).", before),
      T(prefix, ++n, "Service category filter", "1. Pick a **Service category**.\n2. Click **Apply**.", "List updates.", before),
      T(prefix, ++n, "Center or Group filter", "1. Pick **Center / Group**.\n2. Apply.", "List narrows to that center.", before),
      T(prefix, ++n, "USA Region filter", "1. Pick **USA Region**.\n2. Apply.", "List updates.", before),
      T(prefix, ++n, "Event date filter", "1. Pick an **Event date**.\n2. Apply.", "Activities on that date shown.", before),
      T(prefix, ++n, "Search box", "1. Type organization or title in **Search**.\n2. Apply.", "Matching activities only.", before),
      T(prefix, ++n, "Activity cards", "1. Read one card: title, organization name, category, when/where.", "Organization name visible on each listing.", before),
      T(prefix, ++n, "View details", "1. Click **View details** on a card.", "Community Activity Details page opens.", before),
      T(prefix, ++n, "Join from details", "1. On details page, **Join Seva**.", joinExpected, before),
      T(prefix, ++n, "Empty state", "1. Use filters that match nothing.", "Clear message — page not broken.", "Optional test"),
    ],
    `${roleTitle} — Find Community`
  );
}

function buildCommunityActivityDetailsTests(prefix, opts) {
  const { roleTitle, guest, before } = opts;
  let n = 0;
  return page(
    "Community Activity Details",
    "Opened from Find Community Activity → View details.",
    [
      T(prefix, ++n, "Header and organization", "1. Read activity title and **organization name**.", "Both clearly shown.", before),
      T(prefix, ++n, "Date time location", "1. Check date, time, city, venue/address.", "Volunteers can find when and where.", before),
      T(prefix, ++n, "Description", "1. Read full description.", "Readable and complete.", before),
      T(prefix, ++n, "Coordinator contact", "1. Find coordinator name, email, or phone if listed.", "Contact info visible.", "Contact provided"),
      T(prefix, ++n, "Join Seva", "1. Tap **Join Seva**.\n2. Complete form if logged in.", guest ? "Login or sign-up required." : "Confirmation; sign-up succeeds or waitlist.", before),
      T(prefix, ++n, "Register items", "1. Use **Register** for items to bring if listed.", guest ? "Login required." : "Item registration works.", "Items listed"),
      T(prefix, ++n, "Image", "1. Check activity image if present.", "Image loads or sensible placeholder.", before),
      T(prefix, ++n, "Back to listings", "1. Return to **Find Community Activity**.", "List page opens.", before),
    ],
    `${roleTitle} — Community Details`
  );
}

function buildPartnerOrganizationsTests(prefix, opts) {
  const { roleTitle, before } = opts;
  let n = 0;
  return page(
    "Partner Organizations",
    "Menu: **Community Network** → **Partner Organizations**.",
    [
      T(prefix, ++n, "Page loads", "1. Open **Partner Organizations**.", "Directory or list of partner organizations.", before),
      T(prefix, ++n, "Organization entries", "1. Browse entries (name, city, description if shown).", "Information readable.", before),
      T(prefix, ++n, "Logo or image", "1. Check logos/images on cards if present.", "Images load or placeholder shown.", "Entries have images"),
      T(prefix, ++n, "Open one organization", "1. Click an entry if it links to more detail.", "Detail view or external link works.", "Clickable entries"),
    ],
    `${roleTitle} — Partner Orgs`
  );
}

function buildCommunityOutreachHubTests(prefix, opts) {
  const {
    roleTitle,
    before,
    loggedIn,
    approvedOrg,
    isAdmin,
    intro = "Community Outreach program — register an organization to post community activities.",
  } = opts;
  let n = 0;
  const tests = [
    T(prefix, ++n, "Program title", "1. Open **Community Outreach** (Community Network menu).", "**Join the Community Outreach program** heading visible.", before),
    T(prefix, ++n, "Step 1 — Create account", "1. Read step **Create an account**.", "Explains sign up and log in.", before),
    T(prefix, ++n, "Step 2 — Add organization", "1. Read step **Add your organization**.", "Explains profile review by email.", before),
    T(prefix, ++n, "Get started (guest)", "1. If logged out, click **Get started**.", "Goes to sign up / login for organization profile.", "Logged out"),
  ];

  if (loggedIn && !approvedOrg && !isAdmin) {
    tests.push(
      T(prefix, ++n, "Pending or rejected state", "1. Log in without approved org.\n2. Read status message.", "Pending review, rejected, or prompt to add profile — clear next step.", before)
    );
  }

  if (approvedOrg || isAdmin) {
    tests.push(
      T(prefix, ++n, "Steps 3–5 section visible", "1. Scroll to **With your approved organization** (or admin tools).", "Steps 3, 4, and 5 are visible.", before),
      T(prefix, ++n, "Step 3 — Post activity link", "1. Click **Post a service activity**.", "Goes to post-activity form.", before),
      T(prefix, ++n, "Step 4 — Manage Activity link", "1. Click **Manage Activity**.", "Goes to manage-activities list.", before),
      T(prefix, ++n, "Step 5 — View Sign Ups link", "1. Click **View Sign Ups**.", "Goes to view-signups page.", before)
    );
  } else if (loggedIn) {
    tests.push(
      T(prefix, ++n, "Steps 3–5 hidden until approved", "1. Confirm steps 3–5 are **not** shown yet.", "Message to complete step 2 and wait for approval.", before)
    );
  }

  return page(
    "Community Outreach hub",
    intro,
    tests,
    `${roleTitle} — Outreach hub`
  );
}

function buildCommunityOrgProfileTests(prefix, opts) {
  const { roleTitle, before } = opts;
  let n = 0;
  return page(
    "Community Org Profile",
    "Organization profile form (step 2 of Community Outreach).",
    [
      T(prefix, ++n, "Form opens", "1. Open **Add organization profile** from Community Outreach.", "Profile form loads.", before),
      T(prefix, ++n, "Organization name", "1. Enter organization name.", "Field accepts input.", before),
      T(prefix, ++n, "Description and city", "1. Fill description and city/center.", "Saved on submit.", before),
      T(prefix, ++n, "Contact and website", "1. Fill phone and website if available.", "Optional fields work.", before),
      T(prefix, ++n, "Logo upload", "1. Upload logo or paste image URL if offered.", "Preview shows on profile.", "Logo field exists"),
      T(prefix, ++n, "Submit for review", "1. Submit profile.", "Pending review message; email when approved.", before),
    ],
    `${roleTitle} — Org profile`
  );
}

function buildPostCommunityActivityTests(prefix, opts) {
  const { roleTitle, before } = opts;
  let n = 0;
  return page(
    "Post Community Activity",
    "Step 3 — list on Find Community Activity after org approval.",
    [
      T(prefix, ++n, "Form opens", "1. Open **Post a service activity**.", "Activity form loads.", before),
      T(prefix, ++n, "Title and category", "1. Fill title and service category.", "Required fields work.", before),
      T(prefix, ++n, "Dates and location", "1. Set dates, times, location.", "Saves correctly.", before),
      T(prefix, ++n, "Description", "1. Enter description for volunteers.", "Text saved.", before),
      T(prefix, ++n, "Publish listing", "1. Submit / publish activity.", "Success message; appears on Find Community Activity.", before),
      T(prefix, ++n, "Organization name on listing", "1. Find your activity on **Find Community Activity**.", "Your organization name shows on the card.", "Activity published"),
    ],
    `${roleTitle} — Post activity`
  );
}

function buildManageCommunityActivitiesTests(prefix, opts) {
  const { roleTitle, before } = opts;
  let n = 0;
  return page(
    "Manage Community Activities",
    "Step 4 — edit or remove your organization's listings.",
    [
      T(prefix, ++n, "Activity list", "1. Open **Manage Activity**.", "Your posted activities listed.", before),
      T(prefix, ++n, "Edit activity", "1. Edit one listing.", "Changes save.", "Activity exists"),
      T(prefix, ++n, "Archive or remove", "1. Archive or delete if option exists.", "Listing removed or hidden from public list.", "Optional"),
    ],
    `${roleTitle} — Manage community`
  );
}

function buildViewCommunitySignUpsTests(prefix, opts) {
  const { roleTitle, before } = opts;
  let n = 0;
  return page(
    "View Community Sign Ups",
    "Step 5 — volunteers who joined your community activities.",
    [
      T(prefix, ++n, "Select activity", "1. Open **View Sign Ups**.\n2. Pick an activity.", "Sign-up list loads.", before),
      T(prefix, ++n, "Volunteer details", "1. Review names, email, adults/kids if shown.", "Roster readable.", before),
      T(prefix, ++n, "Remove sign-up", "1. Remove an entry if allowed.", "Entry removed.", "Test sign-up exists"),
    ],
    `${roleTitle} — Community signups`
  );
}

/** Admin / coordinator: review pending organization profiles */
function buildAdminCommunityReviewTests(prefix, opts) {
  const { roleTitle, before, onDashboardToo } = opts;
  let n = 0;
  const tests = [
    T(prefix, ++n, "Open review page", "1. Open **Community outreach** full list from Seva Admin Dashboard link, or **Admin → Community outreach**.", "Pending organization profiles listed.", before),
    T(prefix, ++n, "Profile details", "1. Open one pending profile.", "Organization name, contact, description visible.", "Pending profile exists"),
    T(prefix, ++n, "Approve profile", "1. **Approve** a test profile (staging).", "Status approved; submitter can use steps 3–5.", "Staging only"),
    T(prefix, ++n, "Reject profile", "1. **Reject** with optional note (staging test).", "Submitter notified; can resubmit.", "Staging only"),
  ];
  if (onDashboardToo) {
    tests.push(
      T(prefix, ++n, "Pending on Seva Admin Dashboard", "1. On **Seva Admin Dashboard**, find **Community outreach — pending profiles**.", "Same pending list or link to full page.", before)
    );
  }
  return page(
    "Admin Community Review",
    "Coordinators and admins approve organization profiles before they can post activities.",
    tests,
    `${roleTitle} — Review orgs`
  );
}

/** Shared bundle: public community browse (all roles) */
function buildPublicCommunityBrowse(prefix, opts) {
  const { roleTitle, before, guest } = opts;
  return [
    buildFindCommunityActivityTests(prefix, {
      roleTitle,
      before,
      intro: "Public community seva listings (outreach organizations).",
      joinExpected: guest ? "Login or sign-up required." : "Join works when logged in.",
    }),
    buildCommunityActivityDetailsTests(prefix, { roleTitle, guest, before }),
    buildPartnerOrganizationsTests(prefix, { roleTitle, before }),
    buildCommunityOutreachHubTests(prefix, {
      roleTitle,
      before,
      intro: guest
        ? "Guests see steps 1–2 only until they register and get an approved organization."
        : "Logged-in users without approved org see steps 1–2; steps 3–5 appear after approval.",
      loggedIn: !guest,
      approvedOrg: false,
      isAdmin: false,
    }),
  ];
}

module.exports = {
  buildFindCommunityActivityTests,
  buildCommunityActivityDetailsTests,
  buildPartnerOrganizationsTests,
  buildCommunityOutreachHubTests,
  buildCommunityOrgProfileTests,
  buildPostCommunityActivityTests,
  buildManageCommunityActivitiesTests,
  buildViewCommunitySignUpsTests,
  buildAdminCommunityReviewTests,
  buildPublicCommunityBrowse,
};
