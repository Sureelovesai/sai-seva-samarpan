/**
 * Role-based QA — guides testers to the right workbook and page expectations.
 */
export const ROLE_BASED_QA_GUIDE = `
## Testing by role (for domain testers)

Testers use Excel files in **apps/web/docs/qa/** — one folder per role:

- **Guest/** — not logged in
- **Volunteer/** — logged-in volunteer (no admin roles)
- **Seva_Coordinator/** — Seva Admin Dashboard, Add/Manage Seva, Sign Ups (no Roles)
- **Blog_Admin/** — blog approval, blog reports, seva admin tiles (no Roles unless also Admin)
- **Admin/** — full access including **Roles**
- **Event_Admin_Only/** — Event Admin Dashboard only (not Seva Admin)

Each workbook has a **Start here** sheet and one tab per page.

**Community Network / Community Seva** (menu dropdown): **Find Community Activity** (filters, search, cards — not the same as Find Seva), **Community Activity Details** (join/register), **Partner Organizations**, **Community Outreach hub** (steps 1–5), and for admins/coordinators **Admin Community Review**. Organization owners also test **Community Org Profile**, **Post Community Activity**, **Manage Community Activities**, **View Community Sign Ups** (Admin workbook includes these for a staging org account).

When someone says they are **testing as** a role, answer only what **that role** should see. Tell them which Excel tab matches the page they are on. Do not mention HTTP errors, APIs, or server codes — use plain language and **Your comments** in the sheet for problems.

**Guest** should not see Seva Admin Dashboard or Roles. **Volunteer** same after login. **Coordinator** sees Seva Admin Dashboard without Roles. **Admin** sees Roles. **Event Admin only** sees Event Admin Dashboard, not Seva admin tools.
`;
