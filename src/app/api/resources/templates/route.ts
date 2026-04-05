import { NextResponse } from "next/server";

export const dynamic = "force-static";

// Public list of available downloadable templates. Kept in sync with
// src/app/api/resources/templates/[slug]/route.ts
const TEMPLATES: Array<{ slug: string; title: string; category: string; format: "html" | "csv" }> = [
  { slug: "volunteer-signup", title: "Volunteer Sign-Up Sheet", category: "Volunteers", format: "html" },
  { slug: "canvasser-checklist", title: "Canvasser Pre-Shift Checklist", category: "Canvassing", format: "html" },
  { slug: "door-knock-codes", title: "Door-Knock Result Codes", category: "Canvassing", format: "html" },
  { slug: "script-supporter", title: "Script — Confirmed Supporter", category: "Canvassing", format: "html" },
  { slug: "script-persuadable", title: "Script — Persuadable Voter", category: "Canvassing", format: "html" },
  { slug: "script-opposition", title: "Script — Opposition", category: "Canvassing", format: "html" },
  { slug: "election-day-checklist", title: "Election Day Hour-by-Hour", category: "Election Day", format: "html" },
  { slug: "gotv-phone-script", title: "GOTV Phone Script", category: "GOTV", format: "html" },
  { slug: "scrutineers-guide", title: "Scrutineer's Guide", category: "Election Day", format: "html" },
  { slug: "poll-captain-handbook", title: "Poll Captain Handbook", category: "Election Day", format: "html" },
  { slug: "donation-pledge", title: "Donation Pledge Card", category: "Finance", format: "html" },
  { slug: "donation-receipt", title: "Donation Receipt (Ontario)", category: "Finance", format: "html" },
  { slug: "expense-tracker", title: "Expense Tracker", category: "Finance", format: "csv" },
  { slug: "social-calendar", title: "Social Calendar", category: "Comms", format: "csv" },
  { slug: "press-release", title: "Press Release Template", category: "Comms", format: "html" },
  { slug: "finance-checklist", title: "Campaign Finance Checklist", category: "Finance", format: "html" },
  { slug: "campaign-bio", title: "Candidate Bio", category: "Candidate", format: "html" },
  { slug: "volunteer-certificate", title: "Volunteer Certificate of Service", category: "Volunteers", format: "html" },
];

export async function GET() {
  return NextResponse.json({ templates: TEMPLATES });
}
