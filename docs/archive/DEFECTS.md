# Poll City — Phase 0 Defect Log

Generated from code audit. Update this file after each live testing session.

---

## ✅ Fixed in this build

| # | Issue | File | Status |
|---|-------|------|--------|
| 1 | Dashboard `notHome` metric was reusing `followUpsDue` slot | `dashboard/page.tsx` | Fixed |
| 2 | No Not Home stat on dashboard | `dashboard-client.tsx` | Fixed |
| 3 | `social/officials/[id]` page missing | `social/officials/[id]/page.tsx` | Created |
| 4 | `api/officials/[id]` route missing | `api/officials/[id]/route.ts` | Created |
| 5 | `api/officials/[id]/questions` route missing | `api/officials/[id]/questions/route.ts` | Created |
| 6 | `social/polls/[id]` detail page missing | `social/polls/[id]/page.tsx` | Created |
| 7 | Sidebar had duplicate Field Config entry | `sidebar.tsx` | Fixed |
| 8 | `.gitignore` missing | `.gitignore` | Created |

---

## 🔴 Known gaps — not yet in frontend (schema exists, UI missing)

| Feature | Schema | API | UI | Priority |
|---------|--------|-----|-------|----------|
| Campaign creation UI | ✅ | ✅ | ❌ Need page | High |
| Campaign settings edit | ✅ | ✅ | Partial | High |
| Sign tracking list/map | ✅ | ❌ | ❌ | Medium |
| Volunteer management | ✅ | ❌ | ❌ | Medium |
| Notification center | ✅ | ❌ | ❌ | Low |
| Service bookings/marketplace | ✅ | ❌ | ❌ | Phase 4 |
| Full canvass assignment detail | ✅ | ✅ | Partial | Medium |
| Contact household grouping (new contacts) | ✅ | Partial | ❌ | Medium |
| Social official claiming flow | ✅ | ❌ | ❌ | Phase 3 |
| Push notifications | ✅ | ❌ | ❌ | Phase 3 |
| GIS / map view | Schema ready | ❌ | ❌ | Phase 4 |

---

## 🟡 Needs live testing to confirm

These work in code but need to be verified with a real browser session:

- [ ] CSV import — parse, preview, and load rows correctly
- [ ] CSV export — all columns including custom fields
- [ ] Interaction logging from contact detail page
- [ ] Walk list — Not Home updates persist on reload
- [ ] Poll voting — binary, slider, multiple choice
- [ ] Social profile sign in/out flow
- [ ] Field configuration — add field, appears on canvassing card
- [ ] AI Assist — mock mode responses render correctly

---

## Phase completion criteria

**Phase 0 complete when:**
- [ ] App is deployed to live Vercel URL
- [ ] Login works with demo credentials
- [ ] Dashboard loads with real numbers
- [ ] All main nav items load without error
- [ ] Contacts list loads with 10 seed contacts
- [ ] Walk list renders with household view
- [ ] Social pages load

**Phase 1 starts after Phase 0 is demonstrated live.**
