import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Downloadable campaign resource templates.
//
// Each template renders to a self-contained HTML document (print-ready) or
// a CSV. Downloads are generated on-demand — no binary assets in the repo.
// ─────────────────────────────────────────────────────────────────────────────

type TemplateKind = "html" | "csv";

interface Template {
  kind: TemplateKind;
  filename: string;
  content: () => string;
}

const TEMPLATES: Record<string, Template> = {
  "volunteer-signup": {
    kind: "html",
    filename: "volunteer-signup-sheet.html",
    content: () => printableForm("Volunteer Sign-Up Sheet", [
      "Full name",
      "Email",
      "Phone",
      "Postal code",
      "Availability (days/evenings/weekends)",
      "Skills (driving, data, phones, doors, signs, social)",
      "Languages",
      "T-shirt size",
      "Can you help with: □ canvassing  □ phones  □ events  □ signs  □ data entry  □ driving",
      "Signature",
      "Date",
    ]),
  },
  "canvasser-checklist": {
    kind: "html",
    filename: "canvasser-checklist.html",
    content: () => printableChecklist("Canvasser Pre-Shift Checklist", [
      "Candidate literature (50+ pieces)",
      "Clipboard + pen",
      "Walk list printed",
      "ID badge",
      "Phone charged + Poll City app logged in",
      "Water bottle + snack",
      "Weather-appropriate clothing",
      "Door hangers for not-home visits",
      "Script reviewed",
      "Emergency contact numbers",
    ]),
  },
  "door-knock-codes": {
    kind: "html",
    filename: "door-knock-result-codes.html",
    content: () => printableTable("Door-Knock Result Codes", [
      ["Code", "Meaning", "Follow-up"],
      ["SY", "Strong Yes", "GOTV priority 1"],
      ["LY", "Leaning Yes", "GOTV priority 2"],
      ["U", "Undecided", "Persuasion follow-up"],
      ["LN", "Leaning No", "No further contact"],
      ["SN", "Strong No", "Do not contact"],
      ["NH", "Not Home", "Revisit + door hanger"],
      ["MA", "Moved Away", "Remove from list"],
      ["R", "Refused", "Do not contact"],
      ["V", "Voted", "Strike from GOTV"],
      ["DC", "Do Not Contact", "Honour immediately"],
    ]),
  },
  "script-supporter": {
    kind: "html",
    filename: "canvassing-script-supporter.html",
    content: () =>
      printableScript("Canvassing Script — Confirmed Supporter", [
        'Hi, I\'m [NAME] from [CANDIDATE]\'s campaign. We have you down as a supporter — is that still right?',
        "Terrific. Election day is [DATE]. Your polling station is [LOCATION].",
        "Can we count on you to vote? [IF YES]: Would you be willing to put a sign on your lawn / join us for a shift / donate?",
        "Thank you for your support — it genuinely matters.",
      ]),
  },
  "script-persuadable": {
    kind: "html",
    filename: "canvassing-script-persuadable.html",
    content: () =>
      printableScript("Canvassing Script — Persuadable Voter", [
        "Hi, I'm [NAME] with [CANDIDATE]. Do you have 2 minutes?",
        "What issues matter most to you in this election?",
        "[LISTEN]. [CANDIDATE] has been working on that — [1 specific action, 1 sentence].",
        "Can we count on your vote on [DATE]?",
        "[IF UNSURE]: Totally fair. Here's some more info. Mind if we follow up closer to E-Day?",
      ]),
  },
  "script-opposition": {
    kind: "html",
    filename: "canvassing-script-opposition.html",
    content: () =>
      printableScript("Canvassing Script — Opposition", [
        "Hi, I'm [NAME] with [CANDIDATE].",
        "Thanks for letting me know where you stand. I respect that.",
        "Have a great day. [MARK AS STRONG NO. DO NOT ARGUE.]",
      ]),
  },
  "election-day-checklist": {
    kind: "html",
    filename: "election-day-checklist.html",
    content: () => printableChecklist("Election Day Hour-by-Hour", [
      "06:00 — War room open, coffee on, phone banks live",
      "07:00 — Signs at polls (check Elections Canada 100m rule)",
      "08:00 — First GOTV shift starts",
      "10:00 — Scrutineer check-in, ballot count so far",
      "12:00 — Lunch shift + refresh volunteers",
      "14:00 — Call reminder round to confirmed supporters",
      "16:00 — Final push round, rides to polls",
      "18:00 — Ride-coordinator confirms every requested ride",
      "20:00 — Polls close, results watch, thank-you calls begin",
      "22:00 — Team debrief + press statement",
    ]),
  },
  "gotv-phone-script": {
    kind: "html",
    filename: "gotv-phone-script.html",
    content: () =>
      printableScript("GOTV Phone Script — Election Day", [
        "Hi, this is [NAME] calling from [CANDIDATE]'s team. Have you had a chance to vote yet today?",
        "[IF NO]: Polls are open until 9:30pm. Your polling station is [LOCATION]. Do you know how you're getting there?",
        "[IF NO RIDE]: We can send a driver. What's your address?",
        "[IF YES]: Thank you so much for voting!",
      ]),
  },
  "scrutineers-guide": {
    kind: "html",
    filename: "scrutineers-guide.html",
    content: () =>
      printableDoc("Scrutineer's Guide", [
        "Your job is to observe the count and record who has voted — nothing more.",
        "Arrive at your poll 30 minutes before opening. Present your appointment letter.",
        "Record bingo sheet numbers every hour and text them to the war room.",
        "Do NOT campaign inside the poll. Do NOT interfere with the returning officer.",
        "If you see irregularity: document quietly, notify the DRO, escalate to campaign HQ.",
        "At count: watch every ballot. Challenge only rejected/objected ballots.",
        "Sign the statement of the vote. Photograph it before leaving.",
      ]),
  },
  "poll-captain-handbook": {
    kind: "html",
    filename: "poll-captain-handbook.html",
    content: () =>
      printableDoc("Poll Captain Handbook", [
        "You own one polling location from 06:00 to 22:00.",
        "Pre-day: confirm sign placement, assign 2+ scrutineers, brief them.",
        "Morning: open with scrutineers, verify official supplies, start bingo sheet.",
        "During day: hourly vote count reports, manage scrutineer rotation, feed them.",
        "Ride requests: text rides coordinator immediately with address + time.",
        "Closing: supervise count, sign statement of vote, photo everything, report to HQ.",
      ]),
  },
  "donation-pledge": {
    kind: "html",
    filename: "donation-pledge.html",
    content: () =>
      printableForm("Donation Pledge Card", [
        "Donor full name",
        "Address",
        "Postal code",
        "Phone",
        "Email",
        "Pledge amount $______",
        "Payment: □ Cheque  □ E-transfer  □ Credit card  □ Monthly recurring",
        "Signature",
        "Date",
      ]),
  },
  "donation-receipt": {
    kind: "html",
    filename: "donation-receipt-ontario.html",
    content: () =>
      printableDoc("Official Donation Receipt (Ontario)", [
        "Receipt #: _________ Date: _________",
        "Donor name + address: ________________________",
        "Amount: $__________ (Eligible for Ontario tax credit)",
        "Campaign: ________________________ (Registered Political Contribution)",
        "Authorised by: ______________________ (CFO signature)",
        "Issued under Ontario Election Finances Act.",
      ]),
  },
  "expense-tracker": {
    kind: "csv",
    filename: "expense-tracker.csv",
    content: () =>
      "Date,Category,Description,Vendor,Amount,PaymentMethod,Receipt,ApprovedBy\n",
  },
  "social-calendar": {
    kind: "csv",
    filename: "social-calendar.csv",
    content: () =>
      "Date,Platform,Content,Image,Link,Status,PostedBy\n",
  },
  "press-release": {
    kind: "html",
    filename: "press-release-template.html",
    content: () =>
      printableDoc("Press Release Template", [
        "FOR IMMEDIATE RELEASE",
        "Date: _________",
        "Headline: [Action verb] [announcement]",
        "Sub-head: [Context]",
        "City, Province — [Lead paragraph — who, what, when, where, why].",
        '"[Quote from candidate]," said [NAME], [TITLE].',
        "[Supporting paragraph with detail].",
        "[Call to action].",
        "-30-",
        "Media contact: [NAME] [EMAIL] [PHONE]",
      ]),
  },
  "finance-checklist": {
    kind: "html",
    filename: "finance-checklist.html",
    content: () => printableChecklist("Campaign Finance Checklist", [
      "CFO appointed + registered",
      "Separate campaign bank account opened",
      "Spending limit calculated + recorded",
      "Contribution limit notice posted",
      "All donations logged with name, address, amount",
      "Receipts issued within 30 days",
      "Expenses filed to correct category",
      "Interim report filed (if required)",
      "Final report filed within 6 months of election",
    ]),
  },
  "campaign-bio": {
    kind: "html",
    filename: "candidate-bio-template.html",
    content: () => printableForm("Candidate Bio (Draft)", [
      "Full name",
      "Current role / occupation",
      "Years in community",
      "Family (if sharing)",
      "Community roles / volunteer history",
      "Top 3 issues this campaign",
      "Why you're running (2 sentences)",
      "Headshot attached: □",
    ]),
  },
  "volunteer-certificate": {
    kind: "html",
    filename: "volunteer-certificate.html",
    content: () => printableDoc("Certificate of Service", [
      "This certifies that",
      "_______________________",
      "contributed _____ volunteer hours to the",
      "_______________________ campaign",
      "in the [YEAR] election.",
      "",
      "Signed ________________________  Date _________",
    ]),
  },
};

// ─── HTML builders ───────────────────────────────────────────────────────────

function wrap(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>
    @page { margin: 1in; }
    body { font-family: Georgia, serif; color: #111; max-width: 720px; margin: 0 auto; padding: 32px; line-height: 1.5; }
    h1 { font-size: 28px; border-bottom: 3px solid #1E3A8A; padding-bottom: 8px; }
    h2 { color: #1E3A8A; margin-top: 24px; }
    .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #cbd5e1; }
    .label { color: #475569; }
    ol li, ul li { margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; }
    input[type=text] { width: 100%; border: none; border-bottom: 1px solid #94a3b8; padding: 4px 0; }
    .check { font-size: 18px; margin-right: 8px; }
    footer { color: #94a3b8; font-size: 11px; margin-top: 48px; }
  </style></head><body>${body}<footer>Generated by Poll City · poll.city</footer></body></html>`;
}

function printableForm(title: string, fields: string[]): string {
  const rows = fields.map((f) => `<div class="row"><span class="label">${f}</span><input type="text" /></div>`).join("");
  return wrap(title, `<h1>${title}</h1>${rows}`);
}

function printableChecklist(title: string, items: string[]): string {
  const rows = items.map((i) => `<div class="row"><span><span class="check">☐</span>${i}</span></div>`).join("");
  return wrap(title, `<h1>${title}</h1>${rows}`);
}

function printableTable(title: string, rows: string[][]): string {
  const [head, ...body] = rows;
  const thead = `<tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  const tbody = body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  return wrap(title, `<h1>${title}</h1><table>${thead}${tbody}</table>`);
}

function printableScript(title: string, lines: string[]): string {
  const ol = `<ol>${lines.map((l) => `<li>${l}</li>`).join("")}</ol>`;
  return wrap(title, `<h1>${title}</h1>${ol}`);
}

function printableDoc(title: string, paragraphs: string[]): string {
  const body = paragraphs.map((p) => (p ? `<p>${p}</p>` : "<br/>")).join("");
  return wrap(title, `<h1>${title}</h1>${body}`);
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const template = TEMPLATES[params.slug];
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  let body = template.content();
  const contentType =
    template.kind === "csv" ? "text/csv; charset=utf-8" : "text/html; charset=utf-8";

  // Apply campaign brand kit if a campaignId is supplied.
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (campaignId && template.kind === "html") {
    try {
      const { loadBrandKit, applyBrand } = await import("@/lib/brand/brand-kit");
      const brand = await loadBrandKit(campaignId);
      body = applyBrand(body, brand);
      // Inject brand footer with candidate name + website
      body = body.replace(
        "Generated by Poll City · poll.city",
        `${brand.campaignName}${brand.websiteUrl ? ` · ${brand.websiteUrl}` : ""} · Generated by Poll City`,
      );
    } catch {
      // fall through with generic template
    }
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${template.filename}"`,
      "Cache-Control": campaignId ? "private, max-age=300" : "public, max-age=86400",
    },
  });
}

export async function HEAD() {
  // Allow the UI to list available templates
  return NextResponse.json({ templates: Object.keys(TEMPLATES) });
}
