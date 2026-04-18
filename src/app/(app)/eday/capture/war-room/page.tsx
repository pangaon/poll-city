import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import WarRoomClient from "./war-room-client";

export const metadata = { title: "Quick Capture War Room — Poll City" };

export default async function CaptureWarRoomPage({
  searchParams,
}: {
  searchParams: { eventId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.activeCampaignId) redirect("/login");

  const campaignId = session.user.activeCampaignId;
  const eventId = searchParams.eventId;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session.user.id, campaignId } },
    select: { role: true, status: true },
  });

  if (
    !membership ||
    membership.status !== "active" ||
    !["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "VOLUNTEER_LEADER"].includes(membership.role)
  ) {
    redirect("/eday");
  }

  const isManager = ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role);

  // Load all active events for the selector
  const events = await prisma.captureEvent.findMany({
    where: { campaignId, deletedAt: null, status: { in: ["active", "locked"] } },
    select: { id: true, name: true, eventType: true, status: true, office: true },
    orderBy: { createdAt: "desc" },
  });

  // Load initial war room data for the selected event (or first active)
  const activeEventId = eventId ?? events[0]?.id ?? null;

  let initialData = null;
  if (activeEventId) {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/capture/events/${activeEventId}/war-room`,
      {
        headers: {
          Cookie: `next-auth.session-token=${session}`, // pass session for server-side fetch
        },
        cache: "no-store",
      }
    ).catch(() => null);

    if (res?.ok) {
      const json = await res.json().catch(() => null);
      initialData = json?.data ?? null;
    }

    // If server-side fetch failed (common in dev), query prisma directly
    if (!initialData && activeEventId) {
      const event = await prisma.captureEvent.findFirst({
        where: { id: activeEventId, campaignId, deletedAt: null },
        include: { candidates: { orderBy: { ballotOrder: "asc" } } },
      });

      if (event) {
        const [locations, submissions, issues] = await Promise.all([
          prisma.captureLocation.findMany({
            where: { eventId: activeEventId },
            select: { id: true, name: true, ward: true, district: true, pollNumber: true, status: true, expectedTurnout: true },
            orderBy: [{ ward: "asc" }, { name: "asc" }],
          }),
          prisma.captureSubmission.findMany({
            where: { eventId: activeEventId, status: { not: "draft" } },
            include: {
              results: { include: { candidate: { select: { id: true, name: true, party: true } } } },
              submittedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.captureIssueReport.findMany({
            where: { eventId: activeEventId, resolvedAt: null },
            include: {
              location: { select: { id: true, name: true } },
              reportedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
        ]);

        const candidateTotals: Record<string, { id: string; name: string; party: string | null; votes: number }> = {};
        for (const c of event.candidates) candidateTotals[c.id] = { id: c.id, name: c.name, party: c.party, votes: 0 };

        const approvedSubs = submissions.filter((s) => s.status === "approved");
        for (const sub of approvedSubs) {
          for (const r of sub.results) {
            if (candidateTotals[r.candidate.id]) candidateTotals[r.candidate.id].votes += r.votes;
          }
        }

        const approvedIds = new Set(approvedSubs.map((s) => s.locationId));
        const pendingIds = new Set(submissions.filter((s) => s.status === "pending_review").map((s) => s.locationId));
        const flaggedIds = new Set(submissions.filter((s) => s.status === "flagged").map((s) => s.locationId));

        initialData = {
          event: { id: event.id, name: event.name, eventType: event.eventType, status: event.status, office: event.office, requireDoubleEntry: event.requireDoubleEntry },
          candidateTotals: Object.values(candidateTotals),
          locationStatus: locations.map((l) => ({
            ...l,
            hasApproved: approvedIds.has(l.id),
            hasPending: pendingIds.has(l.id) && !approvedIds.has(l.id),
            hasFlagged: flaggedIds.has(l.id),
          })),
          completionRate: locations.length > 0 ? Math.round((approvedIds.size / locations.length) * 1000) / 10 : 0,
          totalLocations: locations.length,
          approvedCount: approvedIds.size,
          pendingCount: submissions.filter((s) => s.status === "pending_review").length,
          flaggedCount: flaggedIds.size,
          unreportedCount: locations.length - approvedIds.size,
          activeIssues: issues,
          recentActivity: submissions.slice(0, 20).map((s) => ({
            id: s.id,
            locationId: s.locationId,
            status: s.status,
            submittedBy: s.submittedBy,
            submittedAt: s.submittedAt?.toISOString() ?? null,
            createdAt: s.createdAt.toISOString(),
            totalVotes: s.totalVotes,
            issueFlag: s.issueFlag,
          })),
          pendingSubmissions: submissions
            .filter((s) => s.status === "pending_review" || s.status === "flagged")
            .map((s) => ({
              ...s,
              submittedAt: s.submittedAt?.toISOString() ?? null,
              createdAt: s.createdAt.toISOString(),
              updatedAt: s.updatedAt.toISOString(),
              reviewedAt: null,
            })),
          generatedAt: new Date().toISOString(),
        };
      }
    }
  }

  return (
    <WarRoomClient
      campaignId={campaignId}
      events={events}
      activeEventId={activeEventId}
      initialData={initialData}
      isManager={isManager}
    />
  );
}
