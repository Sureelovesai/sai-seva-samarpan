# Testing guide (by role)

Test plans are organized **by role**, not by page. Each tester uses **one folder** and **one Excel file** for their login type.

## Folder structure

```
apps/web/docs/qa/
  Guest/                    ← not logged in
  Volunteer/                ← regular logged-in volunteer
  Seva_Coordinator/         ← center / regional / national coordinator
  Blog_Admin/
  Admin/
  Event_Admin_Only/
```

Each folder contains one workbook, for example:

- `Guest/Guest_Testing_Checklist.xlsx`
- `Admin/Admin_Testing_Checklist.xlsx`

## How to test

1. Get the **test account** for your role only (do not use an admin account for volunteer testing).
2. Open your role’s Excel file.
3. Read the **Start here** sheet.
4. Work through **each tab** (one tab = one page on the website).
5. For each row: follow **Steps to follow**, compare with **What you should see**, mark **Pass?**, and write issues in **Your comments**.

We do **not** ask you to check technical items (servers, error codes, or background systems). If something breaks, describe what you did and what happened in **Your comments**.

## Regenerate spreadsheets (developers)

```powershell
cd C:\Projects\FullStack-App\apps\web
npm run qa:export
```

## Chat help while testing

Open the chat bubble on the site and say, for example:

- *I am testing as Guest — what should I see on Find Seva?*
- *I am testing as Admin — walk me through Seva Admin Dashboard*

## Assigning testers

| Tester | Folder / file |
|--------|----------------|
| Public / new visitor | `Guest/` |
| Regular volunteer | `Volunteer/` |
| Center coordinator | `Seva_Coordinator/` |
| Blog moderator | `Blog_Admin/` |
| Full administrator | `Admin/` |
| Events-only manager | `Event_Admin_Only/` |

Give each person **only** their file so they are not skipping rows meant for other roles.
