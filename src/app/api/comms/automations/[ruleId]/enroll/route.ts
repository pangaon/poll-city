import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { triggerAutomation } from "@/lib/automation/automation-engine";
import { z } from "zod";

export const dynamic = "force-dynamic";

const enrollSchema = z.object({ contactId: z.string() });

/** POST /api/comms/automations/[ruleId]/enroll — manually enroll a contact */
export async function POST(req: NextRequest, { params }: { params: { ruleId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const rule = await prisma.automationRule.findUnique({
    where: { id: params.ruleId },
    select: { campaignId: true, isActive: true, trigger: true },
  });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { forbidden } = await guardCampaignRoute(session!.user.id, rule.campaignId, "contacts:write");
  if (forbidden) return forbidden;

  if (!rule.isActive) {
    return NextResponse.json({ error: "Rule is not active" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const contact = await prisma.contact.findFirst({
    where: { id: parsed.data.contactId, campaignId: rule.campaignId, deletedAt: null },
    select: { id: true },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const enrolled = await triggerAutomation({
    campaignId: rule.campaignId,
    contactId: parsed.data.contactId,
    trigger: "manual",
  });

  return NextResponse.json({ enrolled });
}
