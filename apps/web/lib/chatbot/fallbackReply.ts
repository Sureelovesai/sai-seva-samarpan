import { CITIES } from "@/lib/cities";
import { resolveCityFromText } from "./resolveCity";
import type { HelpLink } from "./validateLinks";

/** Rotates with the calendar day so fallback copy is not tied to one center. */
function pickChatbotExampleCity(): string {
  const day = Math.floor(Date.now() / 86_400_000);
  return CITIES[day % CITIES.length] ?? CITIES[0];
}

export type ChatReply = { message: string; links: HelpLink[] };

function cityLink(city: string): HelpLink {
  return {
    label: `Find Seva — ${city}`,
    href: `/find-seva?city=${encodeURIComponent(city)}`,
  };
}

/** Rule-based answers when OPENAI_API_KEY is not set or the API fails. */
export function fallbackReply(userText: string): ChatReply {
  const q = userText.toLowerCase();

  const cityInQuestion = resolveCityFromText(userText);
  const mentionsCity =
    cityInQuestion != null && q.includes(cityInQuestion.toLowerCase());
  const findSevaIntent =
    q.includes("find seva") ||
    q.includes("find service") ||
    q.includes("seva in") ||
    q.includes("activities in") ||
    q.includes("activities for") ||
    q.includes("browse") ||
    q.includes("where to find");
  const onlyCityName = cityInQuestion != null && q.trim() === cityInQuestion.toLowerCase();

  if (cityInQuestion && mentionsCity && (findSevaIntent || onlyCityName)) {
    return {
      message:
        `To browse activities for **${cityInQuestion}**, open **Find Seva** with that center already selected in the dropdown. You can change category or date, then use **Apply** to refresh results.\n\n` +
        `After logging in, **My Seva Dashboard** shows your sign-ups if you need to withdraw.`,
      links: [
        cityLink(cityInQuestion),
        { label: "Find Seva (all centers)", href: "/find-seva" },
        { label: "My Seva Dashboard", href: "/dashboard" },
      ],
    };
  }

  if (q.includes("find seva") || q.includes("where to find") || q.includes("browse activit")) {
    return {
      message:
        "Use **Find Seva** in the top menu. Pick a **Sri Sathya Sai Center/Group** (city), optional category and date, then view listings. Open an activity to read details and sign up (when logged in).",
      links: [{ label: "Open Find Seva", href: "/find-seva" }],
    };
  }

  if (
    (q.includes("difference") || q.includes("join seva") || q.includes("items to bring")) &&
    (q.includes("join") || q.includes("register") || q.includes("item"))
  ) {
    return {
      message:
        "On **Seva Details** (from **Find Seva** → **View details**), **Join Seva** and **Register** are **independent**:\n\n" +
        "**Join Seva** — on-site volunteer; confirmation emails to **you and the coordinator**; **~24h** reminder if **approved**.\n\n" +
        "**Register** — supplies only; **separate** confirmation emails; **~24h** **item** reminder if you did **not** also join (same email won’t get two reminders).\n\n" +
        "Waitlist join sign-ups don’t get the 24h reminder until approved.",
      links: [{ label: "Find Seva", href: "/find-seva" }, { label: "My Seva Dashboard", href: "/dashboard" }],
    };
  }

  if (q.includes("join") && (q.includes("seva") || q.includes("sign up") || q.includes("signup"))) {
    return {
      message:
        "On the **Seva Details** page (open an activity from **Find Seva** → **View details**), **Join Seva** and **Register** (items to bring) are **two separate things**:\n\n" +
        "• **Join Seva** — you are signing up to take part **on site**. You and the **seva coordinator** get confirmation emails (when mail is configured). **Approved** volunteers get a reminder about **24 hours before** the start (automated cron).\n\n" +
        "• **Register** — you are only signing up to **bring listed supplies**. Same idea: **you and the coordinator** get **item-specific** confirmation emails. If you did **not** also **Join Seva**, you still get a **~24 hour** reminder about **what you offered to bring** (not duplicated if that email is already an approved on-site signup).\n\n" +
        "**My Seva Dashboard** lists **Join Seva** sign-ups for withdrawing; item-only Register is separate from that roster.",
      links: [
        { label: "Find Seva", href: "/find-seva" },
        { label: "Login / Sign up", href: "/login" },
        { label: "My Seva Dashboard", href: "/dashboard" },
      ],
    };
  }

  if (
    q.includes("email") &&
    (q.includes("seva") || q.includes("coordinator") || q.includes("volunteer") || q.includes("reminder") || q.includes("register"))
  ) {
    return {
      message:
        "**Join Seva:** volunteer + coordinator receive **join** confirmation emails; **approved** volunteers get a **~24h-before** reminder.\n\n" +
        "**Register** (items): contributor + coordinator receive **item registration** emails; **item-only** people get a **~24h-before** **supplies** reminder (no duplicate if they are already an approved on-site signup for that activity).\n\n" +
        "Waitlist (**PENDING**) join sign-ups do **not** get the 24h reminder until **approved**.",
      links: [
        { label: "Find Seva", href: "/find-seva" },
        { label: "My Seva Dashboard", href: "/dashboard" },
      ],
    };
  }

  if (q.includes("withdraw") || q.includes("cancel") && q.includes("sign")) {
    return {
      message:
        "Go to **My Seva Dashboard**, click your upcoming activity card, then use **Withdraw** in the dialog (you can sign up again later from Find Seva).",
      links: [{ label: "My Seva Dashboard", href: "/dashboard" }],
    };
  }

  if (q.includes("coordinator") && (q.includes("add") || q.includes("create") || q.includes("post") || q.includes("seva"))) {
    return {
      message:
        "**Seva Coordinators** and **Admins** add listings from **Seva Admin Dashboard → Add Seva Activity** (or **Manage Seva** to edit). If you do not see those links, your account may not have the coordinator/admin role assigned in **Roles**.",
      links: [
        { label: "Seva Admin Dashboard", href: "/admin/seva-dashboard" },
        { label: "Add Seva Activity", href: "/admin/add-seva-activity" },
      ],
    };
  }

  if (
    (q.includes("bulk") || q.includes("excel") || q.includes("spreadsheet") || q.includes(".xlsx")) &&
    (q.includes("import") || q.includes("upload") || q.includes("volunteer") || q.includes("signup") || q.includes("sign up") || q.includes("seva"))
  ) {
    return {
      message:
        "**Bulk import (Excel)** is for **Admins** and **Seva coordinators**:\n\n" +
        "1. Open **Add Seva Activity** and **save** the activity (**Save & Draft** or **Save & Publish**).\n" +
        "2. Scroll to **Download Excel template & bulk import** → **Download Excel template**. **Add Seva Activity** row 2 (with date pickers on Start/End date) updates the saved activity on upload; then **Contribution items** and **Join Seva Activity** rows. **Upload filled Excel** (needs a **published** activity).\n" +
        "3. Errors show **row by row** in a grid. Upcoming activities: volunteers get **join** emails + coordinator **summary**; ended activities: import **without** email.\n\n" +
        "After editing contribution items in **Manage Seva → Edit**, open **Add Seva Activity** again (same browser) and download a **fresh** template. View sign-ups under **Seva Sign Ups**.",
      links: [
        { label: "Add Seva Activity", href: "/admin/add-seva-activity" },
        { label: "Manage Seva", href: "/admin/manage-seva" },
        { label: "Seva Sign Ups", href: "/admin/seva-signups" },
        { label: "Seva Admin Dashboard", href: "/admin/seva-dashboard" },
      ],
    };
  }

  if (q.includes("cannot see") || q.includes("can't see") || q.includes("do not see") || q.includes("don't see") || q.includes("missing") && q.includes("link")) {
    return {
      message:
        "Most extra links depend on **role** (assigned by email in **Admin → Roles**):\n\n" +
        "• **Volunteer** — Find Seva, Dashboard, Seva Blog, Community Outreach.\n" +
        "• **Seva Coordinator** — above plus **Seva Admin Dashboard**, Add/Manage Seva, Sign Ups (scoped to your cities).\n" +
        "• **Blog Admin** — can approve blog posts.\n" +
        "• **Admin** — full access including **Roles**.\n\nTry **logging out and back in** after a role change.",
      links: [
        { label: "Login", href: "/login" },
        { label: "Seva Admin Dashboard", href: "/admin/seva-dashboard" },
      ],
    };
  }

  if (q.includes("certificate") || q.includes("hours served") || q.includes("log hours")) {
    return {
      message:
        "Volunteer **certificates** are created from **Log Hours**: submit your hours successfully, then open the certificate view (you’ll need your name and location as prompted). Use print/save from the certificate page for a PDF copy where supported.",
      links: [
        { label: "Log Hours", href: "/log-hours" },
        { label: "My Seva Dashboard", href: "/dashboard" },
      ],
    };
  }

  if (q.includes("community outreach") || q.includes("organization profile")) {
    return {
      message:
        "**Community Outreach** is a separate flow: create an account, submit an **organization profile** for review, then (once approved) **post a service activity** to Find Seva. Admins and regional coordinators review profiles from the Seva Admin Dashboard.",
      links: [
        { label: "Community Outreach", href: "/community-outreach" },
        { label: "Login / Sign up", href: "/login" },
      ],
    };
  }

  if (q.includes("blog")) {
    return {
      message: "Read and post stories on **Seva Blog** (posts may need approval). Guidelines are linked from the blog area.",
      links: [{ label: "Seva Blog", href: "/seva-blog" }],
    };
  }

  const looseCity = resolveCityFromText(userText);
  if (looseCity && (q.includes("center") || q.includes("city") || q.includes("near"))) {
    return {
      message: `If you meant activities for **${looseCity}**, open Find Seva with that center selected.`,
      links: [cityLink(looseCity), { label: "Find Seva", href: "/find-seva" }],
    };
  }

  return {
    message:
      "I can help with **Find Seva**, **joining or withdrawing** from activities, **My Seva Dashboard**, **Log Hours / certificate**, **Community Outreach**, and **coordinator/admin** features (including **bulk Excel import** on **Add Seva Activity** after you save an activity).\n\n" +
      `Try asking: “How do I find seva in ${pickChatbotExampleCity()}?”, “How do I withdraw?”, “How do I bulk import volunteers?”, or “I can’t see Add Seva.”\n\n` +
      "(For richer answers, your administrator can set **OPENAI_API_KEY** on the server.)",
    links: [
      { label: "Find Seva", href: "/find-seva" },
      { label: "My Seva Dashboard", href: "/dashboard" },
      { label: "Add Seva Activity", href: "/admin/add-seva-activity" },
      { label: "Login", href: "/login" },
    ],
  };
}
