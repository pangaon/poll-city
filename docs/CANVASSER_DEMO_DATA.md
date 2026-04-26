# Canvasser Demo Data Fix (Empty Missions in Expo)

## Root cause
`/api/canvasser/missions` reads from `FieldAssignment` + `AssignmentStop`, **not** from `Turf` / `TurfStop` directly.

If turfs exist but field assignments are missing, the mobile Canvassing tab can still look empty.
Also, mission visibility now accepts assignments inherited from turf assignee fields (`Turf.assignedUserId` / `assignedVolunteerId`) when direct mission assignment fields are empty.

## Fix command

Run:

```bash
npm run seed:canvasser:demo
```

This script:
- creates/upserts one `FieldAssignment` per turf,
- assigns an available campaign user,
- rebuilds `AssignmentStop` rows from `TurfStop` contacts (or fallback contacts),
- is safe to re-run.

## Verification

1. Reload Expo Go (`r`).
2. Open Canvassing tab.
3. Confirm missions appear from `/api/canvasser/missions`.

## Notes

- This is demo-data seeding, not production assignment logic.
- Production assignment should still flow through assignment creation workflows.
