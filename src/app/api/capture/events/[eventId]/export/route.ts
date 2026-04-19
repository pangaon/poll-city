import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

function toCsv(rows: Record<string, unknown>[], headers: { key: string; label: string }[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    const safe = /^[=+\-@|%]/.test(s) ? "'" + s : s;
    if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  };
  const headerRow = headers.map((h) => escape(h.label)).join(",");
  const dataRows = rows.map((row) => headers.map((h) => escape(row[h.key])).join(","));
  return [headerRow, ...dataRows].join("\n");
}

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const event = await prisma.captureEvent.findFirst({
    where: { id: params.eventId, deletedAt: null },
    include: { candidates: { orderBy: { ballotOrder: "asc" } } },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: event.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "approved"; // approved | all

  const submissions = await prisma.captureSubmission.findMany({
    where: {
      eventId: params.eventId,
      ...(mode === "approved" ? { status: "approved" } : { status: { not: "draft" } }),
    },
    include: {
      location: { select: { name: true, ward: true, pollNumber: true, address: true } },
      submittedBy: { select: { name: true, email: true } },
      results: { include: { candidate: { select: { name: true, party: true } } } },
    },
    orderBy: [{ location: { ward: "asc" } }, { location: { name: "asc" } }],
  });

  // Build flat rows — one row per submission-candidate combination
  const rows: Record<string, unknown>[] = [];
  for (const sub of submissions) {
    const baseRow = {
      event_name: event.name,
      event_type: event.eventType,
      office: event.office,
      location: sub.location.name,
      ward: sub.location.ward ?? "",
      poll_number: sub.location.pollNumber ?? "",
      address: sub.location.address ?? "",
      status: sub.status,
      total_votes: sub.totalVotes ?? "",
      rejected_ballots: sub.rejectedBallots ?? "",
      percent_reporting: sub.percentReporting,
      capture_mode: sub.captureMode,
      submitted_by: sub.submittedBy.name ?? sub.submittedBy.email,
      submitted_at: sub.submittedAt ? sub.submittedAt.toISOString() : "",
      notes: sub.notes ?? "",
    };

    for (const result of sub.results) {
      rows.push({
        ...baseRow,
        candidate: result.candidate.name,
        party: result.candidate.party ?? "",
        votes: result.votes,
      });
    }
  }

  const headers = [
    { key: "event_name", label: "Event" },
    { key: "event_type", label: "Type" },
    { key: "office", label: "Office" },
    { key: "location", label: "Location" },
    { key: "ward", label: "Ward" },
    { key: "poll_number", label: "Poll #" },
    { key: "address", label: "Address" },
    { key: "candidate", label: "Candidate" },
    { key: "party", label: "Party" },
    { key: "votes", label: "Votes" },
    { key: "total_votes", label: "Total Votes" },
    { key: "rejected_ballots", label: "Rejected Ballots" },
    { key: "percent_reporting", label: "% Reporting" },
    { key: "status", label: "Status" },
    { key: "capture_mode", label: "Capture Mode" },
    { key: "submitted_by", label: "Submitted By" },
    { key: "submitted_at", label: "Submitted At" },
    { key: "notes", label: "Notes" },
  ];

  const csv = toCsv(rows, headers);
  const filename = `capture-results-${event.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
