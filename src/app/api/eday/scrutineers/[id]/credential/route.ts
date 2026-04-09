/**
 * Scrutineer Credential Form
 *
 * Returns a printable HTML appointment form for a scrutineer assignment.
 * The candidate signs this form (physically or digitally) to authorize
 * the scrutineer as an official poll watcher at the assigned polling station.
 *
 * Under Elections Ontario: section 14 of the Election Act requires a written
 * appointment signed by the candidate or official agent.
 *
 * The form is pre-populated with candidate name, scrutineer name, polling
 * station, election date, and campaign contact info from the database.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  // Verify membership (any active member can print a credential)
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignment = await prisma.scrutineerAssignment.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      campaign: {
        select: {
          name: true,
          candidateName: true,
          candidateEmail: true,
          candidatePhone: true,
          officeAddress: true,
          jurisdiction: true,
        },
      },
    },
  });

  if (!assignment || assignment.campaignId !== campaignId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const electionDate = new Date(assignment.electionDate);
  const electionDateStr = electionDate.toLocaleDateString("en-CA", {
    year: "numeric", month: "long", day: "numeric",
  });

  const scrutineerName = assignment.user.name ?? assignment.user.email ?? "Unknown";
  const candidateName = assignment.campaign.candidateName ?? assignment.campaign.name;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Scrutineer Appointment — ${assignment.pollingStation}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      color: #000;
      background: #fff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 16pt; text-align: center; margin-bottom: 4px; }
    h2 { font-size: 13pt; text-align: center; margin-bottom: 20px; font-weight: normal; }
    .divider { border-top: 2px solid #000; margin: 12px 0; }
    .thin-divider { border-top: 1px solid #000; margin: 8px 0; }
    .section { margin-bottom: 20px; }
    .label { font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .value { font-size: 13pt; padding: 2px 0; border-bottom: 1px solid #333; min-height: 22px; }
    .row { display: flex; gap: 24px; margin-bottom: 16px; }
    .col { flex: 1; }
    .instructions { font-size: 10pt; line-height: 1.6; color: #333; background: #f5f5f5; border: 1px solid #ccc; padding: 12px; margin-bottom: 20px; }
    .signature-block { display: flex; gap: 40px; margin-top: 32px; }
    .signature-line { flex: 1; }
    .sig-line { border-bottom: 1px solid #000; height: 40px; margin-bottom: 4px; }
    .sig-label { font-size: 10pt; }
    .footer { font-size: 9pt; color: #666; text-align: center; margin-top: 32px; border-top: 1px solid #ccc; padding-top: 12px; }
    .status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 10pt;
      font-weight: bold;
      background: ${assignment.candidateSigned ? "#d4edda" : "#fff3cd"};
      color: ${assignment.candidateSigned ? "#155724" : "#856404"};
      border: 1px solid ${assignment.candidateSigned ? "#c3e6cb" : "#ffeeba"};
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:20px; padding:10px; background:#f0f4ff; border:1px solid #c0c8e0; font-family:sans-serif; font-size:11pt;">
    <strong>Print this form</strong> (Ctrl+P / Cmd+P) and have the candidate sign it before election day.
    ${assignment.candidateSigned
      ? '<span style="color:#155724;margin-left:12px;">✓ Marked as signed in Poll City</span>'
      : '<span style="color:#856404;margin-left:12px;">⚠ Not yet marked as signed</span>'}
  </div>

  <h1>OFFICIAL APPOINTMENT OF SCRUTINEER</h1>
  <h2>${assignment.campaign.jurisdiction ?? assignment.municipality} ${new Date(assignment.electionDate).getFullYear()} Municipal Election</h2>
  <div class="divider"></div>

  <div class="instructions">
    Under the <em>Election Act</em>, a candidate or official agent may appoint scrutineers to attend at polling places during voting and counting.
    This appointment must be signed by the candidate or official agent and presented to the Deputy Returning Officer at the assigned polling station.
  </div>

  <div class="section">
    <div class="row">
      <div class="col">
        <div class="label">Candidate Name</div>
        <div class="value">${candidateName}</div>
      </div>
      <div class="col">
        <div class="label">Election Date</div>
        <div class="value">${electionDateStr}</div>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <div class="label">Scrutineer Name</div>
        <div class="value">${scrutineerName}</div>
      </div>
      <div class="col">
        <div class="label">Scrutineer Phone / Email</div>
        <div class="value">${assignment.user.phone ?? assignment.user.email ?? "—"}</div>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <div class="label">Assigned Polling Station</div>
        <div class="value">${assignment.pollingStation}</div>
      </div>
      <div class="col">
        <div class="label">Municipality / Ward</div>
        <div class="value">${assignment.municipality}${assignment.ward ? ` · Ward ${assignment.ward}` : ""}</div>
      </div>
    </div>
    ${assignment.pollingAddress ? `
    <div style="margin-bottom:16px;">
      <div class="label">Polling Station Address</div>
      <div class="value">${assignment.pollingAddress}</div>
    </div>` : ""}
    ${assignment.notes ? `
    <div style="margin-bottom:16px;">
      <div class="label">Notes</div>
      <div class="value">${assignment.notes}</div>
    </div>` : ""}
  </div>

  <div class="thin-divider"></div>

  <p style="margin: 16px 0; font-size: 11pt; line-height: 1.6;">
    I, <strong>${candidateName}</strong>, candidate for the above-noted election, hereby appoint
    <strong>${scrutineerName}</strong> as my official scrutineer at the polling station indicated above
    for the duration of voting and/or the counting of votes on election day.
  </p>

  <div class="signature-block">
    <div class="signature-line">
      <div class="sig-line"></div>
      <div class="sig-label">Candidate Signature</div>
    </div>
    <div class="signature-line">
      <div class="sig-line"></div>
      <div class="sig-label">Date Signed</div>
    </div>
    <div class="signature-line">
      <div class="sig-line"></div>
      <div class="sig-label">Scrutineer Signature (acknowledged)</div>
    </div>
  </div>

  <div class="footer">
    Generated by Poll City &nbsp;·&nbsp; ${assignment.campaign.name}
    ${assignment.campaign.officeAddress ? ` &nbsp;·&nbsp; ${assignment.campaign.officeAddress}` : ""}
    ${assignment.campaign.candidateEmail ? ` &nbsp;·&nbsp; ${assignment.campaign.candidateEmail}` : ""}
    &nbsp;·&nbsp; Form ID: ${assignment.id.slice(-8).toUpperCase()}
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
