import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

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
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "VOLUNTEER_LEADER"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const [locations, submissions, issues, pendingReview] = await Promise.all([
    prisma.captureLocation.findMany({
      where: { eventId: params.eventId },
      select: { id: true, name: true, ward: true, district: true, pollNumber: true, status: true, expectedTurnout: true },
      orderBy: [{ ward: "asc" }, { name: "asc" }],
    }),
    prisma.captureSubmission.findMany({
      where: { eventId: params.eventId, status: { not: "draft" } },
      include: {
        results: { include: { candidate: { select: { id: true, name: true, party: true } } } },
        submittedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.captureIssueReport.findMany({
      where: { eventId: params.eventId, resolvedAt: null },
      include: {
        location: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.captureSubmission.count({
      where: { eventId: params.eventId, status: "pending_review" },
    }),
  ]);

  // Aggregate votes by candidate across approved submissions only
  const candidateTotals: Record<string, { name: string; party: string | null; votes: number }> = {};
  for (const c of event.candidates) {
    candidateTotals[c.id] = { name: c.name, party: c.party, votes: 0 };
  }

  const approvedSubmissions = submissions.filter((s) => s.status === "approved");

  // Use latest approved per location — prevents double-counting after revisions
  const latestApprovedPerLocation = new Map();
  for (const sub of approvedSubmissions) {
    const prev = latestApprovedPerLocation.get(sub.locationId);
    if (!prev || sub.createdAt > prev.createdAt) latestApprovedPerLocation.set(sub.locationId, sub);
  }
  for (const sub of Array.from(latestApprovedPerLocation.values())) {
    for (const r of sub.results) {
      if (candidateTotals[r.candidate.id]) {
        candidateTotals[r.candidate.id].votes += r.votes;
      }
    }
  }

  // Location completion status
  const submittedLocationIds = new Set(
    approvedSubmissions.map((s) => s.locationId)
  );
  const pendingLocationIds = new Set(
    submissions.filter((s) => s.status === "pending_review").map((s) => s.locationId)
  );
  const flaggedLocationIds = new Set(
    submissions.filter((s) => s.status === "flagged").map((s) => s.locationId)
  );

  const locationStatus = locations.map((loc) => ({
    ...loc,
    hasApproved: submittedLocationIds.has(loc.id),
    hasPending: pendingLocationIds.has(loc.id) && !submittedLocationIds.has(loc.id),
    hasFlagged: flaggedLocationIds.has(loc.id),
  }));

  const completionRate = locations.length > 0
    ? (submittedLocationIds.size / locations.length) * 100
    : 0;

  // Recent activity (last 20 submissions)
  const recentActivity = submissions.slice(0, 20).map((s) => ({
    id: s.id,
    locationId: s.locationId,
    status: s.status,
    submittedBy: s.submittedBy,
    submittedAt: s.submittedAt,
    createdAt: s.createdAt,
    totalVotes: s.totalVotes,
    issueFlag: s.issueFlag,
  }));

  return NextResponse.json({
    data: {
      event: {
        id: event.id,
        name: event.name,
        eventType: event.eventType,
        status: event.status,
        office: event.office,
        requireDoubleEntry: event.requireDoubleEntry,
      },
      candidateTotals: Object.entries(candidateTotals).map(([id, v]) => ({ id, ...v })),
      locationStatus,
      completionRate: Math.round(completionRate * 10) / 10,
      totalLocations: locations.length,
      approvedCount: submittedLocationIds.size,
      pendingCount: pendingReview,
      flaggedCount: flaggedLocationIds.size,
      unreportedCount: locations.length - submittedLocationIds.size,
      activeIssues: issues,
      recentActivity,
      generatedAt: new Date().toISOString(),
    },
  });
}
