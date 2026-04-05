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
