import { resolveCityFromText } from "./resolveCity";
import type { HelpLink } from "./validateLinks";

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

  if (q.includes("charlotte")) {
    const city = "Charlotte";
    return {
      message:
        `To browse activities for **${city}**, open **Find Seva** with that center already selected in the dropdown. You can change category or date, then use the page controls to refresh results.\n\n` +
        `After logging in, **My Seva Dashboard** shows your sign-ups if you need to withdraw.`,
      links: [cityLink(city), { label: "Find Seva (all centers)", href: "/find-seva" }, { label: "My Seva Dashboard", href: "/dashboard" }],
    };
  }

  if (q.includes("find seva") || q.includes("where to find") || q.includes("browse activit")) {
    return {
      message:
        "Use **Find Seva** in the top menu. Pick a **Sri Sathya Sai Center/Group** (city), optional category and date, then view listings. Open an activity to read details and sign up (when logged in).",
      links: [{ label: "Open Find Seva", href: "/find-seva" }],
    };
  }

  if (q.includes("join") && (q.includes("seva") || q.includes("sign up") || q.includes("signup"))) {
    return {
      message:
        "1) **Log in** or create an account.\n2) Open **Find Seva**, choose your center and an activity.\n3) Complete the sign-up on the activity page.\n\nYour commitments appear under **My Seva Dashboard → Upcoming Seva Activities**.",
      links: [
        { label: "Find Seva", href: "/find-seva" },
        { label: "Login / Sign up", href: "/login" },
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
      "I can help with **Find Seva**, **joining or withdrawing** from activities, **My Seva Dashboard**, **Log Hours / certificate**, **Community Outreach**, and **coordinator/admin** features.\n\n" +
      "Try asking: “How do I find seva in Charlotte?”, “How do I withdraw?”, or “I can’t see Add Seva.”\n\n" +
      "(For richer answers, your administrator can set **OPENAI_API_KEY** on the server.)",
    links: [
      { label: "Find Seva", href: "/find-seva" },
      { label: "My Seva Dashboard", href: "/dashboard" },
      { label: "Login", href: "/login" },
    ],
  };
}
