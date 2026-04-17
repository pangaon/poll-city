import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  campaignId: z.string(),
  status: z.enum(["draft", "awaiting_approval", "approved", "scheduled", "sent", "cancelled"]).optional(),
  notes: z.string().optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  commsRef: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; actionId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { campaignId, scheduledFor, status, ...rest } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const existing = await prisma.reputationResponseAction.findUnique({
    where: { id: params.actionId, issueId: params.id, campaignId },
    select: { status: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { ...rest };
  if (status) updateData.status = status;
  if (scheduledFor !== undefined) updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;

  // Track approval
  if (status === "approved") {
    updateData.approvedByUserId = session!.user.id;
  }
  // Track execution
  if (status === "sent") {
    updateData.executedAt = new Date();
  }

  const updated = await prisma.reputationResponseAction.update({
    where: { id: params.actionId },
    data: updateData,
  });

  await audit(prisma, "reputation.action.updated", {
    campaignId,
    userId: session!.user.id,
    entityId: params.actionId,
    entityType: "ReputationResponseAction",
    before: { status: existing.status },
    after: { status },
  });

  return NextResponse.json({ action: updated });
}
