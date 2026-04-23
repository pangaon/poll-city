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
  { id: "tasks", label: "Tasks & Accountability", emoji: "✅" },
  { id: "finance", label: "Finance & Funding", emoji: "🏦" },
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

  // ── New articles — April 2026 features ───────────────────────────────────────

  {
    id: "adoni-2",
    slug: "adoni-voice-and-file-upload",
    category: "getting-started",
    title: "Using voice input and file upload with Adoni",
    excerpt: "Speak to Adoni instead of typing, and upload CSVs to bulk-add volunteers — no keyboard required.",
    keywords: ["adoni", "voice", "microphone", "file upload", "csv", "volunteers", "speech"],
    body: `Adoni supports two time-saving input methods beyond typing: voice dictation and file upload.

## Voice input

Click the microphone icon in the Adoni message bar. Speak naturally — Adoni transcribes your words in real time and fills the input box. Click the mic again to stop and send, or keep speaking to add more.

Voice input works in Chrome and Safari on any device. It uses your browser's built-in speech recognition — no API key, no cost, no data sent to a third party.

What it's good for: hands-free strategy questions while reviewing your map, quick field updates when you're between doors, and dictating long instructions without hunting for keys on a phone screen.

## File upload

Click the paperclip icon to attach a file to your message.

**CSV files** are parsed automatically. If your file looks like a volunteer list — columns for name, email, phone — Adoni reads it and prompts you to confirm bulk-adding everyone to your campaign. A 40-person volunteer CSV becomes 40 VolunteerProfile records in one shot.

**Text files** are forwarded to Adoni as context. Paste briefing notes, a voter file excerpt, or a list of addresses — Adoni reads the content and works with it.

## Tips

- For CSV uploads, column names don't need to be perfect. Adoni recognises common variants: firstName / first / fname, email / emailAddress, phone / cell / mobile.
- If your voice isn't being picked up, check that your browser has microphone permission (usually a lock icon in the address bar).
- You can combine voice and file: attach a CSV, then dictate "add all of these as volunteers for Saturday's canvass shift."`,
  },

  {
    id: "adoni-3",
    slug: "adoni-command-centre",
    category: "getting-started",
    title: "AI Assist — the Adoni Command Centre",
    excerpt: "A dedicated workspace for deep campaign strategy sessions with Adoni — with category shortcuts, voice, file upload, and your full campaign context loaded.",
    keywords: ["ai assist", "adoni", "command centre", "strategy", "prompt bank", "voice"],
    body: `The AI Assist Command Centre at /ai-assist is a dedicated page for longer, more focused conversations with Adoni. It has everything the panel chat has, plus a full-screen layout and a library of pre-built prompts organised by campaign function.

## Five category prompt banks

At the top of the page you'll find five categories:

- **Field** — turf coverage, canvassing efficiency, door targets, volunteer deployment
- **Comms** — message strategy, email blast timing, social media, media relations
- **Strategy** — voter coalition analysis, priority neighbourhood decisions, final week planning
- **Finance** — fundraising projections, expense tracking, donor outreach, compliance questions
- **Volunteers** — recruitment, scheduling, retention, recognition, skill matching

Click any category to see a set of prompt shortcuts. Click a prompt to pre-fill the message box — then customise it or send as-is.

## Full campaign context

Adoni loads your campaign data at the start of every Command Centre session: contact count, support breakdown, days to election, doors knocked, volunteer roster, sign inventory, recent activity. You don't need to brief him — he already knows where you stand.

## Voice and file upload

Both are available in the Command Centre, same as the main panel. The mic button and paperclip are in the message bar. Use them the same way.

## When to use the Command Centre vs the panel

Use the **floating panel** (Ask Adoni button) for quick questions while you're working on another page — checking a contact, reviewing your task list, mid-canvass.

Use the **Command Centre** (/ai-assist) for longer strategy conversations, when you want to upload files, or when you want to use a structured prompt from the category banks.`,
  },

  {
    id: "tasks-1",
    slug: "tasks-campaign-accountability",
    category: "tasks",
    title: "Tasks — your campaign accountability board",
    excerpt: "Tasks is not a to-do list. It is a full campaign accountability engine with categories, kanban board, resolution tracking, and an Adoni follow-up loop.",
    keywords: ["tasks", "accountability", "kanban", "resolve", "follow-up", "recurring", "playbook"],
    body: `The Tasks module at /tasks is rebuilt from the ground up. Every task on a real campaign has a type, a resolution, and a follow-up — and now the platform tracks all three.

## Categories

Every task belongs to one of five categories:
- **Admin** — scheduling, logistics, coordination
- **Field** — door knocking, sign installs, event setup
- **Comms** — drafts, approvals, social media, press
- **Finance** — expense approvals, donor follow-ups, reporting
- **Volunteers** — recruitment, scheduling, recognition

Filter the task list by category using the tabs at the top.

## Creating tasks fast

The quick-add bar is always visible at the top. Type 3+ characters and press Enter to create a task instantly — no modal, no form. Press N from anywhere on the page to focus the quick-add bar.

Smart due date shortcuts appear in the create form: Today, Tomorrow, +3 days, This Friday, +1 week, +2 weeks. Click once to set the date.

## Resolving tasks

Every task has a **Resolve** action instead of a simple checkmark. When you resolve a task, you pick what actually happened:

- Met In Person
- Left Voicemail
- Email Sent
- Recruited
- Not Reached
- Blocked
- Completed
- Followed Up
- Referred
- No Action Needed

The resolution gets logged, and if the task is linked to a contact, an interaction is automatically recorded on their profile.

## Adoni follow-up loop

After you resolve a task, Adoni's panel slides in with a contextual suggestion based on what happened. Left a voicemail? He suggests a follow-up call in 3 days and offers to create it for you. Met the person in person? He asks what the next step is. Accept his suggestion with one click to auto-create the follow-up task linked to the original.

## Recurring tasks

Check the "Recurring" box on any task and set a frequency: weekly, biweekly, or monthly. When you complete the task, the next instance is automatically created with the correct due date.

## Campaign Playbook

Click the Playbook button to import pre-built task sets:
- **Early Campaign** (8 tasks) — voter file import, canvassing setup, volunteer recruitment
- **Field Ops** (7 tasks) — turf assignments, canvassing goals, sign deployment
- **GOTV** (6 tasks) — final voter contact, election day logistics, scrutineer assignments

These are the task sets that winning campaigns run. Import them and work through them.

## Kanban board

Toggle to Board view to see your tasks in a classic kanban layout: To Do and In Progress columns. Drag cards or click to move them between columns.`,
  },

  {
    id: "tasks-2",
    slug: "task-health-and-urgency",
    category: "tasks",
    title: "Task health stats and urgency escalation",
    excerpt: "The stats bar shows overdue and urgent counts at a glance, and overdue tasks get a pulsing flame so nothing slips through.",
    keywords: ["tasks", "overdue", "urgent", "health", "escalation", "badge"],
    body: `The Tasks module tracks urgency automatically so you don't have to.

## Task Health Stats bar

At the top of the task list, four animated counters give you the state of your campaign at a glance:
- **Active** — tasks currently open
- **Overdue** — past their due date with no resolution
- **Urgent** — due within 24 hours
- **In Progress** — actively being worked on

The stats bar hides automatically when you have no tasks.

## Urgency badges

Every task row shows its urgency inline:
- A pulsing flame and "Overdue" in red if the task is past due
- A pulsing clock and "Due in Xh" if the deadline is within 24 hours

These are visible on every view — list, board, and My Tasks.

## Sidebar badge

The Tasks entry in the sidebar shows a count of your open tasks. It pulses when any task is overdue. This is always visible no matter which page you are on.

## Bulk actions

Hover any task row to reveal a checkbox. Select multiple tasks to get the floating action bar: Complete, Delete, or Reassign. Use bulk complete at the end of a canvass shift to close out field tasks fast.`,
  },

  {
    id: "signs-2",
    slug: "sign-field-ops-and-history",
    category: "signs",
    title: "Sign field ops — logging actions and viewing history",
    excerpt: "Every sign install, removal, damage report, and repair gets logged with GPS and a timestamp. View the full event timeline for any sign.",
    keywords: ["signs", "field ops", "install", "remove", "damage", "history", "gps", "event log"],
    body: `The Signs module tracks not just where your signs are — it tracks everything that happens to them. Every action is logged with GPS coordinates, a timestamp, and the name of the person who took the action.

## Logging a sign action

From /signs, click any sign row to open the sign detail. You'll see two buttons:

**Log Action** — opens a mobile-friendly action sheet with these options:
- Install — mark a new sign as physically installed at the location
- Remove — remove a sign from a location (end of campaign, request, damage)
- Damage Report — flag that the sign was damaged or vandalized
- Missing — report a sign that was confirmed installed but is now gone
- Repair — log that a damaged sign was repaired or replaced
- Audit — note that you drove by and confirmed the sign is still up

After selecting the action type, you can add notes (e.g. "leaning slightly, may need stake reinforcement") and the GPS coordinates are captured automatically from your device.

## Viewing sign history

Click the **History** button on any sign to open the event timeline. You'll see every logged action in reverse-chronological order, with:
- Action type (Install / Damage / Audit / etc.)
- Who took the action
- When it happened
- GPS coordinates with a small map preview
- Any notes they added

This is useful for accountability (did the volunteer actually install this sign?) and for tracking problem locations (signs on a particular corner that keep getting taken down).

## Sign status

A sign's status updates automatically when you log certain actions:
- Log Install → status becomes "Installed"
- Log Damage → status becomes "Damaged"
- Log Missing → status becomes "Missing"
- Log Remove → status becomes "Removed"
- Log Repair → status returns to "Installed"

The status is visible on the sign list and the signs overlay on the Ontario Map.

## Tips
- Photograph damaged signs before removing them — useful for complaint reports
- Use the Audit action on a weekly drive-around so you always know your active sign inventory
- Signs flagged Missing automatically appear on your coordinator's list for follow-up`,
  },

  {
    id: "finance-1",
    slug: "funding-sources",
    category: "finance",
    title: "Funding sources — tracking money by source",
    excerpt: "Create a funding source for each pool of money your campaign uses — donations, grants, personal contributions — and track every credit and debit against it.",
    keywords: ["finance", "funding", "source", "ledger", "credit", "debit", "budget", "revenue"],
    body: `Funding Sources let you track where your campaign money comes from and how it moves. Think of each funding source as a named ledger.

## What is a funding source?

A funding source is a named pool of funds with a balance you track. Examples:
- "Individual Donations" — money raised from individual donors
- "Candidate Contribution" — the candidate's own contribution to the campaign
- "Fundraising Events Q1" — proceeds from a specific event
- "Digital Fundraising" — online donations

You can have as many funding sources as your campaign's finances require.

## Creating a funding source

Go to Finance → Funding Sources → Add Source. Enter:
- **Name** — what to call this pool
- **Description** — a note for your records (not shown publicly)
- **Type** — Donation / Contribution / Transfer / Grant / Other
- **Initial balance** — starting amount if you are importing existing data

## Ledger view

Click any funding source card to open its ledger. You'll see every transaction — credits (money in) and debits (money out) — in reverse-chronological order with running balance.

Add transactions directly from the ledger:
- **Credit** — money received (e.g. a batch of donations deposited)
- **Debit** — money spent from this source (e.g. a print shop payment)

Each transaction records the amount, date, a description, and the person who entered it.

## Why use funding sources instead of just tracking donations?

Funding sources give you a clear picture of campaign liquidity by category. On election finance reporting day, you'll know exactly how much came from individual donors vs the candidate's own money vs event proceeds — and you'll have the line-item backup for every figure.`,
  },

  {
    id: "finance-2",
    slug: "vouchers-volunteer-incentives",
    category: "finance",
    title: "Vouchers — rewarding volunteers and tracking redemptions",
    excerpt: "Create vouchers for volunteer recognition — coffee, campaign merch, event tickets — and track when they're redeemed and by whom.",
    keywords: ["vouchers", "volunteers", "incentives", "recognition", "redeem", "reward"],
    body: `Vouchers give you a structured way to offer and track volunteer incentives — without handing out cash or running a manual spreadsheet.

## What a voucher is

A voucher is a named, trackable reward with a defined value and redemption conditions. Examples:
- "Tim Hortons gift card — $10" — reward after completing 5 canvass shifts
- "Campaign merch pack" — reward for recruiting 3 new volunteers
- "VIP event ticket" — reward for top canvassers in final 2 weeks

## Creating a voucher

Go to Finance → Vouchers → Create Voucher:
- **Name** — what the reward is
- **Value** — dollar value or description
- **Total quantity** — how many you have to give out
- **Redemption condition** — the milestone that earns it
- **Expiry date** — when they must be redeemed by

## Issuing and redeeming

From the voucher detail panel, you can:
- **Issue** — assign a voucher to a specific volunteer (they appear by name and contact record)
- **Redeem** — mark a voucher as redeemed when the volunteer collects their reward
- **View history** — see who has been issued vouchers and who has redeemed them

## The status flow

Every voucher moves through: Active → Issued → Redeemed (or Expired).

The summary strip at the top of the Vouchers page shows total Active, Issued, Redeemed, and Expired counts at a glance. Your finance team can account for the total liability (issued-but-not-yet-redeemed) at any point.

## Why this matters for Ontario campaign finance

Any non-cash consideration given to volunteers is a campaign expense. Vouchers give you the paper trail: who received what, when, and whether it was redeemed. That documentation goes in your Election Finances Statement.`,
  },

];

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
