import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";
import { deactivateSource, pauseSource, updateActivationSettings } from "@/lib/sources/subscription-service";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { sourceId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const p = req.nextUrl.searchParams;
  const campaignId = p.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const activation = await prisma.campaignSourceActivation.findFirst({
    where: { campaignId: campaignId!, sourceId: params.sourceId },
    include: { source: true },
  });

  if (!activation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ activation });
}

const UpdateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("disable"), campaignId: z.string() }),
  z.object({ action: z.literal("pause"), campaignId: z.string(), mutedUntil: z.string().datetime().optional() }),
  z.object({ action: z.literal("enable"), campaignId: z.string() }),
  z.object({
    action: z.literal("update"),
    campaignId: z.string(),
    customAlertThreshold: z.enum(["all_alerts", "important_only", "critical_only", "digest_only", "muted"]).optional(),
    monitoringModesJson: z.array(z.string()).optional(),
    keywordProfileJson: z.array(z.string()).optional(),
    mentionTrackingEnabled: z.boolean().optional(),
    sentimentTrackingEnabled: z.boolean().optional(),
    issueTrackingEnabled: z.boolean().optional(),
    opponentTrackingEnabled: z.boolean().optional(),
    dailyDigestEnabled: z.boolean().optional(),
    realTimeAlertsEnabled: z.boolean().optional(),
  }),
]);

export async function PATCH(req: NextRequest, { params }: { params: { sourceId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { action, campaignId } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:write");
  if (forbidden) return forbidden;

  const existing = await prisma.campaignSourceActivation.findFirst({
    where: { campaignId, sourceId: params.sourceId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Activation not found" }, { status: 404 });

  switch (action) {
    case "disable":
      await deactivateSource(campaignId, params.sourceId);
      break;
    case "pause": {
      const mutedUntil = "mutedUntil" in parsed.data && parsed.data.mutedUntil
        ? new Date(parsed.data.mutedUntil)
        : undefined;
      await pauseSource(campaignId, params.sourceId, mutedUntil);
      break;
    }
    case "enable":
      await prisma.campaignSourceActivation.updateMany({
        where: { campaignId, sourceId: params.sourceId },
        data: { status: "active", mutedUntil: null },
      });
      break;
    case "update": {
      const { action: _, campaignId: __, ...updateData } = parsed.data;
      await updateActivationSettings(existing.id, campaignId, {
        ...updateData,
        updatedByUserId: session!.user.id,
      });
      break;
    }
  }

  const updated = await prisma.campaignSourceActivation.findFirst({
    where: { campaignId, sourceId: params.sourceId },
    include: { source: { select: { id: true, name: true, slug: true, sourceType: true } } },
  });
  return NextResponse.json({ activation: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { sourceId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const p = req.nextUrl.searchParams;
  const campaignId = p.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:write");
  if (forbidden) return forbidden;

  await deactivateSource(campaignId!, params.sourceId);
  return NextResponse.json({ success: true });
}
