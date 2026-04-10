import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

// Walk time constants (minutes)
const MINUTES_PER_DOOR = 1.5;   // avg door knock + response
const MINUTES_PER_WALK = 1.0;   // avg walk between consecutive doors

type Params = { params: Promise<{ routeId: string }> };

// ── POST /api/field/routes/[routeId]/optimize ─────────────────────────────────
//
// Computes turf balance stats and sorts targets into an optimized walk order.
// Does NOT commit the order — returns a recommendation the UI can apply via PATCH.
//
// Turf balancing rules (ROUTING_AND_PACKAGING_RULES.md §5):
//   Balanced:  40–80 doors  AND  60–90 min
//   Too long:  >80 doors or >90 min → split recommendation
//   Too short: <40 doors or <60 min → merge recommendation

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { routeId } = await params;

  const body = (await req.json().catch(() => ({}))) as {
    campaignId?: string;
    targetDoorsMin?: number;
    targetDoorsMax?: number;
    targetMinutesMin?: number;
    targetMinutesMax?: number;
  };

  if (!body.campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    body.campaignId,
    "canvassing:write",
  );
  if (forbidden) return forbidden;

  const route = await prisma.route.findFirst({
    where: { id: routeId, campaignId: body.campaignId, deletedAt: null },
  });

  if (!route) {
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  }

  if (route.isLocked) {
    return NextResponse.json({ error: "Route is locked and cannot be re-optimized" }, { status: 409 });
  }

  if (route.status === "in_progress" || route.status === "completed") {
    return NextResponse.json(
      { error: "Cannot re-optimize a route that is in progress or completed" },
      { status: 409 },
    );
  }

  // Fetch all active targets with contact/household address data
  const targets = await prisma.fieldTarget.findMany({
    where: { routeId, deletedAt: null },
    include: {
      contact: { select: { id: true, address1: true, municipalPoll: true } },
      household: { select: { id: true, address1: true, ward: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const doorCount = targets.length;

  // ── Sort algorithm ────────────────────────────────────────────────────────
  // Priority: poll number → street name → civic number (parsed from address)
  function extractCivicNumber(addr: string | null | undefined): number {
    if (!addr) return 9999;
    const match = addr.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 9999;
  }

  function extractStreet(addr: string | null | undefined): string {
    if (!addr) return "zzz";
    return addr.replace(/^\d+\s*/, "").trim().toLowerCase();
  }

  const sorted = [...targets].sort((a, b) => {
    const pollA = a.contact?.municipalPoll ?? "zzz";
    const pollB = b.contact?.municipalPoll ?? "zzz";
    const pollCmp = pollA.localeCompare(pollB, undefined, { numeric: true });
    if (pollCmp !== 0) return pollCmp;

    const addrA = a.contact?.address1 ?? a.household?.address1;
    const addrB = b.contact?.address1 ?? b.household?.address1;
    const streetCmp = extractStreet(addrA).localeCompare(extractStreet(addrB));
    if (streetCmp !== 0) return streetCmp;

    return extractCivicNumber(addrA) - extractCivicNumber(addrB);
  });

  // ── Walk time estimate ────────────────────────────────────────────────────
  const estimatedMinutes = Math.round(
    doorCount * MINUTES_PER_DOOR + Math.max(0, doorCount - 1) * MINUTES_PER_WALK,
  );

  // ── Balance assessment ────────────────────────────────────────────────────
  const doorsMin = body.targetDoorsMin ?? 40;
  const doorsMax = body.targetDoorsMax ?? 80;
  const minsMin = body.targetMinutesMin ?? 60;
  const minsMax = body.targetMinutesMax ?? 90;

  type BalanceStatus = "balanced" | "too_long" | "too_short" | "empty";
  let balanceStatus: BalanceStatus = "balanced";
  let recommendation: string | null = null;

  if (doorCount === 0) {
    balanceStatus = "empty";
    recommendation = "Route has no targets. Add targets before optimizing.";
  } else if (doorCount > doorsMax || estimatedMinutes > minsMax) {
    balanceStatus = "too_long";
    const excess = doorCount > doorsMax
      ? `${doorCount - doorsMax} doors over limit`
      : `${estimatedMinutes - minsMax} min over limit`;
    recommendation = `Route is too long (${excess}). Consider splitting into two routes.`;
  } else if (doorCount < doorsMin || estimatedMinutes < minsMin) {
    balanceStatus = "too_short";
    const deficit = doorCount < doorsMin
      ? `${doorsMin - doorCount} doors under minimum`
      : `${minsMin - estimatedMinutes} min under minimum`;
    recommendation = `Route is too short (${deficit}). Consider merging with an adjacent route.`;
  }

  // ── Persist updated sort order and estimated minutes ──────────────────────
  await prisma.$transaction(
    sorted.map((t, idx) =>
      prisma.fieldTarget.update({
        where: { id: t.id },
        data: { sortOrder: idx },
      }),
    ),
  );

  await prisma.route.update({
    where: { id: routeId },
    data: { estimatedMinutes, totalStops: doorCount },
  });

  return NextResponse.json({
    data: {
      routeId,
      doorCount,
      estimatedMinutes,
      balanceStatus,
      recommendation,
      targets: sorted.map((t, idx) => ({
        id: t.id,
        sortOrder: idx,
        address: t.contact?.address1 ?? t.household?.address1 ?? null,
        poll: t.contact?.municipalPoll ?? null,
        status: t.status,
        priority: t.priority,
      })),
    },
  });
}
