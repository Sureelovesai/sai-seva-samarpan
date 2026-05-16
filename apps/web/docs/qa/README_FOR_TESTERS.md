# Testing guide (by role)

Test plans live in **this folder**: `apps/web/docs/qa/`

## Folders

| Folder | Excel file |
|--------|------------|
| `Guest/` | `Guest_Testing_Checklist.xlsx` |
| `Volunteer/` | `Volunteer_Testing_Checklist.xlsx` |
| `Seva_Coordinator/` | `Seva_Coordinator_Testing_Checklist.xlsx` |
| `Blog_Admin/` | `Blog_Admin_Testing_Checklist.xlsx` |
| `Admin/` | `Admin_Testing_Checklist.xlsx` |
| `Event_Admin_Only/` | `Event_Admin_Testing_Checklist.xlsx` |

## Sheets in each workbook (example: Guest)

| Tab | What it covers |
|-----|----------------|
| Home (all sections) | Hero, buttons, calendar, Our Impact, Featured Seva, footer |
| Find Seva (all sections) | Filters, tabs, list, View details |
| Seva Blog (all sections) | Hero, stats, 4 cards, Create Post, guidelines, Stories, search, cards |
| Blog Post Detail | Full article page |
| … | Other pages for that role |

## Regenerate

Close all Excel files first, then:

```powershell
cd C:\Projects\FullStack-App\apps\web
npm run qa:export
```

## How to test

1. Open the Excel file for **your role only**.
2. Read **Start here**, then each page tab.
3. On the **Home** tab, complete **every section**: hero, Find Seva button, My Seva Dashboard button, Seva Activity Calendar, Our Impact, Featured Seva Activities, footer.
4. Mark **Pass?** and write issues in **Your comments** (describe what you saw — no technical jargon needed).

Open in File Explorer:

`C:\Projects\FullStack-App\apps\web\docs\qa`
