/**
 * POST /api/gotv/mark-voted — Mark a single contact as voted.
 *
 * MUST complete in under 200ms. Used live on election day.
 * Returns the updated gap number immediately so the war room
 * display updates without a separate poll.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { executeAction } from "@/lib/operations/action-engine";
import { getGotvSummaryMetrics } from "@/lib/operations/metrics-truth";

export async function POST(req: NextRequest) {
  const start = Date.now();

  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:write");
  if (permError) return permError;

  const { contactId } = await req.json();
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  // Verify contact belongs to user's campaign
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, campaignId: true, firstName: true, lastName: true, voted: true },
  });

  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: contact.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
