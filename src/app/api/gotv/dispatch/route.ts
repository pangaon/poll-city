/**
 * POST /api/gotv/dispatch — Assign a volunteer to a precinct from the race board.
 *
 * George's spec: "One-tap Dispatch button. Select volunteer → assigned immediately.
 * Card shows their avatar."
 *
 * GET — List available volunteers for dispatch
 * POST — Assign volunteer to precinct
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { executeAction } from "@/lib/operations/action-engine";

/** GET — Available volunteers for dispatch dropdown */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "gotv:read");
  if (forbidden) return forbidden;

  const volunteers = await prisma.membership.findMany({
    where: { campaignId, status: "active" },
    include: { user: { select: { id: true, name: true, email: true } } },
    take: 100,
  });

  return NextResponse.json({
    volunteers: volunteers.map((v) => ({
      id: v.userId,
      name: v.user.name ?? v.user.email?.split("@")[0] ?? "Volunteer",
      email: v.user.email,
      avatar: null,
      role: v.role,
    })),
  });
}

/** POST — Dispatch volunteer to a precinct */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { campaignId, precinctId, volunteerId, action } = await req.json();
  if (!campaignId || !precinctId || !volunteerId) {
    return NextResponse.json({ error: "campaignId, precinctId, and volunteerId required" }, { status: 400 });
  }

  const { forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, campaignId, "gotv:write");
  if (forbidden2) return forbidden2;

  // Get volunteer info
  const volunteer = await prisma.user.findUnique({
    where: { id: volunteerId },
    select: { name: true, email: true },
  });

  const actionResult = await executeAction(
    "gotv.dispatch_volunteer",
    {
      precinctId,
      volunteerId,
      dispatchAction: action,
    },
    { campaignId, actorUserId: session!.user.id },
  );

  return NextResponse.json({
    ok: true,
    action: actionResult.action,
    dispatch: {
      taskId: String(actionResult.details.taskId ?? ""),
      precinctId,
      volunteer: { id: volunteerId, name: volunteer?.name ?? "Volunteer" },
    },
  });
}
