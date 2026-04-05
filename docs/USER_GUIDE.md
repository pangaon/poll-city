# Poll City User Guide

## v4.0.1 CAPTCHA Protection Addendum — April 5, 2026

### Public Form Submission Security

1. Public candidate forms now require CAPTCHA verification before submission.
2. This applies to: Ask a Question, Support Pledge, Volunteer Signup, Sign Request, and Profile Claim Request.
3. If CAPTCHA fails, the form will not submit and shows a verification error.
4. Ensure Turnstile is configured in production with valid keys before launch:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
5. If keys are missing, API submissions are rejected with a clear captcha-missing message.

### Campaign Setup Wizard SOP (`/campaigns/new`)

1. Select one of the supported election types: Municipal, Provincial, Federal, By-Election, or Other.
2. For Municipal campaigns, Province and Municipality are now mandatory and validated before create.
3. If wards are available for your municipality, choose a ward for district-specific races.
4. Jurisdiction auto-fills from ward/municipality/province but can still be edited manually.
5. Party or organization entered in the wizard is saved on campaign create.

### OAuth Login Availability SOP (`/login`)

1. Google and Apple sign-in buttons now reflect real environment configuration.
2. If a provider is not configured, its button is disabled and clearly labelled unavailable.
3. If no OAuth providers are configured, the login page shows an explicit notice to use email/password.
4. This prevents failed OAuth redirects in staging or partially configured deployments.

### Social Profile Location Detection SOP (`/social/profile`)

1. Open Profile in Poll City Social.
2. The Location & riding card now displays live profile detection status.
3. If status is `Detected`, your postal code/ward/riding data is available for civic context features.
4. If status is `Needs update`, complete your profile location details to improve representative matching.


## v4.0.0 Enterprise Release SOP Addendum — April 5, 2026

### Team Management SOP (`/settings/team`)

1. Navigate to **Settings → Team** in the sidebar.
2. See every team member on this campaign with name, email, role, last login, and joined date.
3. **Invite a new member:** click **Invite member** in the top right.
4. Enter their email address and choose a role (Admin, Manager, Volunteer Leader, or Canvasser).
5. Click **Send invite** — they'll receive an email with a sign-in link.
6. **Change a role:** click the role dropdown next to any member — the change saves immediately.
7. **Remove a member:** click the trash icon — confirm to remove them from the campaign.
8. You cannot change your own role or remove yourself.
9. Only Admins can invite, change roles, or remove members.
10. The **Role permissions** table shows exactly what each role can do across all features.

### Specialized CSV Exports SOP (`/import-export`)

1. Navigate to **Import / Export** in the sidebar.
2. Find the **Specialized Exports** card.
3. Click any export button to download a CSV:
   - **All Contacts** — every contact with full details and tags
   - **GOTV Priority List** — supporters for election day phone banking
   - **Walk List** — canvassing order by street name and house number
   - **Signs** — all sign requests and installs with addresses and status
   - **Donations** — Ontario-compliant donor report with names, addresses, amounts
   - **Volunteers** — all volunteers with skills, availability, and hours
   - **Interaction Log** — every door knock, call, email, and note
4. Files are named with your campaign slug and today's date.
5. Every export is logged in ExportLog for audit compliance.

### Feature Flags & Tier Gating

1. Locked features display a lock icon with the minimum plan required.
2. Click **Upgrade Now** on any locked feature to go to billing.
3. You can always see what's locked — features are never hidden.
4. Pro unlocks: Smart Import AI, custom fields, advanced analytics, SMS, custom domain, route optimization.
5. Command unlocks: API access, white label, dedicated database.

### Error Messages SOP

1. Every error now shows: what went wrong, why, and what to do next.
2. Errors include a unique code (e.g., `IMPORT_001`) for support tickets.
3. When you see an error with a button, click it to recover (sign in, download template, etc.).
4. Network errors auto-show your data will sync when reconnected.

---

## v3.0.1 Smart Import Operations Addendum — April 5, 2026

### Enterprise Smart Import SOP (`/import-export/smart-import`)

1. Open Smart Import and upload your file (`.csv`, `.tsv`, `.txt`, `.xlsx`, or `.xls`).
2. Review AI-suggested column mappings and manually fix any incorrect fields.
3. Click **Review Import** to run cleaning and duplicate analysis before write.
4. Confirm the review summary:
   - valid rows
   - invalid rows
   - probable duplicates
   - estimated new records
5. Click **Import Contacts** to execute the campaign-scoped import.
6. After completion, confirm Imported, Updated, and Skipped counts.
7. If there are skipped rows, review the error sample and correct source data for re-import.

### Import History SOP (`/api/import/history`)

1. Query import history with campaign context using `campaignId`.
2. Confirm each entry includes filename, file type, status, row counts, and completion timestamp.
3. Use history records when reconciling CRM totals after major data loads.

## v3.0.0 Security Release SOP Addendum — April 4, 2026

### Anonymous Polling — How Your Vote Is Protected

1. When you vote on any poll, your identity is converted to a **one-way SHA-256 hash**. This hash cannot be reversed.
2. Poll City stores only the hash alongside your vote — never your name, email, or user ID.
3. After voting, you receive a **receipt code** (format: `XXXX-XXXX-XXXX`). Save this code.
4. To verify your vote was counted, visit `/verify-vote` and enter your receipt code.
5. The verification confirms your vote exists without revealing which option you chose.
6. Neither campaigns nor Poll City staff can see how you voted.
7. For full technical details, visit `/how-polling-works`.

### Vote Verification SOP (`/verify-vote`)

1. Navigate to `/verify-vote`.
2. Enter your 12-character receipt code in the format `XXXX-XXXX-XXXX`.
3. Click **Verify**.
4. If found: green confirmation — "Vote confirmed. Your vote was recorded."
5. If not found: red notice — check the code and try again.
6. Receipt codes are stored in your browser's local storage after voting.

### Rate Limiting

1. Public endpoints are now rate-limited to prevent abuse.
2. Poll voting: 5 votes per hour per IP address.
3. Form submissions (sign requests, volunteer signups, questions): 5 per hour per IP.
4. Public data reads (officials directory, geo lookup): 100 per minute per IP.
5. If you see "Too many requests," wait and try again.

---

## v2.4.0 Feature SOP Addendum - April 4, 2026

### Mission Control Dashboard SOP (`/dashboard`)

1. Open Dashboard and review the Mission Control panel directly under the war-room header.
2. Confirm the Health Gauge ring shows campaign readiness percentage.
3. Confirm Election Clock and Weather pulse are visible for field planning.
4. Review Conversion Funnel (Universe -> Supporters -> GOTV Pulled).
5. Review Sentiment Donut for Support, Undecided, and Opposition shares.
6. Verify GOTV pull-through meter updates from live GOTV records.
7. Check Canvasser Leaderboard for score and door-knock ranking.
8. Check Sign Map (By City) bars for city-level deployment pressure.

### Enterprise Analytics SOP (`/analytics`)

1. Open Analytics and confirm tab set: Overview, Canvassing, Supporters, GOTV, Signs, Volunteers, Donations, Communications, Predictions.
2. In Overview, validate campaign funnel and sentiment distribution against live totals.
3. In Canvassing, monitor follow-up backlog and persuasion universe size.
4. In GOTV, track supporters pulled, still needed, and pull progress.
5. In Signs, validate installed versus pending trends and geo context map.
6. In Communications, confirm notification delivery rate and delivery totals.
7. In Predictions, review risk flags and directional win-probability output.
8. Use Export Snapshot to download a campaign analytics CSV.

### Reports Suite SOP (`/reports`)

1. Open Reports to view executive snapshot metrics.
2. Click Export Executive CSV to download leadership reporting package.
3. Review audit notes for campaign-scoped export handling and retention workflow.

### Alerts SOP (`/alerts`)

1. Open Alerts to review live campaign risk detections.
2. Prioritize high-severity alerts first (follow-up backlog, GOTV pull rate).
3. Investigate medium alerts (notification quality and signage operations).
4. If no alerts are present, verify green status message before closeout.

### Compliance Snapshot SOP (`/import-export`)

1. Open Import / Export.
2. Under Export Contacts, click Compliance JSON Snapshot.
3. Store the generated snapshot in your campaign compliance folder.
4. Include snapshot artifacts in weekly governance and audit standups.

## v2.1.1 Combined Release Note — April 4, 2026

This deployment combines the latest dashboard, officials directory, and platform wiring updates into one production push.

Quick checks after deploy:

1. Verify Dashboard loads with war-room overview cards.
2. Verify Officials Directory search and profile links open correctly.
3. Verify push notification subscription setup still works in browser settings and notifications screens.

## v2.0.0 Feature SOP Addendum — April 4, 2026

### Campaign Website URL Card SOP (`/settings/public-page`)

1. Open **Page Builder** (`/settings/public-page`).
2. At the very top, before the customization panels, find the dark-blue **Your Campaign Website** card.
3. Your public URL is displayed in monospace text: `poll.city/candidates/your-slug`.
4. Click the **copy icon** inside the URL bar to copy it silently, or click the **Copy Link** button — a toast confirms "URL copied!".
5. Click **Open** to open your campaign page in a new tab without leaving settings.
6. Click **Tweet** to open a pre-filled Twitter post with your campaign URL.
7. Click **Preview** (green button) to view your live page.
8. The **QR Code** section shows a live 80×80 QR code — scan it to confirm it opens your page.
9. Click **Download PNG** to save the QR code for use on flyers, yard signs, and door hangers.

### Officials Directory SOP (`/officials`)

1. Go to `/officials` (linked from the social header navigation).
2. See the Canadian red-to-navy gradient hero with live search and level filter pills.
3. Type a name, district, or postal code into the search bar — cards filter instantly.
4. Click a level pill (Federal MP / Provincial MPP / Municipal) to narrow the list.
5. Use the province dropdown for province-level filtering.
6. Each card shows: party colour gradient, photo or initials, verified badge (if claimed), party badge, level/province badges, social icons, and "Former Member" badge if no longer active.
7. Click **View Profile** to open the official's full profile page.
8. Click **Claim Profile** (amber) to start the claim flow as an official.
9. Pagination shows 24 per page — click Next/Previous to browse all 7,000+ officials.

### Official Profile Page SOP (`/officials/[id]`)

1. From the directory, click **View Profile** on any card.
2. The party colour hero displays: photo (144px), name, title, district, party badge, level badge, and social buttons.
3. If the profile is unclaimed, an amber banner appears: "Are you [Name]? Claim this profile."
4. If claimed and verified, an emerald banner confirms verified status.
5. The stats bar shows: supporter count, active polls, elections won, and days until Oct 26, 2026.
6. Scroll down to read the official's bio (if populated).
7. The **Election History** table shows past results with win/loss badges.
8. Submit a question in the Q&A section — it goes to the official or campaign for response.
9. The sidebar shows the election countdown and Get Involved / Share buttons.

### Candidate Page Party Colours SOP (`/candidates/[slug]`)

1. Campaigns linked to an official with a known `partyName` now automatically inherit party colours for the hero gradient.
2. Liberal campaigns display a red-to-darker-red gradient; Conservative campaigns display blue-to-navy; NDP displays orange; Green displays green; etc.
3. This is a fallback only — if the campaign has a custom `primaryColor` set in Page Builder, that always takes precedence.
4. To override: go to **Page Builder → Branding → Primary Colour** and set your custom hex value.

---

## v2.1.0 Feature SOP Addendum — April 4, 2026

### Homepage Live Experience SOP (`/`)

1. Open the homepage and scroll to the Stats bar.
2. Confirm counters animate from 0 to their final values when the section enters view.
3. Confirm the Live Activity ticker rotates campaign activity every 3 seconds with a smooth fade.
4. Open the Product Demo tabs section and switch between:
   - Campaign Dashboard
   - Mobile Canvassing App
   - Poll City Social
5. Confirm each tab changes both the visual mock and description text.
6. Scroll to the urgency panel and verify the nominations countdown updates every second.

### Dashboard War-Room SOP (`/dashboard`)

1. Open Dashboard and verify the top war-room section appears above widgets.
2. Confirm greeting text references days remaining to election.
3. Review Campaign Health Score and checklist statuses.
4. Verify score color changes by threshold:
   - 0–40 red
   - 41–70 amber
   - 71–100 green
5. Confirm Election Countdown card shows days/hours/minutes.
6. Review Today's Priorities list and verify it reflects campaign data conditions.
7. Use the Quick Action tiles to jump to common workflows.
8. Confirm GOTV readiness gauge is visible in the war-room section.

## v1.9.0 Feature SOP Addendum — April 4, 2026

### Election Analytics Heat Map SOP (`/analytics`)

The Analytics page shows Ontario municipal election results from 2014, 2018, and 2022.

**Using the Choropleth Map**

1. Go to **Analytics** in the sidebar.
2. Select the **Heat Map** tab.
3. Use the **Year** filter to switch between 2014, 2018, and 2022.
4. Use the **Province** filter to narrow to Ontario or BC.
5. The top section shows a real geographic choropleth map of Ontario municipalities:
   - **Red** = close race (winner received less than 40% of votes)
   - **Blue** = moderate margin (40–60%)
   - **Navy** = dominant win (over 60%)
   - **Grey** = no election data for this boundary
6. Hover over any municipality on the map to see the winner name, vote percentage, and total votes cast.
7. The grid below the map shows the same data in tile format for easy scanning.
8. Use the **Search** bar to filter both the map overlay and the grid by municipality name.

**Note for administrators**: The choropleth map requires GIS boundary data to be loaded from Railway using `npm run db:seed:boundaries:gis`. Until this runs, the map shows a notice with instructions and the grid remains available.

---

## v1.8.0 Feature SOP Addendum - April 4, 2026

### Volunteer Onboarding SOP (`/volunteer/onboard/[token]`)

1. Create or distribute onboarding links from campaign operations.
2. Volunteer opens their secure token link.
3. Volunteer confirms name, email, and phone.
4. Volunteer sets availability and skills.
5. Volunteer selects preferred ward.
6. Volunteer reviews intro video and code of conduct.
7. Volunteer accepts code of conduct and completes onboarding.

### Volunteer Groups SOP (`/volunteers/groups`)

1. Open Volunteer Groups.
2. Create a new group with name, optional ward target, and optional leader.
3. Add volunteers to the group roster.
4. Use "Message Group" to push internal group updates.
5. Track rosters and contactability from each group card.

### Volunteer Shifts SOP (`/volunteers/shifts`)

1. Create shift records with date, time, and location.
2. Share signup links/process with volunteers.
3. Use reminders endpoint to notify signed-up volunteers.
4. Use check-in at shift start to mark attendance.

### Lookup Quick Actions SOP (`/lookup`)

1. Search voter by name or address.
2. Open contact card.
3. Use quick actions to mark supporter/soft supporter/undecided/against or add note.
4. For multi-voter addresses, use household soft-supporter action.
5. If offline, actions queue automatically and sync in background when online.
6. Use displayed language/accessibility cues to match communication style and improve doorstep accessibility.

### Turf Assignment SOP (`/canvassing/turf-builder`)

1. Create and optimize turf as normal.
2. Assign turf to a canvasser or to a volunteer group.
3. Reassign user or group as field capacity changes.

### Campaign Operations Modules SOP

1. ` /canvassing/scripts`: create and maintain script variants by use case.
2. ` /media`: log press mentions and status.
3. ` /coalitions`: track coalition partners and endorsements.
4. ` /intelligence`: record opponent intel with confidence and source.
5. ` /events`: maintain event schedule and notes.
6. ` /volunteers/expenses`: submit and review volunteer reimbursements.
7. ` /budget`: track allocations, spend, and remaining amounts by category.
8. ` /supporters/super`: maintain super-supporter list and assign special tasks.

## v1.6.0 Feature SOP Addendum — April 4, 2026

### Swipe Polls SOP (Voters — Poll City Social)

1. Open Poll City Social at `/social/polls`.
2. Use the filter tabs to narrow polls by election level: All, Municipal, Provincial, Federal, or School Board.
3. Use the search bar to find polls by question text.
4. For **Yes/No (Binary) polls**:
   - On mobile: swipe right to vote Yes, swipe left to vote No.
   - Green glow appears as you swipe right. Red glow appears as you swipe left.
   - Release when you feel the card fly off to confirm your vote.
   - On desktop: click the Yes or No button below the card.
5. For **Multiple Choice polls**: tap your preferred option directly on the card.
6. For **Slider, Ranked, or Swipe Image polls**: tap "Open Poll" to go to the full poll page.
7. After voting, a checkmark appears. Tap "Results →" to see community results with animated bars.
8. Confetti celebrates your completed vote.

### Creating a Poll — 4-Step Wizard (Campaign Staff)

1. Go to `/polls` and click **New Poll**.
2. **Step 1 — Question**: type your question (minimum 5 characters). Add an optional description. Select a poll type (Yes/No, Multiple Choice, Ranked, Slider, Swipe, Image Swipe, Emoji React, Priority Rank).
3. **Step 2 — Options**: for poll types that need choices (Multiple Choice, Ranked, Swipe, Priority Rank), add at least 2 options. Click the colour dot to pick a colour for each option. Drag up/down arrows to reorder. Click the trash icon to remove. Polls with no options (Yes/No, Slider) skip this step automatically.
4. **Step 3 — Settings**: choose visibility (Public, Campaign Only, Unlisted). Set an optional end date. Enter a target region (optional). Add comma-separated tags for filtering (e.g. "municipal, transit"). Toggle: Show Results Before End, Allow Multiple Votes, Notify Subscribers.
5. **Step 4 — Preview**: review the gradient card preview and the settings summary. Click **Publish Poll** to go live.
6. The poll appears in your polls list with a status badge (Active, Closing, Ended).

### Polls List — Campaign Staff

1. Go to `/polls` to see all campaign polls as cards.
2. Each card shows: type badge, status badge, question, option preview, response count, visibility icon, and created date.
3. Hover a card to reveal the Edit button.
4. Use the search bar to find polls by question text.
5. Use pagination arrows when you have more than 20 polls.

### Official Dashboard — Constituent Mode (Elected Officials)

1. Log in to Poll City. If your official profile is linked to your account, an **Official View** button appears in the dashboard header.
2. Click **Official View** to switch to the Constituent Dashboard.
3. The Constituent Dashboard shows:
   - **Constituents Reached** — total contacts in your district.
   - **Supporter Signals** — contacts who have expressed support.
   - **Questions Received** — contacts flagged for follow-up.
   - **Open Tasks** — pending tasks.
4. Use the Quick Actions grid: Send Update, View Questions, Post Poll, View Sign Requests.
5. The Recent Interactions card shows your latest constituent touchpoints.
6. The Sentiment Overview chart shows Support / Undecided / Opposition breakdown.
7. Click **Switch to Candidate Mode** to return to the full campaign operations dashboard.
8. Your view preference is saved in your browser.

## April 2026 Feature SOP Addendum

### Officials Directory SOP (`/officials`)

1. Open the public Officials Directory at `/officials`.
2. Use the search box to find officials by name (search is debounced automatically).
3. Filter by Province to limit results to a province.
4. Filter by Level (Federal, Provincial, Municipal).
5. Filter by Role (Mayor, Councillor, MP, MPP, Trustee, Reeve, etc.).
6. Use Municipality search to narrow district/municipality matching.
7. Review official cards:
   - profile photo or initials avatar fallback
   - title and district
   - province and level badges
   - verified badge for claimed profiles
   - unclaimed badge for unclaimed profiles
8. Click View Profile to open the linked candidate profile.
9. Click Claim Profile on unclaimed records to start profile claim.

### Push Notifications SOP (Campaign Managers)

1. Open Notifications at `/notifications`.
2. Click Send Test Notification to validate your browser subscription.
3. Use Send Notification for immediate sends:
   - enter title and message
   - optionally filter by ward, riding, or role
   - submit send
4. Review Delivery Statistics cards:
   - total subscribers sent to
   - delivered count
   - failed count
   - delivery rate percentage
5. Open the Schedule tab for scheduled campaigns.
6. Select send date and time.
7. Enter message (max 120 characters) and check live counter.
8. Select audience: All Subscribers or Specific Tags.
9. Review phone preview block.
10. Click Schedule.
11. In Scheduled Notifications, click Cancel to cancel pending sends.
12. In Delivery Statistics & History, verify each send's delivered/failed totals.

### Voter Opt-In Confirmation SOP (Poll City Social)

1. On `/social/officials/[id]`, voters can opt in after following/supporting.
2. Confirm opt-in prompt to subscribe to election day reminders.
3. Verify success message: "You will receive election day reminders from [candidate name]".
4. Click Send Test Notification to verify push delivery on device.
5. Use `/social/profile` to manage notification preferences.

### Print Marketplace SOP (Campaigns)

1. Open Print at `/print`.
2. Review 8 product categories and click View Product for specs/pricing.
3. Start a new job at `/print/jobs/new`.
4. Complete Step 1 Product Selection.
5. Complete Step 2 Specifications:
   - quantity
   - size
   - stock/coating options
   - turnaround (Rush, Standard, Economy)
   - monitor running total and unit price
6. Complete Step 3 Design:
   - upload print-ready file, or
   - use template links, or
   - provide designer brief and email
7. Complete Step 4 Delivery Details:
   - address, city, province, postal code
   - requested date
   - special instructions
8. Complete Step 5 Review and Post.
9. Click Post to Marketplace.
10. Open `/print/jobs/[id]` to manage bids and production status.

### Print Marketplace SOP (Bid Award, Proof, Tracking)

1. On `/print/jobs/[id]`, compare bid cards by price, turnaround, rating, and notes.
2. Click Award This Bid on the selected vendor.
3. In Proof Approval, review proof and choose:
   - Approve Proof to proceed to production, or
   - Request Changes with feedback
4. In Tracking section, enter tracking number and carrier.
5. Save tracking and monitor shipped status.
6. Click Mark as Delivered when received.
7. Use Reorder on delivered jobs to prefill a new request.

### Print Shop SOP (Vendor Registration + Stripe Connect)

1. Open `/print/shops/register`.
2. Enter business profile (business/contact/email/phone/address).
3. Select provinces served.
4. Select product specialties (matching all 8 products).
5. Enter minimum order details and average response time.
6. Add portfolio URLs.
7. Click Register Shop.
8. Click Stripe Connect Onboarding to start payouts onboarding.
9. Complete Stripe onboarding flow and return to Poll City.

## Section 1: Getting Started

### How to Create Your Poll City Account

1. Navigate to poll.city and click **Sign Up**
2. Enter your email address and choose a strong password (minimum 8 characters)
3. Click **Create Account**
4. Check your email for a verification link and click it to activate your account
5. You're now ready to create your first campaign

### How to Create Your First Campaign

1. Log in to your account and click **Create New Campaign** on the dashboard
2. Fill in the campaign details:
   - **Campaign Name**: e.g., "Jane Smith for Mayor 2026"
   - **Election Type**: Select from Municipal, Provincial, Federal, By-Election, Nomination, Leadership, Union, or Referendum
   - **Election Date**: Pick the date when the election takes place
3. For municipal elections, select your **Municipality** from the dropdown (we'll show if we have election data for it)
4. Auto-fill or edit your **Jurisdiction** (ward number or district name)
5. Enter the **Candidate Name** (if your name matches an official record, we'll offer to pre-fill your data)
6. Add **Party or Organization** (optional)
7. Click **Create Campaign**
8. You'll be taken to the dashboard of your new campaign

### How to Set Up Your Candidate Public Page

1. Go to **Settings** → **Public Page**
2. Upload or paste a **Campaign Logo** (recommended: square, 512×512px)
3. Choose your **Primary Brand Colour** (hex code)
4. Write your **Candidate Bio** (supports markdown formatting)
5. Check **Make This Page Public** to publish
6. Copy your public page URL: `poll.city/candidates/your-slug`
7. Share this link on social media and with voters

### How to Customise Your Candidate Page (26 Features)

The page builder is a live two-column editor — settings on the left, real-time preview on the right. Every change reflects instantly in the preview before you save.

**Branding (Starter+ plan)**

1. Go to **Settings** → **Public Page**
2. In the **Branding** section, choose your **Primary Colour** and **Accent Colour** using the colour pickers
3. Upload your **Campaign Logo** using the upload button
4. Click **Save Changes** — your page updates immediately

**Themes (Starter+ plan)**

1. In the **Themes** section, click any of the 6 theme cards: Classic Blue, Bold Red, Modern Dark, Clean White, Campaign Green, Royal Purple
2. The preview on the right updates immediately to show the full theme

**Typography (Pro+ plan)**

1. In the **Typography** section, click a font pair card
2. Five font pairs available: Playfair/Source Sans, Inter/Inter, Merriweather/Open Sans, Montserrat/Lato, Georgia/Arial

**Layout (Pro+ plan)**

1. In the **Layout** section, choose: Professional (headshot left), Modern (full-width hero), Bold (large type, dramatic spacing), Minimal (clean whitespace)

**Hero Banner and Video (Pro+ plan)**

1. In the **Hero** section, paste a direct image URL for **Hero Banner Image**
2. Or paste a direct video URL for **Hero Video** (autoplays silently in the background)
3. A dark overlay is applied automatically so text stays readable

**Content Widgets (Pro+ plan)**

1. Toggle any widget on or off — the preview updates immediately
2. Available widgets: Social proof bar, Election countdown, Live polls, Door counter, Supporter wall
3. For **Endorsements** (up to 10): click **Add Endorsement**, fill in organisation name, logo URL (optional), and a pull quote
4. For **Custom FAQ** (up to 10): click **Add Q&A**, fill in question and answer
5. For **Email Capture**: toggle on, customise the headline and button text
6. For **Donation Widget**: toggle on, set custom amounts as comma-separated values (e.g. `10, 25, 50, 100`)
7. For **Town Hall Scheduler**: paste your Calendly or booking URL

**Elected Official Widgets (Official plan only)**

1. For **Office Hours** (up to 5): click **Add**, fill in day, time, and location
2. For **Committees** (up to 10): click **Add**, fill in committee name and your role
3. For **Voting Record**: paste the URL to your official voting record
4. For **Accomplishments Timeline** (up to 20): click **Add**, fill in date, title, and description
5. For **Newsletter**: toggle on, enter your newsletter name

**SEO (Pro+ plan)**

1. In the **SEO** section, enter a custom **Meta Title** (appears in Google search results)
2. Enter a custom **Meta Description** (up to 160 characters, appears under the title in Google)

**QR Code (Pro+ plan)**

1. In the **QR Code** section, enter a custom **QR Label** (appears below the QR code)
2. Choose **QR Size**: Small, Medium, or Large
3. Click **Download PNG** or **Download SVG** to save the QR code for print materials

**White Label (Command plan only)**

1. Toggle **Hide Poll City Branding** to remove the "Powered by Poll City" footer
2. Enter **Custom Footer Text** to replace it with your own message
3. Enter **Custom CSS** for full design control (advanced users only)

### How to Invite Team Members

1. Go to **Settings** → **Users & Permissions**
2. Click **Invite Team Member**
3. Enter their email address
4. Select their role:
   - **Campaign Manager**: Full access to all features
   - **Volunteer**: Canvassing and reporting only
   - **Analyst**: View analytics, reports, and contacts
5. Click **Send Invite**
6. They'll receive an email with an invitation link to join your campaign

### How to Connect Your Custom Domain

1. Go to **Settings** → **Custom Domain**
2. Enter your domain name (e.g., `janeitsmith.com`)
3. Follow the DNS setup instructions (add a CNAME record pointing to `poll.city`)
4. Click **Verify Domain** once DNS is configured
5. Your custom domain will now point to your candidate profile

---

## Section 2: Campaign Manager Guide

### How to Import Your Contact List

1. Go to **Import / Export** → **Smart Import**
2. Click **Choose CSV File** and select your spreadsheet (supports .csv, .xlsx, .xls)
3. Map your columns to Poll City fields:
   - Required: First Name, Last Name, Email OR Phone
   - Optional: Street Address, City, Postal Code, Phone, Email, Support Level, Tags
4. Preview shows first 5 rows — verify the mapping is correct
5. Click **Import Contacts** (note: duplicates are automatically merged)
6. Watch the progress bar. You'll get an email confirmation when done.

### How to Create and Manage Walk Lists

1. Go to **Canvassing** → **Walk List**
2. Click **Create New Walk List**
3. Give your list a name (e.g., "Ward 12 Door Knock Nov 1")
4. Select **Turf/District** or manually search by:
   - Address
   - Postal Code Range
   - Support Level (to target only supporters, etc.)
5. Review the contact count, then click **Generate List**
6. Export as PDF for field teams or share a mobile link
7. Teams can report results in real-time using the mobile app

### How to Build and Assign Turfs

1. Go to **Canvassing** → **Turf Builder**
2. Select your **Start Address** and **Radius** (in kilometers)
3. Choose **Split Method**: Ward, Poll Number, Street, or Odd/Even Side
4. Set **Doors Per Turf** (e.g., 50 doors max per canvasser)
5. Click **Generate Turfs**
6. Review turfs on the map, then click **Confirm & Create**
7. Assign turfs to canvassers:
   - Go to **Canvassing** → **Assign Turfs**
   - Drag turfs to canvassers or use bulk assignment
   - Send them a link to download their mobile walk list

### How to Track Canvassing Progress

1. Go to **Analytics**
2. Click **Door Knock Completion Map** to see real-time coverage
3. Hover over areas to see:
   - Doors knocked vs. remaining
   - Canvasser names and completion %
   - Time taken per area
4. Use **Leaderboard** to see top-performing canvassers
5. Click on a canvasser to see their recent activity

### How to Manage Volunteers and Shifts

1. Go to **Volunteers**
2. Click **Invite Volunteer** and send them a link
3. Create **Volunteer Shifts**:
   - Date, Time, Location, Role (Canvasser, Phone Bank, Data Entry)
   - Description and any special notes
4. Volunteers RSVP to your shifts
5. Send **SMS Reminders** 24 hours before each shift
6. Track **Volunteer Hours** contributed by person and role

### How to Track Signs and Requests

1. Go to **Signs**
2. To **Request a Sign**:
   - Enter address, contact name, phone, email
   - Select sign size and quantity
   - Mark as "Pick Up" or "Delivery"
3. To **Track Requests**:
   - View all pending, approved, and delivered signs
   - Filter by date or status
   - Export a sign delivery schedule for your team
4. To **Manage Supply**:
   - Add your inventory count
   - System alerts when stock is low

### How to Manage Donations

1. Go to **Donations**
2. To **Record a Donation**:
   - Click **Add Donation**
   - Enter donor name, amount, date
   - Add transaction ID or payment method reference
3. To **Set Up Online Giving**:
   - Go to **Settings** → **Donation Links**
   - Enable Stripe integration
   - Copy your donation link and share on your public page
4. To **Track Progress**:
   - See daily/weekly donation totals
   - Monitor which addresses are donating (for targeting)
   - Export donor list for thank-you letters

### How to Create and Send Notifications

1. Go to **Notifications**
2. Click **Create Notification**
3. Choose channel:
   - **Email** (all contacts or specific support level)
   - **SMS** (CASL-compliant list only)
   - **In-App** (to Poll City users following you)
4. Write your message (supports variables like {firstName}, {supportLevel})
5. Schedule for immediate send or pick a future date/time
6. Click **Send** and monitor open/click rates

### How to Run Polls

1. Go to **Polls**
2. Click **Create Poll**
3. Ask your question and set poll type:
   - **Yes/No**: Binary choice
   - **Multiple Choice**: Up to 5 options
   - **Ranking**: Voters rank options by preference
   - **Slider**: 1-10 scale (e.g., "How likely are you to vote?")
   - **Image Swipe**: Tinder-style swiping on images
4. Set **Visibility**: Public (on your profile) or Private (campaign-only)
5. Publish poll immediately or schedule a future time
6. View live results in real-time
7. Use results for messaging strategy (which policy resonates most, etc.)

### How to Use the GOTV Engine

1. Go to **GOTV** (Get Out The Vote)
2. Configure your **GOTV Settings**:
   - Election day date
   - Locations of polling stations
   - Advance voting location details
3. Select contacts who are:
   - Strong supporters
   - Persuadable voters
   - First-time voters
4. Create **GOTV Tasks**:
   - Phone banking (reminder calls 3 days before)
   - Door knocking (final pushes)
   - Ride-to-polls sign-ups
5. Track **Voter Turnout** against historical targets
6. Monitor completion % in real-time on the **GOTV Dashboard**

### How to View Analytics and Heat Maps

1. Go to **Analytics**
2. Click **Heat Map** to see election result intensity by municipality:
   - Red zones = Close races (<40% support)
   - Blue zones = Moderate contests (40–60%)
   - Dark blue = Dominant territory (>60%)
3. Use **Top Municipalities** chart to see highest voter turnout areas
4. Use **Trends** chart to compare 2014, 2018, and 2022 elections
5. Click **Full Results** to export raw data for further analysis
6. Filter by year, province, and municipality

### How to Use the AI Assistant

1. Go to **AI Assist**
2. Chat with Claude AI for:
   - Writing email templates
   - Generating canvassing scripts
   - Analyzing poll data and suggesting messaging
   - Creating social media posts
   - Draft press releases
3. Give context (e.g., "I'm running for mayor in a suburban riding with aging voters")
4. AI generates tailored suggestions you can edit and use

### How to Manage Tasks

1. Go to **Tasks**
2. Click **Create Task**
3. Add details:
   - Title, description, priority level
   - Due date
   - Assign to team member
   - Add subtasks if needed
4. Click **Create**
5. Team members see tasks in their **Task List**
6. Dashboard shows **Open Tasks** count
7. Mark tasks complete when done; they roll to archive

### How to Export Data

1. Go **Import/Export** → **Export**
2. Select what to export:
   - Contacts (CSV with all fields)
   - Election Results (CSV with analysis)
   - Canvassing Reports (by date range)
   - Donation List (with donor info)
   - Volunteer Hours (by person)
   - Analytics Maps (as images)
3. Click **Export** to download

---

## Section 3: Canvasser Guide

### How to Download the Mobile App

1. On your phone, go to:
   - **iOS**: Apple App Store → search "Poll City"
   - **Android**: Google Play Store → search "Poll City"
2. Tap **Install**
3. Open the app and log in with your email and password
4. You're ready to start canvassing

### How to Access Your Walk List

1. Open the Poll City app
2. If your manager assigned you a turf, you'll see **Your Turfs** on the home screen
3. Tap your turf name to open your walk list
4. The app shows:
   - Map of all doors you need to visit
   - Address and contact name
   - Current support level (from previous conversations)
   - Notes from your manager
5. Walk to each address in order (app guides you via GPS)

### How to Record a Door Knock Result

1. Arrive at a door and tap the address in the app
2. Select the interaction type:
   - **Home**: They answered the door
   - **Not Home**: No one answered
   - **Refused**: They declined to speak with you
   - **Moved**: Address is vacant
3. If they answered, record:
   - **Support Level**: Strong Support, Leaning Support, Undecided, Leaning Opposition, Strong Opposition
   - **Notes**: e.g., "Interested in affordable housing"
   - **Phone Number** (optional): to follow up later
   - **Email** (optional): to add to newsletter
4. Upload a photo if needed (e.g., "No Solicitors" sign)
5. Tap **Save** → move to next address

### How to Use the App Offline Without Cell Signal

1. Before you go canvassing, tap **Download Offline** in the app
2. Select your turf and tap **Sync**
3. The app downloads:
   - Full walk list
   - Contact information
   - Maps (no GPS needed, just for reference)
4. Go knock doors; app saves results locally
5. When you get cell signal, results auto-sync
6. If sync fails, tap **Manual Sync** in settings

### How to Sync Your Results

1. When you have cell/WiFi connection:
   - Open the app → **More** → **Sync**
2. Tap **Upload Results** (blue circle)
3. App shows upload progress — you'll see a checkmark when done
4. Important: Don't force-close the app during sync
5. Results appear on your manager's dashboard within 5 minutes

### How to Use Quick Capture

1. Go to **Capture** in the app
2. Without visiting an address, quickly log:
   - Street/neighbourhood
   - Phone number or email
   - Support level
   - One key note
3. Useful for: Market events, street teams, random conversations
4. Later, your manager can geocode these into turfs

---

## Section 4: Voter Guide on Poll City Social

### How to Find Your Candidates by Postal Code

1. Go to poll.city/social
2. Enter your postal code (e.g., M5V 3A8) in the search box
3. Click **Search**
4. See all candidates and officials running or serving in your area:
   - By level: Municipal, Provincial, Federal
   - By district/riding
5. View their profiles, answer their polls, learn their positions

### How to Follow a Candidate or Official

1. On any candidate's profile, click **Follow**
2. You'll get email updates when they:
   - Post a new poll
   - Publish a message
   - Request your support
3. Manage your following list in **Profile** → **Following**
4. Click **Unfollow** anytime to stop receiving updates

### How to Answer Polls

1. On a candidate's profile, locate their **Active Polls**
2. Click a poll question to open it
3. Select your answer(s) and click **Submit**
4. See live results instantly
5. Polls are anonymous — your name isn't recorded

### How to Request a Campaign Sign

1. On the candidate's profile, click **Request a Sign**
2. Fill in:
   - Your street address
   - Your name and phone number
   - Sign size preference (Small, Medium, Large)
   - Installation date preference
3. Click **Submit Request**
4. The campaign will contact you within 24 hours

### How to Opt In to Election Day Notifications

1. On any candidate's profile, click **Election Day Alerts** (toggle ON)
2. You'll receive an SMS or email reminding you to vote on election day
3. Message includes:
   - Polling station address for your postal code
   - Hours (polls typically open 8am–8pm)
   - What to bring (voter ID)
   - Early voting dates if not voting on election day
4. Manage notifications in **Profile** → **Notification Settings**

### How to Manage Your Notification Preferences

1. Go to your **Profile** → **Notification Settings**
2. Choose which types of emails/SMS you want:
   - Poll notifications
   - Election day reminders
   - Campaign announcements
   - Policy updates
3. Uncheck any you don't want
4. Click **Save**
5. You can always re-enable them later

---

## Section 5: Elected Official Guide

### How to Claim Your Poll City Profile

1. Go to poll.city/claim
2. Enter your name and postal code (or district name)
3. If Poll City has your official record, you'll see your profile:
   - Photo (if in our database)
   - Title, level, and jurisdiction
4. Click **Claim This Profile**
5. Enter your email and password to create your account
6. Verify ownership via email link
7. Your profile is now claimed and locked to your account

### How to Verify Your Identity

1. After claiming your profile, go to **Settings** → **Identity Verification**
2. Upload one of the following:
   - Photo ID (driver's license, passport)
   - Official government letter with your address
   - Election Canada certificate (for MPs)
3. Add a note explaining your document (e.g., "My driver's license")
4. Click **Submit for Verification**
5. Poll City team reviews within 24 hours
6. Once verified, a green "Verified" badge appears on your profile

### How to Manage Your Public Profile

1. Go to **Settings** → **Profile Information**
2. Update:
   - **Title**: Your official role
   - **Photo**: Professional headshot
   - **Bio**: Your background and priorities
   - **District**: Your riding, ward, or municipality
3. Add contact information:
   - **Website**: Link to your official site
   - **Phone**: Office number
   - **Email**: Public contact email
   - **Twitter, Facebook, Instagram, LinkedIn**: Social media handles
4. Click **Publish** to go live

### How to Engage With Constituent Questions

1. Go to **Inbox** → **Constituent Questions**
2. See all questions voters have submitted to you
3. Click a question to open it
4. Type your response and click **Send Answer**
5. Voter receives your response via email
6. Your answer appears on your public profile (anonymous)
7. You can mark questions as "Answered," "Forwarded to Staff," or "No Response"

### How to Use the Constituent Dashboard

1. Go to your **Dashboard**
2. View:
   - **District Overview**: Population, demographics, top issues
   - **Recent Activity**: Latest polls voters have answered
   - **Service Requests**: Constituent cases (potholes, permit issues)
   - **Follow Count**: How many constituents are following you
3. Use insights to inform your priorities and town halls

### How to Prepare for Re-Election

1. Go to **Re-Election Hub**
2. Download tools:
   - Contact list of supporters (segmented by support level)
   - Canvassing scripts tailored to common issues
   - Sample social media posts
   - Election timeline (nomination period, advance vote, election day)
3. Set up your campaign:
   - Import your contact list
   - Create your candidate page (if running again)
   - Invite staff and volunteers
4. Monitor opposition:
   - View candidate profiles running against you
   - Track their position on key issues via polls

---

## Section 6: Print Marketplace Guide

### How to Create a Print Job

1. Go to **Print** → **Print Shop**
2. Click **Create New Job**
3. Specify your order:
   - **Item Type**: Door Hanger, Postcard, Flyer, Sign, Lawn Sign, etc.
   - **Quantity**: 500–50,000+
   - **Specifications**: Color, Size, Paper Weight
   - **Design**: Upload a PDF or use our design tool
4. Preview your file and click **Submit Design**
5. Choose **Delivery Options**:
   - Mail to single address
   - Mail to multiple addresses (bulk shipping)
   - Local pickup
6. Click **Estimate Cost**

### How to Post to Marketplace

1. Create your job (above), then click **Post to Marketplace**
2. Your job is now visible to all print shops in our network
3. You'll receive bids within 24 hours
4. Each bid shows:
   - Price per unit
   - Turnaround time
   - Print shop reputation score
   - Samples of their previous work

### How to Review Bids From Print Shops

1. Go to **Print** → **Your Jobs**
2. Click your job to see all bids
3. Compare:
   - **Price per unit**: Calculate total cost
   - **Timeline**: How fast can they deliver?
   - **Reputation**: Click shop name to see reviews
   - **Samples**: View their recent projects
4. Click on a bid to see the print shop's full terms

### How to Award a Job

1. After reviewing bids, click on your chosen bid
2. Click **Award Job** (you'll sign a simple contract)
3. Upload final approved artwork if you haven't already
4. Confirm delivery address and timeline
5. The print shop sends you a production confirmation within 24 hours
6. Estimated delivery date is locked in

### How to Track Your Order

1. Go to **Print** → **My Orders**
2. Click on a job to see its status:
   - **Design approved**: Proof accepted
   - **In production**: Being printed
   - **Quality check**: Final inspection at print shop
   - **Shipped**: On its way to you
   - **Delivered**: Arrival confirmation
3. Click **Track Shipment** for real-time location updates
4. Print shop updates progress automatically daily

---

**Need help?** Email support@poll.city or use the in-app Chat button.
