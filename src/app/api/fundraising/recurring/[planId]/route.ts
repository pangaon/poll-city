import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";
import { audit } from "@/lib/audit";

const updateSchema = z.object({
  action: z.enum(["pause", "resume", "cancel"]).optional(),
  amount: z.number().positive().optional(),
  endDate: z.string().datetime().nullable().optional(),
  cancellationReason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { planId } = await params;
  const plan = await prisma.recurrencePlan.findUnique({ where: { id: planId }, select: { campaignId: true, status: true } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, plan.campaignId);
  if (forbidden) return forbidden;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const updateData: Record<string, unknown> = {};
  if (parsed.data.amount) updateData.amount = parsed.data.amount;
  if (parsed.data.endDate !== undefined) {
    updateData.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
  }

  if (parsed.data.action === "pause") updateData.status = "paused";
  if (parsed.data.action === "resume") updateData.status = "active";
  if (parsed.data.action === "cancel") {
    updateData.status = "cancelled";
    updateData.cancelledAt = new Date();
    updateData.cancellationReason = parsed.data.cancellationReason;
  }

  const updated = await prisma.recurrencePlan.update({ where: { id: planId }, data: updateData });

  await audit(prisma, `recurring.${parsed.data.action ?? "update"}`, {
    campaignId: plan.campaignId,
    userId: session!.user.id,
    entityId: planId,
    entityType: "RecurrencePlan",
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ data: updated });
}
