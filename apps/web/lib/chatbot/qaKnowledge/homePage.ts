/**
 * Home page (/) — QA guide for domain testers and chatbot grounding.
 * Home tests live in docs/qa/Guest and docs/qa/Volunteer (etc.) — generate via npm run qa:export.
 */
export const HOME_PAGE_QA_GUIDE = `
## Home page (/) — testing & user guide

**URL:** Open the site root (Home in the top menu).

**Who can use the home page:** Everyone (guests and logged-in users). No login is required to view the home page.

### What is on the home page (top to bottom) — test each section

1. **Hero banner** — Large welcome image at the top.
2. **Top menu** — Logo, **Home**, **Find Seva**, **My Seva Dashboard**, **Seva Blog**, **Community Network**, **About Us**, **Resources**, **Login** or **Logout**.
3. **Second menu row** (some roles only) — **Seva Admin Dashboard**, **Roles** (Admin), or **Event Admin Dashboard** (event-only).
4. **Find Seva** and **My Seva Dashboard** buttons — Two large round buttons below the banner.
5. **Seva Activity Calendar** — Tabs: Center / Regional / National; Center and USA Region filters; month/year; click a day to open Find Seva for that date.
6. **Our Impact** — Quote, then three boxes: **Activities**, **Volunteers**, **Hours**.
7. **Featured Seva Activities** — Slider with cards, **View More**, arrows/dots if multiple activities.
8. **Footer** — Foundation logo, text, **LoveSaiServeSai@gmail.com**.
9. **Chat assistant** — Bottom-right; ask for role-based testing help.

Role checklists are in **apps/web/docs/qa/** — one folder per role; open the **Home** sheet for full section-by-section tests.

### Header — who sees what (second row)

| If you are… | Second row on home |
|-------------|-------------------|
| **Guest** (not logged in) | No second row — only **Login** in the top row |
| **Volunteer** (logged in, no special role) | No second row |
| **Seva Coordinator** | **Seva Admin Dashboard** (not **Roles**) |
| **Blog Admin** | **Seva Admin Dashboard** (not **Roles** unless you are also Admin) |
| **Regional / National Seva Coordinator** | **Seva Admin Dashboard** |
| **Admin** | **Seva Admin Dashboard** and **Roles** |
| **Event Admin only** | **Event Admin Dashboard** only (not full Seva admin) |

After a role change, **log out and log back in** so the menu updates.

### Common tester questions (home page)

- **“How do I test the home page?”** — Open Home, check menu for your role, click **Find Seva** and **My Seva Dashboard**, scroll to calendar and **Our Impact**, check **Featured Seva** slides and **View More**. Use the QA spreadsheet row for each item; mark Pass Yes/No and add notes.
- **“What should I see on the home page?”** — Banner, two main buttons, calendar, three impact numbers (not stuck loading forever), featured activity cards or a friendly empty message.
- **“Why don’t I see Seva Admin Dashboard?”** — That link is only for coordinators, blog admins, and admins. Volunteers and guests will not see it.
- **“Find Seva button”** — Goes to **Find Seva** page to search activities by center, category, and dates.
- **“Featured activities empty”** — Normal if no activities are marked “featured” in admin; message should explain that, not a broken page.

### QA spreadsheet columns (for testers)

Test # · Page · Section · What we are testing · Who should test · Before you start · Steps to follow · What you should see · Test on (Phone / Computer / Both) · Pass? · Your notes · Priority (Must / Should / Nice)
`;

export const HOME_PAGE_CHATBOT_HINTS = [
  "How do I test the home page?",
  "What should I see on the home page?",
  "Why don't I see Seva Admin Dashboard?",
  "Walk me through the home page sections",
] as const;
