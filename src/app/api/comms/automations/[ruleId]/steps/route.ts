import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const stepSchema = z.object({
  stepOrder: z.number().int().min(1),
  stepType: z.enum(["send_email", "send_sms", "wait_days", "add_tag", "remove_tag", "add_to_segment", "remove_from_segment"]),
  config: z.record(z.unknown()).optional(),
});

const bulkSchema = z.object({ steps: z.array(stepSchema) });

/** PUT /api/comms/automations/[ruleId]/steps — replace all steps atomically */
export async function PUT(req: NextRequest, { params }: { params: { ruleId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const rule = await prisma.automationRule.findUnique({ where: { id: params.ruleId }, select: { campaignId: true, isActive: true } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { forbidden } = await guardCampaignRoute(session!.user.id, rule.campaignId, "contacts:write");
  if (forbidden) return forbidden;

  if (rule.isActive) {
    return NextResponse.json({ error: "Deactivate the rule before editing steps" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Atomic replace: delete old steps, create new ones
  await prisma.$transaction([
    prisma.automationStep.deleteMany({ where: { ruleId: params.ruleId } }),
    prisma.automationStep.createMany({
      data: parsed.data.steps.map((s) => ({
        ruleId: params.ruleId,
        stepOrder: s.stepOrder,
        stepType: s.stepType,
        config: (s.config ?? {}) as object,
      })),
    }),
  ]);

  const steps = await prisma.automationStep.findMany({
    where: { ruleId: params.ruleId },
    orderBy: { stepOrder: "asc" },
  });

  return NextResponse.json({ steps });
}
