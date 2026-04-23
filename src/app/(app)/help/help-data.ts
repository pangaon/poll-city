export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  keywords: string[];
}

export const HELP_CATEGORIES = [
  { id: "getting-started", label: "Getting Started", emoji: "🚀" },
  { id: "contacts", label: "Contacts & CRM", emoji: "👥" },
  { id: "import-export", label: "Import / Export", emoji: "📥" },
  { id: "canvassing", label: "Canvassing & Turf", emoji: "🚪" },
  { id: "atlas", label: "Ontario Map", emoji: "🗺️" },
  { id: "forms", label: "Forms & Analytics", emoji: "📋" },
  { id: "gotv", label: "GOTV", emoji: "🗳️" },
  { id: "volunteers", label: "Volunteers", emoji: "🙋" },
  { id: "notifications", label: "Notifications", emoji: "🔔" },
  { id: "polls", label: "Polls", emoji: "📊" },
  { id: "signs", label: "Signs", emoji: "🪧" },
  { id: "donations", label: "Donations", emoji: "💰" },
  { id: "team", label: "Team & Permissions", emoji: "🔐" },
  { id: "billing", label: "Plans & Billing", emoji: "💳" },
  { id: "privacy", label: "Privacy & Security", emoji: "🛡️" },
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "gs-1",
    slug: "welcome-to-poll-city",
    title: "Welcome to Poll City",
    category: "getting-started",
    excerpt: "A 5-minute orientation to running a Canadian municipal campaign with Poll City.",
    keywords: ["start", "intro", "welcome", "orientation"],
    body: `Poll City is an all-in-one campaign platform for Canadian municipal elections. This guide will get you set up in under 10 minutes.

## 1. Set up your campaign
Go to Settings to confirm your campaign name, jurisdiction, candidate name, and election date. If you entered these on signup, just verify they're correct.

## 2. Import your contacts
Go to Import / Export and upload your voter file as CSV or Excel. If you have over 1,000 rows, use Smart Import at /import-export/smart-import — it uses AI to map your columns automatically.

## 3. Invite your team
Go to Settings → Team and invite your campaign manager, volunteers, and canvassers. Each role gets different permissions.

## 4. Build your first turf
Go to Canvassing → Turf Builder to create a walk list. You can split turf by ward, poll number, street range, or draw custom boundaries on the map.

## 5. Start canvassing
Use the Walk app on mobile to knock doors, record support level, and sync offline. Every interaction updates the contact's GOTV score automatically.

Need more help? Browse the articles in the sidebar or contact support@poll.city.`,
  },
  {
    id: "gs-2",
    slug: "first-week-checklist",
    title: "First week checklist",
    category: "getting-started",
    excerpt: "The 12 things every new campaign should do in their first week on Poll City.",
    keywords: ["checklist", "setup", "first week"],
    body: `Here's what successful campaigns do in their first week:

1. **Verify campaign info** (Settings) — name, jurisdiction, election date
2. **Set a primary colour** (Settings → Page Builder) for your candidate page
3. **Import your contact list** — CSV or Excel
4. **Create tags** for key issues (Transit, Housing, Environment)
5. **Invite your campaign manager** (Settings → Team)
6. **Define your turfs** (Canvassing → Turf Builder)
7. **Record your first canvassing scripts** (Canvassing → Scripts)
8. **Set up donations** (Donations page)
9. **Configure sign inventory** (Signs)
10. **Create your candidate page** (Settings → Page Builder)
11. **Share your QR code** on flyers and yard signs
12. **Announce on Poll City Social** once your page is live

Track your progress from the Dashboard.`,
  },
  {
    id: "c-1",
    slug: "understanding-support-levels",
    title: "Understanding support levels",
    category: "contacts",
    excerpt: "How to classify voters and why support levels drive everything from GOTV to walk lists.",
    keywords: ["support", "level", "supporter", "leaning", "undecided"],
    body: `Poll City uses five support levels to classify every voter:

- **Strong Support** — told you directly they're voting for you
- **Leaning Support** — seemed favourable but not committed
- **Undecided** — open to persuasion
- **Leaning Opposition** — probably voting for your opponent
- **Strong Opposition** — confirmed opponent

## Why it matters
Support levels drive:
- **GOTV scores** — strong supporters score 40 points out of 100
- **Walk list prioritisation** — you can skip strong opposition doors
- **Final week outreach** — focus on strong + leaning supporters
- **Colour coding** — left border on every contact row

## Best practice
Update support level at every contact. Canvassers should ask "On a scale of 1-5, how likely are you to vote for [candidate]?" and map:
- 5 → Strong Support
- 4 → Leaning Support
- 3 → Undecided
- 2 → Leaning Opposition
- 1 → Strong Opposition`,
  },
  {
    id: "c-2",
    slug: "gotv-score-explained",
    title: "How GOTV scores are calculated",
    category: "gotv",
    excerpt: "Understand the math behind GOTV scoring and how to use it on election day.",
    keywords: ["gotv", "score", "algorithm", "turnout", "election day"],
    body: `Your GOTV (Get Out The Vote) score predicts two things at once:
1. How likely this voter is to support you
2. How likely they are to actually vote

## The formula
- **Voting history** (40%) — did they vote in 2022, 2018, 2014?
- **Support level** (35%) — how favourable are they?
- **Engagement** (15%) — recent interactions, sign request, volunteer interest
- **Demographics** (10%) — age, ward turnout patterns

Score range: 0-100

## Priority tiers
- **Priority 1** (80-100): Confirmed supporters who always vote. Call them first on election day.
- **Priority 2** (60-79): Likely supporters who sometimes vote. Need a reminder call.
- **Priority 3** (40-59): Persuadable. Visit one more time before election day.
- **Do Not Contact** (0-39): Opposition. Don't waste resources.

## On election day
Start with Priority 1 at 8am. Work through Priority 2 by noon. Priority 3 only if you finish.`,
  },
  {
    id: "c-3",
    slug: "merging-duplicate-contacts",
    title: "Merging duplicate contacts",
    category: "contacts",
    excerpt: "What to do when the same person appears in your database twice.",
    keywords: ["merge", "duplicate", "deduplication"],
    body: `Duplicates happen when:
- You import from multiple lists
- A voter submits two different emails
- A canvasser creates a new contact instead of updating an existing one

## How Poll City finds duplicates
Smart Import automatically detects:
- **Exact matches** — same email or phone
- **Fuzzy matches** — similar name + same street (85%+ similarity)
- **Household matches** — same address, different names

## How to merge
On the duplicate review screen, you'll see side-by-side comparison. Choose:
- **Merge keeping new** — replaces old data with imported data
- **Merge keeping existing** — keeps your existing data, ignores import
- **Keep both** — imports as separate contact (not recommended for exact matches)

## What gets merged
- Email, phone, address — the newer non-empty value wins
- Tags — combined from both records
- Interaction history — preserved from both records
- Support level — the most recent wins
- Notes — combined`,
  },
  {
    id: "ie-1",
    slug: "smart-import-walkthrough",
    title: "Smart Import step by step",
    category: "import-export",
    excerpt: "The AI-powered 6-step import wizard — from upload to report.",
    keywords: ["smart import", "ai", "mapping", "csv", "excel"],
    body: `Smart Import at /import-export/smart-import handles any CSV, Excel, or TSV file, even ones with weird column names.

## Step 1: Upload
Drag your file in. Supports CSV, XLSX, XLS, TSV up to 50MB. Shows you row and column counts instantly.

## Step 2: AI Field Mapping
Claude reads your column headers and 3 sample rows, then maps them to Poll City fields automatically. You see confidence levels: 🟢 high, 🟡 medium, 🔴 low. Override any mapping by clicking the dropdown.

## Step 3: Data Cleaning
Runs automatic fixes: names capitalised properly, phone numbers normalised to +1XXXXXXXXXX, postal codes formatted A1A 1A1, emails lowercased.

## Step 4: Duplicate Detection
Checks against your existing contacts using email/phone match + fuzzy name matching. Shows side-by-side comparison to resolve each duplicate.

## Step 5: Preview
Final review. Filter by Clean / Warnings / Errors. Download as CSV before importing if you want to check outside the app.

## Step 6: Import
Runs in batches of 100 with a real progress bar. Logs everything to ImportLog for audit.

## Tips
- UTF-8 encoding is required (Excel sometimes saves as UTF-16)
- First row must be column headers
- Empty rows are skipped automatically
- Don't worry about column order — the AI figures it out`,
  },
  {
    id: "ie-2",
    slug: "specialized-exports",
    title: "Which export should I use?",
    category: "import-export",
    excerpt: "Seven specialized exports for different campaign tasks.",
    keywords: ["export", "csv", "download", "gotv", "walklist"],
    body: `Poll City offers 7 specialised exports, each built for a specific campaign task.

## All Contacts
Full data dump. Every contact, every field, every tag. Good for backup or migration.

## GOTV Priority List
Strong and leaning supporters only, sorted by support level. Use for election day phone banking.

## Walk List
Contacts in canvassing order — by street name, house number, with odd/even separated. Perfect for PDF printing.

## Signs
Every sign request and install with addresses. Track inventory and install rates.

## Donations
Ontario municipal election finance compliant format. Includes donor name, address, amount, method. Required for your Election Finances Statement.

## Volunteers
All volunteers with skills, availability, total hours logged, and active status.

## Interaction Log
Full audit trail of every door knock, phone call, email, and note. Good for team accountability.

## File naming
All exports are named with your campaign slug and today's date, e.g. \`my-campaign-gotv-2026-04-05.csv\`.

Every export is logged to ExportLog for audit compliance.`,
  },
  {
    id: "can-1",
    slug: "building-turfs",
    title: "Building canvassing turfs",
    category: "canvassing",
    excerpt: "Split your ward into manageable walk areas for volunteers.",
    keywords: ["turf", "walk list", "canvassing", "territory"],
    body: `A turf is a defined geographic area assigned to a canvasser or team for door-knocking.

## How to build a turf
Go to Canvassing → Turf Builder:
1. Name the turf (e.g. "Riverside North")
2. Choose a method:
   - **By ward** — pick a ward from dropdown
   - **By poll number** — for poll-specific targeting
   - **By street range** — e.g. Main St #100-299
   - **Draw on map** — polygon tool for custom boundaries
   - **Odd/Even** — split a street for two canvassers
3. Assign a volunteer or team
4. Click Save

## What happens next
- Contacts inside the turf boundary are auto-assigned
- The assigned canvasser sees the turf in their Walk app
- Route optimization calculates the fastest path between doors
- Completion % updates as doors get knocked

## Best practices
- Aim for ~100 doors per turf (2-3 hours of canvassing)
- Skip do-not-contact doors to save time
- Refresh turf after every import to pick up new contacts`,
  },
  {
    id: "can-2",
    slug: "mobile-canvassing-app",
    title: "Using the mobile Walk app",
    category: "canvassing",
    excerpt: "Field canvassing with offline sync, GPS, and quick data capture.",
    keywords: ["walk", "mobile", "canvassing", "app", "offline"],
    body: `The Walk app at /canvassing/walk works on any smartphone browser. No install needed.

## Features
- **Turf view** — shows your assigned contacts on a map
- **Door list** — ordered by optimal route
- **Quick capture** — tap support level, add note in 2 seconds
- **Offline sync** — works without signal, syncs when back online
- **GPS tracking** — campaign manager sees real-time canvasser locations

## How to canvass
1. Open /canvassing/walk
2. Select your assigned turf
3. Tap the first door
4. After the conversation, tap the support level (1-5 buttons)
5. Add a note if needed
6. Tap Next Door — route updates automatically

## Tips
- Enable GPS for accurate route optimization
- Say hello, introduce yourself, ask open questions
- Record support level BEFORE you leave the doorstep
- If no one's home, tap "Not Home" — you'll be routed back later`,
  },
  {
    id: "t-1",
    slug: "team-roles-explained",
    title: "Team roles and permissions",
    category: "team",
    excerpt: "What each role can do in Poll City and how to assign the right role.",
    keywords: ["team", "role", "permission", "admin", "manager", "canvasser"],
    body: `Poll City has 4 team roles. Choose the right one for each team member.

## Admin
Full access. Can invite/remove team members, change billing, delete data. Give only to the campaign manager and deputy.

## Manager
Same as Admin but can't manage team or billing. Good for coordinators who run day-to-day operations.

## Volunteer Leader
Can manage volunteers, shifts, and canvassing. Can't access donations or billing. Good for field organizers.

## Canvasser
Can see contacts and use the Walk app. Can't edit contacts or access other modules. Good for door-knocking volunteers.

## How to invite
Settings → Team → Invite member → enter email, pick role, click Send. They'll receive a sign-in email.

## How to change roles
Click the role dropdown next to any team member. Change saves immediately.`,
  },
  {
    id: "p-1",
    slug: "anonymous-polling-explained",
    title: "How anonymous polling works",
    category: "privacy",
    excerpt: "Poll City uses SHA-256 hashing to guarantee voter anonymity. Here's how.",
    keywords: ["anonymous", "polling", "privacy", "hash", "vote"],
    body: `Voters trust you with their political views. Poll City protects that trust with cryptographic guarantees.

## The promise
When a voter answers a poll on Poll City:
- Their identity is converted to a one-way SHA-256 hash
- Only the hash is stored — never their name, email, or user ID
- The hash cannot be reversed to find the voter
- They receive a receipt code to verify their vote was counted

## What this means
- **Campaigns see only totals** — you see 48% Yes / 52% No, never which voter said what
- **Poll City can't see votes either** — our engineers can't reverse the hash
- **Verification is possible** — voters enter their receipt at /verify-vote to confirm inclusion

## For voters
Learn more at /how-polling-works — a public-facing explanation of the system.

## Technical details
See docs/ANONYMOUS_POLLING_TECHNICAL.md in the code repository for the full specification.`,
  },
  {
    id: "n-1",
    slug: "sending-push-notifications",
    title: "Sending push notifications",
    category: "notifications",
    excerpt: "Reach opted-in supporters on election day with one click.",
    keywords: ["push", "notification", "subscriber", "election day"],
    body: `Push notifications let you reach voters directly on their phone or browser. No email required.

## Who receives them
Only voters who:
1. Visited your candidate page or Poll City Social
2. Clicked Allow when the browser asked about notifications
3. Opted in specifically to your campaign (CASL compliant)

## How to send
1. Go to Notifications
2. Write your message (max 200 characters)
3. Choose audience: all subscribers, supporters only, or custom filter
4. Send now, or schedule for later
5. See delivery stats immediately

## Best times to send
- Election day morning: 7am reminder
- Election day noon: urgency push
- Election day 5pm: "polls close in 3 hours"
- NOT during quiet hours (9pm-8am)

## CASL compliance
Every subscriber has explicit opt-in. Your messages must relate to the campaign they opted into. Include "unsubscribe" context in every message.`,
  },
  {
    id: "s-1",
    slug: "managing-sign-requests",
    title: "Managing lawn sign requests",
    category: "signs",
    excerpt: "Track sign requests, installs, and inventory.",
    keywords: ["signs", "lawn", "yard sign", "install"],
    body: `Lawn signs are one of your highest-impact, lowest-cost campaign assets.

## How requests come in
- Voters click Request a Sign on your candidate page
- Canvassers log requests in the Walk app
- Volunteers capture via Quick Capture

## Managing inventory
Go to Signs:
- **Requested** — waiting for install
- **Installed** — on a supporter's lawn
- **Opponent** — tracking rival campaign signs
- **Removed** — taken down (vandalism, storms, post-election)

## Route your installer
Export the Signs CSV to plan an install route. Group by street for efficiency.

## After the election
Most Ontario municipalities require sign removal within 72 hours. Export your list and dispatch removal teams immediately.`,
  },
  {
    id: "d-1",
    slug: "tracking-donations-compliantly",
    title: "Ontario-compliant donation tracking",
    category: "donations",
    excerpt: "Capture every donation with the fields required by Ontario election finance law.",
    keywords: ["donation", "finance", "compliance", "ontario", "report"],
    body: `Ontario municipal elections require strict donation reporting. Poll City tracks every required field.

## Required fields (by law)
- Donor full name
- Donor home address (street, city, province, postal code)
- Donation amount
- Donation date
- Donation method (cash, cheque, e-transfer, credit, online)

## Contribution limits (Ontario municipal)
- Individuals: $1,200 per candidate
- No corporate or union donations allowed
- Contributions must be from Ontario residents

## How to capture
Donations page → New Donation. Or Quick Capture at the door.

## Year-end report
Export Donations → generates Ontario-compliant CSV for your Election Finances Statement. Submit to your municipal clerk by the deadline (usually 90 days post-election).`,
  },
  {
    id: "gs-3",
    slug: "keyboard-shortcuts",
    title: "Keyboard shortcuts",
    category: "getting-started",
    excerpt: "Navigate Poll City without touching the mouse.",
    keywords: ["keyboard", "shortcut", "hotkey"],
    body: `Move faster with these keyboard shortcuts:

## Global
- \`/\` — Focus search
- \`g d\` — Go to Dashboard
- \`g c\` — Go to Contacts
- \`g i\` — Go to Import/Export
- \`g v\` — Go to Volunteers
- \`g w\` — Go to Walk app
- \`Esc\` — Close modal or slide-over

## Contact detail
- \`e\` — Edit notes
- \`1-5\` — Set support level (1=strong opposition, 5=strong support)
- \`t\` — Add tag
- \`n\` — Add interaction note

## Tables
- \`↑↓\` — Navigate rows
- \`Enter\` — Open contact detail
- \`Space\` — Select row for bulk action`,
  },
];

  {
    id: "atlas-1",
    slug: "ontario-map-turf-cutting",
    title: "Building turfs on the Ontario Map",
    category: "atlas",
    excerpt: "Use Quick Cut for instant turf splits or Manual Mode to hand-pick streets — then assign directly to volunteers from your campaign roster.",
    keywords: ["atlas", "map", "turf", "canvassing", "streets", "volunteer", "quick cut", "manual"],
    body: `The Ontario Map at /atlas/map is your ground-game command centre. After selecting a ward, open the Turf Builder panel on the right to deploy your canvassers.

## Quick Cut — one click, balanced turfs

Quick Cut divides your ward automatically by door count. Every canvasser gets roughly the same workload.

1. Select your ward from the map or sidebar
2. In the Turf panel, choose **⚡ Quick Cut**
3. Set the number of canvassers with the +/- buttons
4. Click **Cut Turfs**

The platform divides your ward west to east, grouping streets into equal-load turfs. A ward with 1,200 doors and 8 canvassers gives each person roughly 150 doors.

If you already have manually built turfs, Quick Cut will ask you to confirm before overwriting them.

## Manual Mode — build the exact turf you want

Manual Mode gives you full control over which streets go in each turf.

1. Switch to **✏️ Manual** tab
2. Type any street name in the search box — results filter instantly
3. Check the streets you want to include
4. Click **Create Turf from [N] streets ([X] doors)**
5. Repeat to build additional turfs

Use Manual Mode when you have local knowledge — you know that Elm Ave and Oak Dr are walkable back-to-back, but putting them with the far side of the ward would waste 20 minutes of driving.

## Assigning volunteers to turfs

Every turf card shows a volunteer assignment field. Click it to see your campaign's volunteers — pulled live from your database, with phone numbers shown.

- Type to filter by name
- Click a name to assign them to the turf
- Their phone number appears below their name so coordinators can call instantly

Volunteers assigned here are tracked in the system, not just labelled on a printout.

## Tips
- Aim for 80–120 doors per turf (2–3 hours of canvassing)
- Use Quick Cut first for a starting point, then switch to Manual to adjust borders
- The door count shown in each turf updates live as you add or remove streets`,
  },
  {
    id: "atlas-2",
    slug: "ontario-map-overview",
    title: "Ontario Map overview",
    category: "atlas",
    excerpt: "What the Ontario Map shows, how to navigate it, and what every layer means.",
    keywords: ["atlas", "map", "ward", "boundary", "contacts", "overlay", "municipality"],
    body: `The Ontario Map at /atlas/map covers all major Ontario municipalities. It shows ward boundaries, address-level canvassing data, sign locations, and your campaign's contact intelligence on a single map.

## Navigating the map

Use the sidebar on the right to select a municipality and ward. The map flies to your selection automatically. Each ward shows:
- Total addresses (doors to knock)
- Contacts in your CRM within that ward
- Canvassing coverage so far

## Contact overlay

If you have contacts in your database, the map colours each address dot by support level:
- Green — Strong Support
- Light green — Leaning Support
- Grey — Undecided or uncontacted
- Orange — Leaning Opposition
- Red — Strong Opposition
- Gold outline — already visited

This gives you an instant picture of where your support is strong and where to focus resources.

## Signs overlay

Toggle the Signs layer to see every sign request and install on the map. Use this to plan install routes and check coverage gaps by neighbourhood.

## Ward stats panel

Click any ward to see a stats summary: total contacts, support breakdown, visit count, and your campaign's penetration rate in that area.`,
  },
  {
    id: "can-3",
    slug: "canvassing-scripts-branch-logic",
    title: "Building canvassing scripts with branch logic",
    category: "canvassing",
    excerpt: "Write a conversation tree for your canvassers — so every door goes the right direction no matter what the voter says.",
    keywords: ["scripts", "canvassing", "branch logic", "talking points", "door knock", "conversation"],
    body: `Canvassing Scripts at /field-ops/scripts let you build structured talking points your canvassers follow at the door — with branches for different voter responses.

## Why scripts matter

A canvasser at the door has maybe 90 seconds. A good script:
- Opens with a warm, confident introduction
- Surfaces 2-3 key messages that resonate in your ward
- Pivots based on what the voter cares about
- Closes with a clear ask

Without a script, every canvasser is improvising. With one, you deliver a consistent message across your entire team.

## Building a script

Go to /field-ops/scripts → New Script:

1. **Opening Line** — exactly how the canvasser introduces themselves. Keep it warm and natural. "Hi, I'm here on behalf of [candidate] — do you have 30 seconds?"
2. **Key Messages** — 3–5 bullet points the canvasser should work in. These are your campaign's priority issues.
3. **Issue Responses** — pre-written answers to the most common questions or concerns you encounter at the door.
4. **Branch Logic** — conversation forks based on voter reaction. Add as many branches as you need.
5. **Closing Ask** — the exact request at the end. "Can we count on your support on October 26th?"

## Branch logic

Branch logic turns a linear script into a conversation tree. Example:

- **Voter mentions transit** → Branch: "We're committed to rapid transit expansion by 2028..."
- **Voter mentions taxes** → Branch: "Our plan keeps the tax increase below 2% while maintaining services..."
- **Voter is hostile** → Branch: "I understand — thanks for your time, here's our card."

Each branch can lead to its own closing ask, or loop back to the main script.

## Deploying scripts

Once saved, a script is available to all your canvassers in the Walk app. They see it on the contact screen before knocking. The branch buttons appear as tap targets — no memorisation required.

## Tips
- Write the opening line out loud. If it sounds robotic when you say it, rewrite it.
- Limit key messages to 3. Canvassers who try to hit 7 points lose voters at the door.
- Your issue responses should come from actual feedback you've heard while canvassing — not what you expect voters to say.`,
  },
  {
    id: "forms-1",
    slug: "creating-forms",
    title: "Creating forms and collecting responses",
    category: "forms",
    excerpt: "Build custom forms for volunteer signups, event RSVPs, issue surveys, and door-hanger reply cards.",
    keywords: ["forms", "survey", "signup", "rsvp", "collect", "responses"],
    body: `Forms at /forms let you build any data collection flow and share it as a public link, embed it in your candidate page, or hand it to canvassers to fill out at the door.

## When to use a form

- **Volunteer signup** — capture name, phone, availability, skills
- **Event RSVP** — confirm attendance, dietary needs, transportation
- **Issue survey** — find out what your ward cares about most
- **Door-hanger reply card** — voters scan a QR code and submit their feedback
- **Canvasser debrief** — end-of-day structured report from the field

## Building a form

Go to /forms → New Form:

1. **Name your form** — this appears in your forms list (voters see the Form Title field instead)
2. **Add fields** — drag in text inputs, multiple choice, checkboxes, rating scales, dropdowns
3. **Set a confirmation message** — what the respondent sees after submitting
4. **Publish** — toggle the form live to start accepting responses

## Sharing a form

Every form gets a public URL at /f/[slug] and an embed code. Share the link in an email, add it to your candidate page, or generate a QR code to print on door hangers.

## Connecting to contacts

When a form includes an email or phone field, Poll City automatically links the submission to an existing contact in your CRM — or creates a new contact if none is found.

## Tips
- Keep forms short — 5 questions or fewer for public-facing forms
- Use the Confirmation Message to tell respondents what happens next
- For door-hanger cards, use a single multiple-choice question to keep scanning fast`,
  },
  {
    id: "forms-2",
    slug: "form-results-and-analytics",
    title: "Reading your form results and analytics",
    category: "forms",
    excerpt: "Every form has a live results dashboard — submission trends, distribution charts, and full response table.",
    keywords: ["forms", "analytics", "results", "charts", "responses", "data", "survey"],
    body: `Every form you publish has a results dashboard at /forms/[id]/results. Go there any time to see how your form is performing.

## Summary cards

At the top you see four numbers at a glance:
- **Submissions** — total responses received
- **Views** — how many times the form page was opened
- **Conversion** — what percentage of viewers actually submitted
- **Fields answered** — average completion rate across all questions

A low conversion rate (views high, submissions low) usually means the form is too long or the first question is off-putting.

## Submission trend chart

A line chart shows submissions by day. Look for spikes — they often correspond to emails you sent, posts you made, or canvassing days when you handed out QR codes. Use this to know which outreach tactics are driving the most engagement.

## Per-field charts

Every question in your form gets its own chart:

- **Multiple choice / checkboxes** — horizontal bar chart showing how many people picked each option
- **Rating / scale / number** — shows average, minimum, and maximum
- **Open text** — shows the most common responses ranked by frequency
- **Yes/No fields** — bar showing the split

The answer rate bar under each field name shows what percentage of respondents filled in that question. A field with 40% answer rate may need a clearer label or be optional when it shouldn't be.

## Response table

Switch to the Responses tab to see every individual submission in a table. The first six fields appear as columns. Export the full dataset to CSV using the Export button in the top right.

## Using the data

Your form analytics answer the questions campaigns need answered:
- "What issues do our supporters care most about?" (issue survey results)
- "How many volunteers can we deploy this weekend?" (signup form count)
- "Are our door hangers generating callbacks?" (reply card conversion rate)`,
  },

  {
    id: "can-2",
    slug: "weather-for-canvassing",
    category: "canvassing",
    title: "Using the weather widget for canvassing days",
    excerpt: "See live weather and a 3-day forecast right on your Field Ops dashboard so you can plan walks before you deploy your team.",
    keywords: ["weather", "forecast", "canvassing", "field ops", "rain", "conditions"],
    body: `The weather widget lives at the top of your Field Ops dashboard (Field Ops → Dashboard tab). It gives you a live read on conditions before you send canvassers out the door.

## What it shows

- **Current temperature and condition** — pulled from your device's location in real time
- **Rain probability** — the chance of precipitation in the current hour
- **Canvassing readiness badge** — green "Good for canvassing" when skies are clear and rain probability is under 30%; amber "Check conditions" when it's not
- **3-day forecast** — click the widget to expand. See high/low temperatures and rain probability for each of the next three days

## How it works

The widget uses your browser's location (it will ask permission the first time). It calls Open-Meteo, a free public weather API — no API key required, no cost to Poll City.

If you decline location access, the widget quietly hides itself. Nothing breaks.

## How to use it on a canvass day

1. Open Field Ops before your morning briefing
2. Check the badge — green means send people out on schedule
3. If amber, expand the 3-day view and decide whether to push the shift to a better day
4. Share what you see with your volunteers at the morning standup

Rain kills door rate. A team that walks in a downpour covers half as many doors and knocks them 20% less confidently. Use this to make the call before your volunteers are already in the field.`,
  },
  {
    id: "com-2",
    slug: "comms-fatigue-guard",
    category: "notifications",
    title: "Contact fatigue guard — how Poll City protects your voters",
    excerpt: "Poll City automatically skips anyone contacted in the last 24 hours when you send an email or SMS blast, so you never spam the same person twice in one day.",
    keywords: ["fatigue", "contact frequency", "email blast", "sms", "spam", "suppress"],
    body: `Every email and SMS blast in Poll City runs a fatigue check before sending. Any contact who was reached by any channel in the last 24 hours is automatically excluded from that send.

## Why this matters

Over-messaging drives unsubscribes and CASL complaints. Voters who receive both an email and an SMS on the same day from your campaign feel harassed — not engaged. The fatigue guard prevents that without you having to think about it.

## How it works

When you send a blast, Poll City:
1. Builds your audience (with your support level, ward, and tag filters applied)
2. Applies CASL consent filter (removes contacts with express withdrawal or no consent record)
3. Applies the 24-hour fatigue check — anyone with a lastContactedAt timestamp in the past 24 hours is removed
4. Sends to the remaining list
5. Updates lastContactedAt for every contact who received the message

The API response tells you how many were suppressed: the \`fatigueSuppressed\` count shows up in your blast results.

## Cross-channel awareness

The 24-hour clock is shared across all channels. A voter who received an SMS this morning will be skipped from an email blast this afternoon, and vice versa. There is no per-channel timer — it's one timer for all.

## What "contacted" means

A contact's lastContactedAt is updated when:
- They receive an email blast
- They receive an SMS blast
- A canvasser marks a door interaction
- You log a call from the Contacts page

## Override

There is currently no override for the fatigue guard. If you need to reach someone twice in one day, do it manually through their Contact profile.`,
  },
  {
    id: "print-1",
    slug: "finding-a-print-shop",
    category: "getting-started",
    title: "Finding and quoting a print shop",
    excerpt: "Browse verified print vendors, filter by province and product type, and send a quote request directly from the directory.",
    keywords: ["print", "shop", "vendor", "quote", "lawn signs", "flyers", "door hangers"],
    body: `Poll City's Print Shop Directory lists verified campaign print vendors across Canada. You can find them at Print → Shops.

## Filters

Use the three controls at the top to narrow the list:
- **Search** — by shop name, description, or service area
- **Province** — shows shops that serve that province (Ontario, BC, Alberta, etc.)
- **Product type** — filters to shops that specialize in what you need: lawn signs, door hangers, flyers, postcards, and more

Clear all filters with the X button to see the full directory again.

## What each card shows

- **Name and verification badge** — green Verified badge means Poll City has confirmed the vendor
- **Provinces served** — where they can ship or deliver
- **Star rating and review count** — from previous campaigns
- **Average response time** — how quickly they typically reply to quote requests
- **Specialties** — the product types they focus on
- **Payment status** — Connected means they accept payment through Poll City; Pending means they're still setting up Stripe

## Requesting a quote

Every card has a **Request Quote** button. Click it to open a form:
1. Choose the product type from the dropdown
2. Enter your quantity (e.g. 500)
3. Add notes — sizes, file format, delivery deadline, colour specs
4. Click **Send Request** — this opens your email client with a pre-filled message to the shop

The shop replies directly to your campaign email. Poll City does not route or track quote conversations.

## Registering your own shop

If you run a print business that serves campaigns, click **Register as Print Shop** in the directory header to apply.`,
  },
  {
    id: "adoni-1",
    slug: "adoni-your-campaign-ai",
    category: "getting-started",
    title: "Adoni — your campaign AI assistant",
    excerpt: "What Adoni can do for you, what limits are in place, and how to get the most out of every conversation.",
    keywords: ["adoni", "ai", "assistant", "chat", "strategy", "rate limit"],
    body: `Adoni is Poll City's built-in campaign AI. You can access him from any page using the chat bubble in the bottom right, or from the AI Assist section in the sidebar.

## What Adoni can do

Adoni knows your campaign — your contact count, support levels, days to election, volunteers, doors knocked, and signs deployed. He uses that live data when he answers your questions.

He can:
- Answer campaign strategy questions ("how should I prioritize the final 10 days?")
- Help you draft messages, talking points, and scripts
- Pull up facts about your contacts and volunteers
- Tell you where your GOTV gaps are
- Suggest next actions based on where you are in the campaign calendar

## How he talks

Adoni speaks like a senior campaign manager — direct, warm, and practical. No bullet points, no markdown headers, no jargon. Maximum 8 sentences per response. Canadian English spelling.

## Rate limits

To protect your campaign's AI budget, Adoni has two limits:
- **50 conversations per hour** — resets every 60 minutes
- **100 conversations per day** — resets every 24 hours

If you hit a limit, the app will tell you to try again later. Normal campaigns never come close to these limits in a day.

## What Adoni cannot do

- Adoni cannot send emails or text messages on your behalf
- He cannot access data from other campaigns
- He cannot see your billing information
- He cannot predict election outcomes with certainty

## Tips for better answers

- Be specific: "What should I do today to close my 200-voter GOTV gap?" gets a better answer than "what should I do today?"
- Tell him the context: "I have 3 volunteers available this weekend and 4 turfs left to cover"
- If an answer is too long, say "shorter" — he'll compress it
- If you need more detail, say "expand on that"

Adoni remembers key facts and decisions from earlier in your conversation, but his memory resets when you start a new session.`,
  },

export function getArticleBySlug(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

export function getArticlesByCategory(categoryId: string): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.category === categoryId);
}

export function searchArticles(query: string): HelpArticle[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return HELP_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.body.toLowerCase().includes(q) ||
      a.keywords.some((k) => k.includes(q))
  );
}
