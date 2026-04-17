/**
 * GET   /api/qr/[qrId]?campaignId=xxx  — QR code detail
 * PATCH /api/qr/[qrId]                 — update QR code
 * DELETE /api/qr/[qrId]               — archive QR code (soft)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { buildQrUrl, buildQrImageUrl } from "@/lib/qr/generate";

const patchSchema = z.object({
  label: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  locationName: z.string().max(300).optional(),
  locationAddress: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  landingConfig: z.record(z.unknown()).optional(),
  brandOverride: z.record(z.unknown()).optional().nullable(),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  teaserMode: z.boolean().optional(),
});

async function resolveQr(qrId: string, campaignId: string) {
  return prisma.qrCode.findFirst({
    where: { id: qrId, campaignId },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { qrId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const qrCode = await prisma.qrCode.findFirst({
    where: { id: params.qrId, campaignId },
    include: {
      _count: {
        select: { scans: true, prospects: true, signOpportunities: true },
      },
    },
  });

  if (!qrCode) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const baseUrl = process.env.NEXTAUTH_URL;
  return NextResponse.json({
    ...qrCode,
    publicUrl: buildQrUrl(qrCode.token, baseUrl),
    qrImageUrl: buildQrImageUrl(qrCode.token, 400, baseUrl),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { qrId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const campaignId = body.campaignId ?? req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const existing = await resolveQr(params.qrId, campaignId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 400 });
  }

  const { landingConfig, brandOverride, startAt, endAt, ...rest } = parsed.data;
  const updated = await prisma.qrCode.update({
    where: { id: params.qrId },
    data: {
      ...rest,
      ...(landingConfig !== undefined ? { landingConfig: landingConfig as Prisma.InputJsonValue } : {}),
      ...(brandOverride !== undefined ? { brandOverride: brandOverride === null ? Prisma.JsonNull : brandOverride as Prisma.InputJsonValue } : {}),
      startAt: startAt !== undefined ? (startAt ? new Date(startAt) : null) : undefined,
      endAt: endAt !== undefined ? (endAt ? new Date(endAt) : null) : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { qrId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const existing = await resolveQr(params.qrId, campaignId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.qrCode.update({
    where: { id: params.qrId },
    data: { status: "archived" },
  });

  return NextResponse.json({ ok: true });
}
