# Field Ops Command Center — Full End-State Figma Prompt
**Created:** April 16, 2026 | **Purpose:** Complete design brief for the Field Operations Control Center page — full vision, all tabs, all modules.

Paste this verbatim into Figma AI (Make Designs) or hand to a designer as the brief.

---

```
Design a complete, enterprise-grade web application page for "Poll City — Field Operations Command Center". This is the unified field execution operating system for Canadian political campaigns. Show the full end-state — every tab fully designed, not stubs.

─────────────────────────────────────────────────────────
DESIGN SYSTEM
─────────────────────────────────────────────────────────

Canvas: 1440px wide, desktop-first. Also provide a 390px mobile viewport for the header and dashboard tab.

Colour palette:
  Navy #0A2342 — primary, headings, active states
  Green #1D9E75 — success, completion, positive metrics
  Amber #EF9F27 — warnings, in-progress, attention
  Red #E24B4A — alerts, danger, overdue, no-shows
  White #FFFFFF — panel backgrounds
  Gray-50 #F9FAFB — page background
  Gray-200 #E5E7EB — borders
  Gray-500 #6B7280 — secondary text
  Gray-400 #9CA3AF — tertiary text

Typography: Inter. H1 = 20px bold Navy. H2 = 16px semibold Navy. Body = 14px Gray-700. Label = 12px semibold Gray-500 uppercase tracking-wide. Stat = 28px bold Navy.

Components in scope: pill badges, stat cards, table rows with hover states, side drawer panels, chip filters, icon buttons, form modals, progress bars, mini maps (blue polygon placeholder), empty states, tag chips, timeline rows.

Animation callouts (label only — don't animate in static mockup): spring transitions between tabs (opacity + y:6px slide), hover scale 1.02 on clickable cards.

─────────────────────────────────────────────────────────
PAGE STRUCTURE
─────────────────────────────────────────────────────────

The page has two zones:
  1. STICKY HEADER — white, border-bottom, full width
  2. PANEL AREA — gray-50 background, scrollable, max-width 1536px centered

─────────────────────────────────────────────────────────
ZONE 1 — STICKY HEADER
─────────────────────────────────────────────────────────

Left: Icon (map-pin, Navy) + "Field Operations" H1 + subtitle "Ward 3 — Riverdale East Campaign" Gray-500 14px
Right: "Master Control" chip (Map icon + text, Gray-400, 12px) | Notification bell with Red badge "4" | User avatar

Below the title: horizontal scrollable tab bar with these 13 tabs, each with icon + label:

  [LayoutDashboard] Dashboard  ← active tab (Navy underline, 2px)
  [FolderKanban] Programs
  [Route] Routes
  [MapPinned] Turf
  [PersonStanding] Runs
  [Footprints] Lit Drops
  [SignpostBig] Signs
  [Users] Teams
  [Package] Materials
  [Bell] Follow-Ups  ← badge "12" Red
  [Target] GOTV  ← badge "NEW" Green
  [Smartphone] Mobile
  [Activity] Audit

Inactive tabs: Gray-500 text, no underline. Hover: Gray-700. Active: Navy text + 2px Navy bottom border.

─────────────────────────────────────────────────────────
ZONE 2A — DASHBOARD TAB (shown as default active panel)
─────────────────────────────────────────────────────────

Section 1 — TODAY AT A GLANCE (full-width bar, white bg, border-bottom)
A horizontal strip with these live stats, each with icon + number + label, separated by vertical dividers:

  [Door] 847  Doors Assigned Today
  [Footprints] 412  Doors Attempted
  [UserCheck] 178  Contacts Made
  [ThumbsUp] 94  Supporter IDs
  [HelpCircle] 52  Undecided IDs
  [HandHeart] 8  Volunteer Interests
  [DollarSign] 3  Donor Interests
  [SignpostBig] 11  Sign Requests
  [AlertTriangle] 6  Routes Incomplete  ← Red
  [UserX] 2  No-Shows  ← Red

Section 2 — PIPELINE FLOW (below the strip, left-padded, gray-50 bg)
Label: "Field Execution Pipeline" Gray-400 uppercase 12px tracking-wide

Horizontal pipeline chips connected by right-chevrons:
  [FolderKanban] Programs → [Route] Routes → [MapPinned] Turf → [PersonStanding] Runs → [Target] GOTV
Each chip: Navy bg, white text, rounded-full, icon + label. Active chip is slightly larger.

Section 3 — MAIN STAT GRID (4 columns)
8 clickable metric cards, each: white bg, rounded-xl, border, hover shadow + Navy border.
Layout per card: icon chip (colored bg) + label top-right chevron, large number, sub-label.

  Card 1 — Programs [FolderKanban, blue bg]
    Value: 3   Sub: "8 total · 3 active"
    Clicking → Programs tab

  Card 2 — Routes [Route, indigo bg]
    Value: 24   Sub: "67% avg completion"
    Clicking → Routes tab

  Card 3 — Turf [MapPinned, green bg]
    Value: 7   Sub: "11/18 covered · 4 in progress"
    Clicking → Turf tab

  Card 4 — Runs Today [PersonStanding, amber bg]
    Value: 6   Sub: "2 active · 3 completed · 1 unfilled"
    Clicking → Runs tab

  Card 5 — Attempts [Target, purple bg]
    Value: 1,204   Sub: "canvassing contacts all-time"
    Clicking → Runs tab

  Card 6 — Lit Drops [Footprints, orange bg]
    Value: 4   Sub: "11 total · 3 completed"
    Clicking → Lit Drops tab

  Card 7 — Teams [Users, sky bg]
    Value: 5   Sub: "active field teams"
    Clicking → Teams tab

  Card 8 — Follow-Ups [Bell, red bg]
    Value: 12   Sub: "pending actions · 3 overdue"
    Clicking → Follow-Ups tab

Section 4 — EXCEPTIONS + ALERTS (below grid, 2-column)

Left column — ATTENTION REQUIRED (white card, left-border Red 3px):
  Title: [AlertTriangle Red] "Action Required" 14px semibold
  List of 4 rows:
    • "Route 7B — Danforth Ave incomplete — 3 addresses unresolved" [badge: REVISIT Amber]
    • "Volunteer Sarah Chen — no check-out after 3hr shift" [badge: NO-SHOW Red]
    • "Sign install crew — 14 signs pending, crew not assigned" [badge: UNASSIGNED Amber]
    • "Literature drop — Ward 3 South ran out mid-route, 22 doors missed" [badge: MATERIALS Red]
  Each row has a "Resolve →" button right-aligned.

Right column — QUICK ACTION (white card):
  Title: [Zap Navy] "Quick Actions" 14px semibold
  6 action buttons in 2x3 grid, each: border, rounded-lg, icon + label, hover Navy border:
    [Plus] New Run   [Route] Add Route   [MapPinned] Create Turf
    [Package] Issue Materials   [Bell] Log Follow-Up   [SignpostBig] Queue Sign Install

Section 5 — QUICK ACCESS ROW (gray-50, bottom of dashboard)
Label: "All Sections" 12px Gray-400 uppercase
Horizontal scroll of pill buttons: Signs · Materials · Mobile · Audit · GOTV · Teams

─────────────────────────────────────────────────────────
ZONE 2B — PROGRAMS TAB PANEL
─────────────────────────────────────────────────────────

PageHeader: "Field Programs" + subtitle "8 programs · 3 active" | right: [+ New Program] Navy button

Stat row (3 cards): Active: 3 / Paused: 2 / Archived: 3

Filter chips: All · Canvassing · Literature Drop · Sign Ops · GOTV · Phone

Program list — card per program:
Each card shows: Program name (bold) | Type badge (color-coded) | Status badge | Date range | Progress bar (% doors completed) | Counts: Routes · Targets · Shifts · Attempts | Created by | [View Detail →] link

Show 3 programs:
  1. "Ward 3 Doorknock — ID Pass"  CANVASSING  ACTIVE  Apr 5–May 10
     Progress bar 34% Green
     8 routes · 1,204 targets · 6 shifts · 412 attempts
  2. "Literature Blitz — South Polls"  LITERATURE_DROP  ACTIVE  Apr 12–Apr 19
     Progress bar 0% Gray
     4 routes · 847 targets · 2 shifts · 0 attempts
  3. "GOTV Final Push"  GOTV  DRAFT  Oct 20–Oct 27
     Progress bar 0% Gray (greyed card)
     0 routes · 0 targets · 0 shifts · 0 attempts

─────────────────────────────────────────────────────────
ZONE 2C — ROUTES TAB PANEL
─────────────────────────────────────────────────────────

PageHeader: "Routes" + "24 routes across 3 programs" | right: [+ New Route] button

Two sub-tabs: [List] [Map] — List active.

Filter bar: Program dropdown | Turf dropdown | Status chips: All · Draft · Active · Locked · Completed

Table headers: Route Name | Program | Turf | Ward/Poll | Stops | Doors | Est. Time | Completion | Status | Actions

3 example rows:
  Row 1: "Danforth Ave East"  Ward 3 Doorknock  Turf 4A  Poll 003  34 stops  82 doors  95 min  [████░░] 67%  [ACTIVE badge Green]  [View] [Lock] [Edit]
  Row 2: "Greenwood Cluster"  Ward 3 Doorknock  Turf 4B  Poll 007  22 stops  48 doors  55 min  [░░░░░░] 0%   [DRAFT badge Gray]   [View] [Activate] [Edit]
  Row 3: "Pape Village South"  Lit Blitz  Turf 5A  Poll 011  41 stops  103 doors  120 min  [██████] 100%  [DONE badge Navy]    [View]

Below table: density heatmap placeholder — gray box with label "Poll density map — contact count per poll" with colored circles at poll numbers.

─────────────────────────────────────────────────────────
ZONE 2D — TURF TAB PANEL
─────────────────────────────────────────────────────────

PageHeader: "Turf Management" | right: [+ Create Turf]

Top stat row: Total Turfs: 18 | Active: 7 | Covered: 11 | In Progress: 4

Two columns:
Left — TURF LIST (2/3 width):
  Table: Name | Ward | Assigned Team | Programs | Contact Density | Completion % | Status | Actions
  3 rows showing Turf 4A (67% Green bar), Turf 4B (0% Gray bar), Turf 5A (100% full Green bar)
  Each row: badge for status (in_progress Amber / planned Gray / completed Green)

Right — MAP PREVIEW (1/3 width):
  White card, rounded-xl, border
  Title: "Ward 3 Turf Map"
  Placeholder: Navy polygon shapes on light gray background representing turf boundaries
  Legend: ● Active ● Planned ● Complete
  Mini stat: "18 turfs · 3,204 targets"

─────────────────────────────────────────────────────────
ZONE 2E — RUNS TAB PANEL (Canvassing Shifts)
─────────────────────────────────────────────────────────

PageHeader: "Canvassing Runs" | right: [+ New Run]

Two sub-tabs: [All Runs] [Today]

Stat row: Scheduled Today: 6 | Active Now: 2 | Completed: 14 | Unfilled: 1

Kanban-style board (4 columns, horizontal scroll):
  Column "Scheduled" (Gray header): 2 shift cards
  Column "In Progress" (Amber header): 2 shift cards
  Column "Completed" (Green header): 3 shift cards
  Column "Cancelled" (Red header, muted): 1 shift card

Each shift card:
  Title (bold) + Type badge (DOOR_TO_DOOR / PHONE_CANVASS)
  Date + Time range
  Meeting point address
  Lead: [Avatar] Name
  Volunteers: [Avatar stack] 4/6 assigned | [+2 needed] Amber chip if unfilled
  Route: [Route icon] Route name
  Turf: [Map icon] Turf name
  Attempts: 82 | Contacts: 34 | Supporters: 18
  Progress bar for route completion
  [View Detail →]

Script section (below kanban, white card):
  Title: "Script Packages"
  2 script cards: "Ward 3 ID Script — v2" [CANVASSING badge] | "Persuasion Follow-Up Script" [PERSUASION badge]
  Each shows: last updated date, assigned shifts count, [View Script] button

─────────────────────────────────────────────────────────
ZONE 2F — LIT DROPS TAB PANEL
─────────────────────────────────────────────────────────

PageHeader: "Literature Drops" | right: [+ Plan Lit Drop]

Stat row: Total: 11 | Active: 4 | Completed: 3 | Planned: 4

Table: Name | Program | Route | Date | Volunteers | Qty Planned | Qty Issued | Qty Dropped | Qty Returned | Efficiency % | Status | Actions

3 rows:
  "South Polls Blitz — Run 1"  Lit Blitz  Pape Village South  Apr 12  3 vols  450  450  397  42  88%  [IN PROGRESS Amber]  [View] [Edit]
  "Danforth Corridor Drop"  Lit Blitz  Danforth Ave East  Apr 13  2 vols  280  0  0  0  —  [SCHEDULED Gray]  [View] [Edit]
  "Riverdale Central Drop"  Lit Blitz  Greenwood Cluster  Apr 11  4 vols  380  380  380  0  100%  [COMPLETE Green]  [View]

Below: "Materials Efficiency" banner showing total issued, total dropped, total returned, total wasted with icon + number.

─────────────────────────────────────────────────────────
ZONE 2G — SIGNS TAB PANEL
─────────────────────────────────────────────────────────

PageHeader: "Sign Operations" | right: [+ Queue Sign Install] [Route Install Crew →]

Status pipeline (horizontal chips with arrows):
  Requested (14) → Verified (9) → Queued (7) → Assigned (5) → Out for Install (3) → Installed (41) → Exceptions (2)

Two views available: [Queue] [Board] — Board active.

Kanban board (5 columns):
  REQUESTED (Yellow): 3 sign cards
  QUEUED (Amber): 2 sign cards
  ASSIGNED (Blue): 3 sign cards
  INSTALLED (Green): 4 sign cards (with green check)
  EXCEPTIONS (Red): 1 sign card with alert

Each sign card:
  Address (bold) + sign type chip (LAWN / BALCONY / WINDOW / BOULEVARD)
  Contact name + phone
  Quantity chip: "2 signs"
  Crew assigned (or "Unassigned" amber chip)
  Status badge
  [Photo] thumbnail if installed
  [View] [Update Status] buttons

─────────────────────────────────────────────────────────
ZONE 2H — TEAMS TAB PANEL
─────────────────────────────────────────────────────────

PageHeader: "Field Teams" | right: [+ Create Team]

Stat row: Active Teams: 5 | Total Members: 23 | On Shift Today: 8

Team cards in 3-column grid, each white card:
  Team name (bold) + [Active badge Green / Inactive badge Gray]
  Lead: [Avatar] Name
  Members: [Avatar stack, max 4 shown] + "+3 more"
  Shifts this week: 3 | Attempts this week: 247
  [View Team →] link + [Assign Shift] button

─────────────────────────────────────────────────────────
ZONE 2I — MATERIALS TAB PANEL
─────────────────────────────────────────────────────────

PageHeader: "Materials & Inventory" | right: [Issue Materials] [Receive Inventory]

Two sections side by side:

Left — INVENTORY (white card):
  Table: Item | Type | On Hand | Reserved | Available | Reorder Level | Status
  Rows: "Ward 3 Palm Card" LITERATURE 2,400 / 800 / 1,600 / 500 [OK Green]
        "Lawn Sign 18x24"  SIGN       180 / 47 / 133 / 50  [LOW Amber]
        "Door Hanger"      LITERATURE 600 / 0 / 600 / 200   [OK Green]
        "Stake — Metal"    SIGN       95 / 47 / 48 / 50     [LOW Amber — reorder trigger icon]

Right — ISSUED TODAY (white card):
  Timeline of issue events:
    10:32am — "3 packets issued to Team A (Danforth Run)" — 90 palm cards, 0 signs
    9:15am — "Sign install kit issued to Crew B" — 12 signs, 12 stakes, ties
  Footer: "Total issued today: 102 palm cards · 12 signs · 12 stakes"
  [Not returned: 3 packets] [Red flag link]

─────────────────────────────────────────────────────────
ZONE 2J — FOLLOW-UPS TAB PANEL
─────────────────────────────────────────────────────────

PageHeader: "Follow-Up Actions" | right: [+ Log Follow-Up]

Filter chips: All · Sign Request · Donor Interest · Volunteer Interest · Revisit · Bad Data · GOTV · Building Retry

Stat row: Total: 47 | Pending: 12 | Overdue: 3 | Completed Today: 8

Table: Type | Contact | Triggered By | Due | Assigned To | Priority | Status | Actions

4 rows:
  SIGN_REQUEST | Jane Morrison | Field Attempt Apr 9 | Apr 12 | Sarah Chen | HIGH | PENDING [View] [Complete]
  DONOR_INTEREST | Tom Russo | Field Attempt Apr 8 | Apr 11 | Unassigned | MED | OVERDUE Red [Assign] [View]
  VOLUNTEER_INTEREST | Priya Nair | Field Attempt Apr 10 | Apr 13 | Mike S. | MED | PENDING [View] [Complete]
  REVISIT | 44 Dundas St E #402 | Route incomplete Apr 9 | Apr 12 | Unassigned | LOW | PENDING [Assign]

─────────────────────────────────────────────────────────
ZONE 2K — GOTV TAB PANEL (Phase 9 — future state, NEW badge)
─────────────────────────────────────────────────────────

PageHeader: "GOTV Operations" [NEW badge Green] | subtitle: "Election Day: October 27, 2026 — 198 days"

Countdown bar: Days remaining displayed prominently in a Navy banner with days/hours/minutes chips.

Four GOTV stat cards:
  GOTV Targets: 2,847 | Contacted: 412 (14%) | Confirmed Vote: 203 | Outstanding: 2,435

Target tier cards (3 columns):
  Tier 1 — CONFIRMED SUPPORTERS (Green left-border): 203 contacts — "Strike off list as voted"
  Tier 2 — SOFT SUPPORTERS (Amber left-border): 847 contacts — "Persuasion + GOTV messaging needed"
  Tier 3 — HIGH PRIORITY UNDECIDED (Red left-border): 312 contacts — "Urgent revisit · door + phone"

Urgency queue (white card, full width):
  "High Priority GOTV Revisit Queue — 312 targets"
  Table: Address | Contact | Last Touch | Outcome | Priority | Assigned | Action
  3 rows with [Assign to Run] button each.

Strike-off integration note (blue info card): "Integrate with Elections Ontario strike-off list on election day. Import voter check-ins from poll scrutineers."

─────────────────────────────────────────────────────────
ZONE 2L — MOBILE TAB PANEL
─────────────────────────────────────────────────────────

PageHeader: "Mobile Field View" | subtitle: "Active shifts visible to volunteers on app"

Side by side:
  Left (2/3): Active Shifts table — Name / Type / Lead / Volunteers Checked In / Route / Status
  Right (1/3): Mobile preview mockup — show a 390px phone frame wireframe:
    Header: "My Shift — Danforth Ave East"
    Next target address card
    One-tap outcome buttons: [✓ Home] [✗ No Answer] [★ Supporter] [? Undecided]
    Progress: "34/82 doors"
    [Check Out] button at bottom

─────────────────────────────────────────────────────────
ZONE 2M — AUDIT TAB PANEL
─────────────────────────────────────────────────────────

PageHeader: "Field Audit Log" | subtitle: "Immutable record of all field actions"

Filter bar: Date range | Action type | User | Entity type

Timeline (white card):
  Each row: [Timestamp] [User avatar + name] [Action chip] [Entity description] [IP / device]

4 example rows:
  2026-04-11 10:34  Sarah Chen  [SHIFT_CREATED]  "Danforth Run — Apr 12"  mobile-app
  2026-04-11 09:15  Mike S.     [MATERIALS_ISSUED]  "90 palm cards → Team A"  desktop
  2026-04-11 08:52  Admin       [ROUTE_LOCKED]  "Pape Village South"  desktop
  2026-04-10 17:30  Sarah Chen  [ATTEMPT_LOGGED]  "44 Dundas E — Supporter"  mobile-app

─────────────────────────────────────────────────────────
SIDE DRAWER (appears on top of any tab when "View Detail" clicked)
─────────────────────────────────────────────────────────

Show one example drawer open over the Routes tab:
  Width: 480px, slides in from right, backdrop-blur overlay on left
  Header: [X close] "Route Detail — Danforth Ave East" | [Edit] [Lock] buttons
  Body sections:
    Status + completion progress bar
    Program + Turf links (clickable chips)
    Stats: Stops / Doors / Est. Time / Attempts / Completion %
    Volunteer assignment: [Avatar] list of assigned people
    Notes text area
    Audit trail (last 3 events)
  Footer: [Mark Complete] Navy button | [Reassign Turf] Ghost button

─────────────────────────────────────────────────────────
CREATE MODAL (appears floating)
─────────────────────────────────────────────────────────

Show one example modal open: "New Canvassing Run"
  Width: 560px, centered, white, rounded-xl, shadow-xl
  Fields: Run Name | Type dropdown | Program dropdown | Date picker | Start/End time | Meeting point | Max capacity | Lead volunteer (searchable) | Route (dropdown) | Turf (dropdown) | Notes
  Footer: [Cancel] [Create Run Navy button]

─────────────────────────────────────────────────────────
MOBILE VIEWPORT (390px) — Dashboard only
─────────────────────────────────────────────────────────

Header: stacked — title + subtitle + hamburger menu icon (tabs hidden, accessible via hamburger)
Today's stats: horizontal scroll strip of 5 mini stat chips (icon + number)
Pipeline chips: horizontal scroll, same chips as desktop
Stat grid: 2 columns instead of 4
Alerts: full-width stacked cards
Quick actions: 2x3 grid of icon-only buttons with labels below

─────────────────────────────────────────────────────────
VISUAL HIERARCHY NOTES
─────────────────────────────────────────────────────────

Badge colours:
  ACTIVE / COMPLETE / INSTALLED / OK → Green #1D9E75 bg-green-100 text-green-800
  IN PROGRESS / ASSIGNED / SCHEDULED → Amber #EF9F27 bg-amber-100 text-amber-800
  DRAFT / INACTIVE / REMOVED → Gray bg-gray-100 text-gray-600
  OVERDUE / NO-SHOW / ALERT / LOW → Red #E24B4A bg-red-100 text-red-800
  LOCKED / GOTV / SPECIAL → Navy #0A2342 bg-blue-100 text-blue-900

Progress bars: Green fill, Gray-100 track, rounded-full, height 6px.

Clickable cards: white bg, 1px Gray-200 border, rounded-xl, hover = Navy border + sm shadow.

Tabs: horizontal scroll on overflow, no wrapping, active = 2px solid Navy bottom border.

Empty states: centered illustration placeholder (dashed border box) + heading + sub + CTA button.

Tables: striped rows (even = white, odd = Gray-50), sticky thead with Gray-100 bg, row hover = blue-50.

─────────────────────────────────────────────────────────
DELIVERABLES REQUESTED
─────────────────────────────────────────────────────────

1. Desktop 1440px — Dashboard tab (full detail as above)
2. Desktop 1440px — each remaining tab (Programs, Routes, Turf, Runs, Lit Drops, Signs, Teams, Materials, Follow-Ups, GOTV, Mobile, Audit) — show populated state, not empty
3. Desktop — Side drawer open over Routes tab
4. Desktop — Create Run modal open
5. Mobile 390px — Dashboard tab only
6. Component sheet — all badge variants, stat card, pipeline chip, table row, shift card, sign card, drawer header — isolated

Do NOT use placeholder Lorem Ipsum. Use realistic Canadian political campaign data (Ward 3 Riverdale East, Toronto ward names, Canadian names). All numbers should be internally consistent across tabs (e.g. the 24 routes on Dashboard match the 24 rows on Routes tab).
```

---

## Source context

This prompt was generated from:
- `src/app/(app)/field-ops/field-ops-client.tsx` — 13-tab shell, all dynamic imports, dashboard pipeline
- `src/app/(app)/field/programs/programs-client.tsx` — Program type, status, counts shape
- `src/app/(app)/field/routes/routes-client.tsx` — RouteRow type, status enums
- `src/app/(app)/field/runs/runs-client.tsx` — ShiftRow type, FieldShiftType enums
- `memory/project_field_ops_directive.md` — 10-phase full build directive, all required widgets

GOTV tab (Zone 2K) is the Phase 9 build target — not yet built in Next.js but fully specced in the directive.
