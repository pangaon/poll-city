import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";
import { DEFAULT_COMPLIANCE_CONFIG } from "@/lib/fundraising/compliance";

const updateSchema = z.object({
  campaignId: z.string(),
  annualLimitPerDonor: z.number().min(0).max(1000000),
  anonymousLimit: z.number().min(0).max(10000),
  allowCorporate: z.boolean(),
  allowUnion: z.boolean(),
  blockMode: z.enum(["review", "block"]),
  warningThreshold: z.number().min(0).max(1),
  notes: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const config = await prisma.fundraisingComplianceConfig.findUnique({
    where: { campaignId: campaignId! },
    include: { updatedBy: { select: { id: true, name: true } } },
  });

  // Return DB record or sensible defaults (never expose raw error)
  return NextResponse.json({
    data: config ?? {
      campaignId: campaignId,
      annualLimitPerDonor: DEFAULT_COMPLIANCE_CONFIG.annualLimitPerDonor,
      anonymousLimit: DEFAULT_COMPLIANCE_CONFIG.anonymousLimit,
      allowCorporate: DEFAULT_COMPLIANCE_CONFIG.allowCorporate,
      allowUnion: DEFAULT_COMPLIANCE_CONFIG.allowUnion,
      blockMode: DEFAULT_COMPLIANCE_CONFIG.blockMode,
      warningThreshold: DEFAULT_COMPLIANCE_CONFIG.warningThreshold,
      notes: null,
      updatedBy: null,
      updatedAt: null,
    },
  });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation error" }, { status: 400 });

  const { campaignId, ...values } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const config = await prisma.fundraisingComplianceConfig.upsert({
    where: { campaignId },
    create: {
      campaignId,
      ...values,
      updatedByUserId: session!.user.id,
    },
    update: {
      ...values,
      updatedByUserId: session!.user.id,
    },
    include: { updatedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ data: config });
}
