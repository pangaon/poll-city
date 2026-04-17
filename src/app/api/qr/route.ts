/**
 * GET  /api/qr?campaignId=xxx  — list QR codes for a campaign
 * POST /api/qr                 — create a new QR code
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { generateQrSlug, buildQrUrl, buildQrImageUrl } from "@/lib/qr/generate";
import type { QrCodeType, QrPlacementType, QrFunnelType } from "@prisma/client";

const createSchema = z.object({
  campaignId: z.string(),
  type: z.string() as z.ZodType<QrCodeType>,
  placementType: z.string().optional() as z.ZodType<QrPlacementType | undefined>,
  funnelType: z.string().optional() as z.ZodType<QrFunnelType | undefined>,
  label: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  locationName: z.string().max(300).optional(),
  locationAddress: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  wardId: z.string().optional(),
  entityId: z.string().optional(),
  landingConfig: z.record(z.unknown()).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  teaserMode: z.boolean().optional(),
  slugPrefix: z.string().max(30).optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const typeFilter = sp.get("type");
  const statusFilter = sp.get("status");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") ?? "20", 10));
  const skip = (page - 1) * limit;

  const where = {
    campaignId,
    ...(typeFilter ? { type: typeFilter as QrCodeType } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [total, qrCodes] = await Promise.all([
    prisma.qrCode.count({ where }),
    prisma.qrCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        token: true,
        slug: true,
        type: true,
        placementType: true,
        funnelType: true,
        label: true,
        description: true,
        locationName: true,
        locationAddress: true,
        lat: true,
        lng: true,
        status: true,
        scanCount: true,
        teaserMode: true,
        startAt: true,
        endAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            prospects: true,
            signOpportunities: true,
          },
        },
      },
    }),
  ]);

  const baseUrl = process.env.NEXTAUTH_URL;
  const enriched = qrCodes.map((qr) => ({
    ...qr,
    publicUrl: buildQrUrl(qr.token, baseUrl),
    qrImageUrl: buildQrImageUrl(qr.token, 200, baseUrl),
    prospectCount: qr._count.prospects,
    signOpportunityCount: qr._count.signOpportunities,
  }));

  return NextResponse.json({ qrCodes: enriched, total, page, limit });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;

  const { forbidden } = await guardCampaignRoute(session!.user.id, data.campaignId);
  if (forbidden) return forbidden;

  const slug = await generateQrSlug(data.slugPrefix);

  const qrCode = await prisma.qrCode.create({
    data: {
      campaignId: data.campaignId,
      type: data.type,
      placementType: data.placementType,
      funnelType: data.funnelType ?? "general_engagement",
      label: data.label,
      description: data.description,
      locationName: data.locationName,
      locationAddress: data.locationAddress,
      lat: data.lat,
      lng: data.lng,
      wardId: data.wardId,
      entityId: data.entityId,
      landingConfig: (data.landingConfig ?? {}) as Prisma.InputJsonValue,
      slug,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
      teaserMode: data.teaserMode ?? false,
      createdById: session!.user.id,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL;
  return NextResponse.json({
    ...qrCode,
    publicUrl: buildQrUrl(qrCode.token, baseUrl),
    qrImageUrl: buildQrImageUrl(qrCode.token, 300, baseUrl),
  }, { status: 201 });
}
