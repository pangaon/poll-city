import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  enrollOnce: z.boolean().optional(),
  triggerFilter: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { ruleId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const rule = await prisma.automationRule.findUnique({
    where: { id: params.ruleId },
    include: {
      steps: { orderBy: { stepOrder: "asc" } },
      _count: { select: { enrollments: true } },
      enrollments: {
        select: { id: true, status: true, currentStepOrder: true, nextDueAt: true, enrolledAt: true },
        orderBy: { enrolledAt: "desc" },
        take: 20,
      },
    },
  });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, rule.campaignId, "contacts:read");
  if (forbidden) return forbidden;

  return NextResponse.json({ rule });
}

export async function PATCH(req: NextRequest, { params }: { params: { ruleId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const rule = await prisma.automationRule.findUnique({ where: { id: params.ruleId }, select: { campaignId: true } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { forbidden } = await guardCampaignRoute(session!.user.id, rule.campaignId, "contacts:write");
  if (forbidden) return forbidden;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { triggerFilter, ...rest } = parsed.data;
  const updated = await prisma.automationRule.update({
    where: { id: params.ruleId },
    data: { ...rest, ...(triggerFilter !== undefined ? { triggerFilter: triggerFilter as object } : {}) },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  return NextResponse.json({ rule: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { ruleId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const rule = await prisma.automationRule.findUnique({ where: { id: params.ruleId }, select: { campaignId: true } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { forbidden } = await guardCampaignRoute(session!.user.id, rule.campaignId, "contacts:write");
  if (forbidden) return forbidden;

  await prisma.automationRule.delete({ where: { id: params.ruleId } });
  return NextResponse.json({ ok: true });
}
