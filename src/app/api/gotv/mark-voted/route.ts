/**
 * POST /api/gotv/mark-voted — Mark a single contact as voted.
 *
 * MUST complete in under 200ms. Used live on election day.
 * Returns the updated gap number immediately so the war room
 * display updates without a separate poll.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { executeAction } from "@/lib/operations/action-engine";
import { getGotvSummaryMetrics } from "@/lib/operations/metrics-truth";

export async function POST(req: NextRequest) {
  const start = Date.now();

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { contactId } = await req.json();
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  // Verify contact belongs to user's campaign
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, campaignId: true, firstName: true, lastName: true, voted: true },
  });

  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, contact.campaignId, "gotv:write");
  if (forbidden) return forbidden;

  const result = await executeAction(
    "gotv.mark_voted",
    { contactId },
    { campaignId: contact.campaignId, actorUserId: session!.user.id },
  );

  const metrics = await getGotvSummaryMetrics(contact.campaignId);

  const duration = Date.now() - start;
  if (duration > 200) {
    console.warn(`[SLOW] mark-voted took ${duration}ms (target: 200ms)`);
  }

  return NextResponse.json({
    ok: result.ok,
    action: result.action,
    alreadyVoted: Boolean(result.details.alreadyVoted),
    contact: { id: contact.id, name: `${contact.firstName} ${contact.lastName}` },
    gap: metrics.gap,
    supportersVoted: metrics.supportersVoted,
    winThreshold: metrics.winThreshold,
    drillThrough: metrics.drillThrough,
    duration,
  }, { headers: { "Cache-Control": "no-store" } });
}
