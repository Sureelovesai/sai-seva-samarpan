/**
 * Seva Blog listing (/seva-blog) and post detail — full section coverage.
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

/** Listing page: /seva-blog */
function buildSevaBlogPageTests(prefix, opts) {
  const {
    roleTitle,
    intro,
    before,
    loggedIn,
    canGenerateReport,
    canEditOnCards,
    createPostExpected,
  } = opts;

  let n = 0;
  const tests = [
    T(
      prefix,
      ++n,
      "Hero — Sai Hridaya title",
      "1. Open **Seva Blog** from the menu.\n2. Look at the top banner.",
      "Title **Sai Hridaya** with image, tagline **LOVE IN ACTION**, and subtitle about service.",
      before
    ),
    T(
      prefix,
      ++n,
      "Blog at a glance — stats row",
      "1. Scroll to the four summary boxes below the hero.",
      "Four stats visible: **Stories shared**, **Reactions**, **Contributors**, **Sections** (numbers may be zero).",
      before
    ),
    T(
      prefix,
      ++n,
      "Four section cards",
      "1. Find the four colored cards:\n   • Seva in Action\n   • Seva Ideas And Resources\n   • SSSE & Sai Youth Corner\n   • Sai Inspires\n2. Read titles and bullet lists.",
      "All four cards show title, subtitle, and example topics.",
      before
    ),
    T(
      prefix,
      ++n,
      "Create A Post — per section",
      "1. On any section card, click **Create A Post**.",
      createPostExpected,
      before
    ),
    T(
      prefix,
      ++n,
      "Guideline For Posting",
      "1. Scroll to **Guideline For Posting**.\n2. Click **View guidelines (PDF)**.",
      "Section explains guidelines; PDF opens in a new tab or downloads.",
      before
    ),
    T(
      prefix,
      ++n,
      "Stories — section header",
      "1. Scroll to **Stories** (Community posts).",
      "Heading **Stories** and subtitle about contributors are visible.",
      before
    ),
    T(
      prefix,
      ++n,
      "Search stories",
      "1. Type a word in **Search stories**.\n2. Click **Search**.\n3. Click **Clear** if shown.",
      "List filters to matching posts; Clear restores full list.",
      "At least one published story exists (or test empty message)"
    ),
    T(
      prefix,
      ++n,
      "Story cards — grid",
      "1. Browse story cards in the grid.",
      "Each card shows image (or placeholder), title, excerpt, author, and reaction buttons.",
      before
    ),
    T(
      prefix,
      ++n,
      "Open full story",
      "1. Click a story card (title or image).",
      "Full **blog post** page opens with complete article.",
      before
    ),
    T(
      prefix,
      ++n,
      "Reactions on story card",
      "1. On a story card, tap a reaction (e.g. thumbs up, heart, prayer).",
      loggedIn
        ? "Reaction count updates or button shows selected state."
        : "You may be asked to log in, or reaction works for guests if allowed.",
      before
    ),
    T(
      prefix,
      ++n,
      "Breadcrumb",
      "1. Scroll near bottom; find breadcrumb **Home / Seva Blog / Stories**.",
      "Links work: Home goes to home; Seva Blog stays on blog.",
      before
    ),
  ];

  if (canGenerateReport) {
    tests.push(
      T(
        prefix,
        ++n,
        "Generate report button",
        "1. In the Stories section header, look for **Generate report**.",
        "**Generate report** is visible and opens blog analytics reports.",
        before
      )
    );
  } else {
    tests.push(
      T(
        prefix,
        ++n,
        "No Generate report (this role)",
        "1. In the Stories section, look for **Generate report**.",
        "You should **not** see **Generate report** (coordinators and blog admins see it).",
        before
      )
    );
  }

  if (canEditOnCards) {
    tests.push(
      T(
        prefix,
        ++n,
        "Edit post from card",
        "1. On a story card, use **Edit** (if shown).",
        "Edit form opens; you can save changes.",
        "You have edit permission"
      )
    );
  }

  if (loggedIn) {
    tests.push(
      T(
        prefix,
        ++n,
        "Submit new post (logged in)",
        "1. **Create A Post** → fill title and content → submit.",
        "Success message about review/publish; post may appear after approval.",
        before
      )
    );
  }

  return page(
    "Seva Blog (all sections)",
    intro +
      "\n\nTest every section on this tab: hero, stats, four cards, guidelines, stories, search, and cards.",
    tests,
    `${roleTitle} — Seva Blog`
  );
}

/** Detail page: /seva-blog/post/[id] */
function buildBlogPostDetailPageTests(prefix, opts) {
  const { roleTitle, before, canEdit, loggedIn } = opts;
  let n = 0;
  return page(
    "Blog Post Detail",
    "Opened by clicking a story card on Seva Blog.",
    [
      T(
        prefix,
        ++n,
        "Post loads",
        "1. Open any story from Seva Blog.",
        "Title, author, date, and main content display.",
        before
      ),
      T(
        prefix,
        ++n,
        "Article content",
        "1. Read the full article body.",
        "Text and images readable; layout not broken on phone or computer.",
        before
      ),
      T(
        prefix,
        ++n,
        "Reactions on post",
        "1. Use reaction buttons on the post page.",
        loggedIn
          ? "Reaction works and count updates."
          : "Login prompt or limited reactions for guest.",
        before
      ),
      T(
        prefix,
        ++n,
        "Back to Seva Blog",
        "1. Use back link or menu **Seva Blog**.",
        "Returns to blog listing.",
        before
      ),
      ...(canEdit
        ? [
            T(
              prefix,
              ++n,
              "Edit post",
              "1. Click **Edit** on the post page.",
              "Edit form opens; save updates the post.",
              before
            ),
          ]
        : []),
    ],
    `${roleTitle} — Blog post`
  );
}

module.exports = { buildSevaBlogPageTests, buildBlogPostDetailPageTests };
