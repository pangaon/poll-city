/**
 * POST /api/qr/batch — create up to 30 QR codes in one shot
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { generateQrSlug, buildQrUrl, buildQrImageUrl } from "@/lib/qr/generate";
import type { QrCodeType, QrPlacementType, QrFunnelType } from "@prisma/client";

const batchSchema = z.object({
  campaignId: z.string(),
  items: z.array(z.object({
    label: z.string().max(200).optional(),
    locationName: z.string().max(300).optional(),
    locationAddress: z.string().max(500).optional(),
  })).min(1).max(30),
  shared: z.object({
    type: z.string() as z.ZodType<QrCodeType>,
    funnelType: z.string().optional() as z.ZodType<QrFunnelType | undefined>,
    placementType: z.string().optional() as z.ZodType<QrPlacementType | undefined>,
    teaserMode: z.boolean().optional(),
    landingConfig: z.record(z.unknown()).optional(),
  }),
});

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 400 });
  }

  const { campaignId, items, shared } = parsed.data;

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  try {
    const created = await Promise.all(
      items.map(async (item) => {
        const slug = await generateQrSlug();
        return prisma.qrCode.create({
          data: {
            campaignId,
            type: shared.type,
            funnelType: shared.funnelType ?? "general_engagement",
            placementType: shared.placementType,
            teaserMode: shared.teaserMode ?? false,
            landingConfig: (shared.landingConfig ?? {}) as Prisma.InputJsonValue,
            label: item.label,
            locationName: item.locationName,
            locationAddress: item.locationAddress,
            slug,
            createdById: session!.user.id,
          },
          select: { id: true, token: true, label: true, locationName: true, slug: true },
        });
      }),
    );

    const baseUrl = process.env.NEXTAUTH_URL;
    const enriched = created.map((qr) => ({
      ...qr,
      publicUrl: buildQrUrl(qr.token, baseUrl),
      qrImageUrl: buildQrImageUrl(qr.token, 200, baseUrl),
    }));

    return NextResponse.json({ qrCodes: enriched, count: enriched.length }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/qr/batch]", err);
    return NextResponse.json({ error: "Failed to create QR codes. The database migration may not have run yet." }, { status: 500 });
  }
}
