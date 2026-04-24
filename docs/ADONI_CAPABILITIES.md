# Adoni Capabilities — Master Reference

**Last updated:** 2026-04-23  
**Tool count:** 47 active tools  
**File:** `src/lib/adoni/actions.ts`

This document is the living reference for everything Adoni can and cannot do.
Every tool is listed by domain with its permission requirement and a plain-English description.

---

## How Adoni Works

Adoni is an AI assistant powered by Claude. When a user sends a message, the chat route:

1. Builds the user's `ActionContext` (userId, campaignId, userName, userRole, permissions, autoExecuteEnabled, trustLevel)
2. Passes the full conversation history + ADONI_TOOLS schema to Claude
3. Claude decides whether to call a tool or reply conversationally
4. If a tool is called, the chat route checks permissions via `TOOL_REQUIRED_PERMISSION`
5. For write tools: also checks `autoExecuteEnabled` (campaign setting) — if off, Adoni describes what it would do but doesn't do it
6. The executor function runs, scoped by `campaignId`, and returns `{ success, message, data }`
7. Adoni delivers the result in natural language

**Permission check order:** RBAC (role/permissions) → auto-execute gate → executor runs

---

## Domain: Analytics & Intelligence

| Tool | Permission | What it does |
|------|-----------|--------------|
| `get_campaign_stats` | `analytics:read` | Total contacts, supporters %, volunteers, doors knocked, signs, donations total |
| `get_daily_brief` | `analytics:read` | Yesterday's activity summary — doors, donations, volunteers signed up |
| `predict_vote_total` | `analytics:read` | Vote projection using strong/leaning support at 85%/60% turnout; cross-references historical election results |
| `scenario_model` | `analytics:read` | "What if we knock X more doors?" — projects new supporters using current conversion rate |
| `get_anomalies` | `analytics:read` | Flags week-over-week drops of 30%+ in canvassing, support, donations, or volunteer activity |
| `search_knowledge` | `analytics:read` | Searches campaign wisdom entries (George's Brain knowledge base) |
| `get_election_calendar` | `analytics:read` | Ontario 2026 key dates: nominations, advance voting, election day, spending limit |

---

## Domain: Contacts & Supporters

| Tool | Permission | What it does |
|------|-----------|--------------|
| `search_contacts` | `contacts:read` | Find contacts by name, phone, or address; filter by support level or ward |
| `count_contacts_in_area` | `contacts:read` | Count contacts in a ward/poll district |
| `build_smart_list` | `contacts:read` | Build a targeted contact list by support level, ward, or tag — returns count + sample |
| `create_contact` | `contacts:write` | Create a new contact with name, phone, email, ward, support level |
| `update_contact_support` | `contacts:write` | Update a contact's support level |
| `update_contact_details` | `contacts:write` | Update phone, email, address, notes (notes append, not overwrite) |
| `log_interaction` | `canvassing:write` | Log a door knock, phone call, or note against a contact |
| `get_contact_history` | `contacts:read` | **NEW** Full interaction history for a contact — all door knocks, calls, emails, notes |
| `add_tag` | `contacts:write` | **NEW** Add a tag to a contact (creates tag if it doesn't exist) |
| `remove_tag` | `contacts:write` | **NEW** Remove a tag from a contact |
| `export_contacts` | `contacts:export` | Initiates a contact export with filters applied — navigates user to /import-export |
| `segment_contacts` | `contacts:write` | Auto-segments contacts by ward into canvass walk lists |
| `mark_voted` | `gotv:write` | Strikes off a contact as voted on election day |

---

## Domain: Signs

| Tool | Permission | What it does |
|------|-----------|--------------|
| `create_sign_request` | `signs:write` | Creates a sign request at an address, linked to a contact if found |
| `get_sign_summary` | `signs:read` | **NEW** Total signs, breakdown by status (requested/scheduled/installed/removed/damaged/missing/needs_repair), unassigned count |
| `log_sign_event` | `signs:write` | **NEW** Log install/remove/damage/missing/repair/audit action on a sign; updates sign status accordingly |

---

## Domain: Tasks

| Tool | Permission | What it does |
|------|-----------|--------------|
| `create_task` | `tasks:write` | Create a task with title, priority, due date, assignee, contact link |
| `create_reminder` | `adoni:write_tools` | Create a personal reminder (saved as a task) |
| `list_tasks` | `tasks:read` | List open tasks filtered by status, priority, or assignee name |
| `complete_task` | `tasks:write` | Mark a task as completed |
| `resolve_task` | `tasks:write` | **NEW** Resolve a task with a resolution type (COMPLETED, VOICEMAIL_LEFT, MET_IN_PERSON, EMAIL_SENT, NOT_REACHED, RECRUITED, DECLINED, FOLLOW_UP_NEEDED, BLOCKED, DELEGATED, WONT_DO) plus optional note; auto-logs an interaction if task is linked to a contact |

---

## Domain: GOTV

| Tool | Permission | What it does |
|------|-----------|--------------|
| `get_gotv_summary` | `gotv:read` | Voted count, voters outstanding, phone banking completion, priority contacts remaining |

---

## Domain: Volunteers

| Tool | Permission | What it does |
|------|-----------|--------------|
| `get_volunteer_roster` | `volunteers:read` | List of active volunteers with skills and vehicle status |
| `create_volunteer` | `volunteers:write` | Add a volunteer with name, phone, skills, availability, vehicle |
| `bulk_create_volunteers` | `volunteers:write` | Add a list of volunteers at once (from a pasted list or CSV) |
| `deploy_team` | `canvassing:manage` | Creates a canvass shift with assigned volunteers for a ward |

---

## Domain: Canvassing & Field Ops

| Tool | Permission | What it does |
|------|-----------|--------------|
| `schedule_canvass` | `canvassing:manage` | Create a canvass session for a ward with a team |
| `get_field_summary` | `canvassing:read` | Active shifts today, total door attempts, lit drop runs, open follow-ups |
| `get_shift_status` | `canvassing:read` | Today's shifts with door counts, assignments, and lead names |
| `get_lit_drop_progress` | `canvassing:read` | Total lit drop runs, active/completed, deliveries recorded, inaccessible buildings |

---

## Domain: Finance & Donations

| Tool | Permission | What it does |
|------|-----------|--------------|
| `get_donation_summary` | `donations:read` | Total raised, donor count, average donation, top donors |
| `log_donation` | `donations:write` | Log a donation with amount, method, and donor name |
| `get_finance_summary` | `budget:read` | Budget, spent, raised, pledged, net position, funding gap |
| `get_budget_alerts` | `budget:read` | Over-budget lines, expenses awaiting approval, missing receipts, open purchase requests |

---

## Domain: Events

| Tool | Permission | What it does |
|------|-----------|--------------|
| `create_event` | `events:write` | Create an event with title, date, time, location, capacity, type |

---

## Domain: Communications

| Tool | Permission | What it does |
|------|-----------|--------------|
| `draft_email` | `email:write` | Creates a draft notification with purpose, tone, and audience — navigates to /communications to edit and send |
| `draft_social_post` | `social:write` | Creates a draft social post for a platform — navigates to /communications/social |
| `send_team_alert` | `notifications:write` | Sends a push notification to the full team |

---

## Domain: QR Codes

| Tool | Permission | What it does |
|------|-----------|--------------|
| `create_qr_codes` | `qr:write` | Create 1–30 QR codes with labels, funnel type, and placement type |
| `get_qr_stats` | `qr:read` | Total codes, active codes, total scans, top performers |

---

## Domain: Security & Admin

| Tool | Permission | What it does |
|------|-----------|--------------|
| `flag_suspicious_activity` | `adoni:write_tools` | Manually flag a user for suspicious questioning behaviour (auto-detection also runs every message for low-permission roles) |

---

## What Adoni Cannot Do (Gaps)

These are the highest-value gaps to fill in future sessions:

| Gap | Priority | Why It Matters |
|-----|----------|----------------|
| `send_email_blast` | P0 | Most-requested action. Adoni can draft but not send. Blocked on Resend integration. |
| `send_sms_blast` | P0 | Same — draft only. Blocked on Twilio integration. |
| `get_contact_tags` | P1 | Can add/remove tags but can't list what tags a contact has |
| `list_all_tags` | P1 | Can't show the full tag library for a campaign |
| `schedule_task` | P1 | Can create tasks but can't set them for a future date with auto-assignment |
| `create_canvass_list` | P1 | Can segment contacts into lists but can't create a targeted subset by name |
| `search_events` | P2 | Can create events but can't search/list them |
| `get_donation_history` | P2 | Can summarize but can't show line-by-line donor history |
| `remove_contact` | P2 | Can't soft-delete a contact via Adoni |
| `reassign_task` | P2 | Can't change the assignee of an existing task |
| `get_sign_detail` | P2 | Can summarize signs but can't look up a specific sign's full history |

---

## Auto-Execute Gate

Write tools require `autoExecuteEnabled: true` on the campaign (set in Campaign Settings → Adoni).

If auto-execute is off, Adoni describes what it would do but does not execute. This is a deliberate safety feature — a canvasser role should not be able to trigger mass operations through chat.

**Read tools always execute regardless of the auto-execute setting.**

---

## Trust Levels

Adoni's personality and detail level adapts to the user's trust tier:

- **Tier 1 (Founder/Admin):** Full capability, direct, assumes expertise
- **Tier 2 (Manager):** Full capability, slightly more guided
- **Tier 3 (Volunteer Leader):** Read + limited write, explains actions
- **Tier 4 (Canvasser/Volunteer):** Read-only visible tools, suspicious activity detection active

---

## Adding a New Tool (Checklist)

1. Add tool definition to `ADONI_TOOLS` array (before `];` at line ~628)
2. Add `toolName: "permission:scope"` to `TOOL_REQUIRED_PERMISSION` (before `};`)
3. Add `case "toolName": return await myExecutor(input, ctx);` to the switch
4. Write the executor: `async function myExecutor(input, ctx): Promise<ActionResult>`
   - Always scope queries by `ctx.campaignId`
   - Always add `deletedAt: null` on soft-delete models
   - Always log to `activityLog` with `.catch(() => {})`
   - Return `{ success, message, data }` — message is what Adoni says to the user
5. Run `npm run build` — exits 0
6. Update this file (add to domain table, remove from gaps list if applicable)
