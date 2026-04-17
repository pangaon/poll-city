import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { audit } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["new", "acknowledged", "linked", "dismissed"]).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  sentiment: z.enum(["negative", "neutral", "positive", "mixed", "unknown"]).optional(),
  geography: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const alert = await prisma.reputationAlert.findUnique({
    where: { id: params.id, campaignId: campaignId! },
    include: {
      issueLinks: {
        include: { issue: { select: { id: true, title: true, status: true, severity: true } } },
      },
    },
  });

  if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ alert });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const campaignId = body.campaignId as string;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const before = await prisma.reputationAlert.findUnique({
    where: { id: params.id, campaignId },
    select: { status: true, severity: true },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.reputationAlert.update({
    where: { id: params.id },
    data: parsed.data,
  });

  await audit(prisma, "reputation.alert.updated", {
    campaignId,
    userId: session!.user.id,
    entityId: params.id,
    entityType: "ReputationAlert",
    before,
    after: parsed.data,
  });

  return NextResponse.json({ alert: updated });
}
