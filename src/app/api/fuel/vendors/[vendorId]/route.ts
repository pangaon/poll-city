import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  contactName: z.string().max(200).nullish(),
  email: z.string().email().nullish(),
  phone: z.string().max(50).nullish(),
  address: z.string().max(500).nullish(),
  city: z.string().max(100).nullish(),
  province: z.string().max(10).optional(),
  website: z.string().url().nullish(),
  notes: z.string().max(5000).nullish(),
  cuisineTypes: z.array(z.string()).optional(),
  serviceTags: z.array(z.string()).optional(),
  dietaryOptions: z.array(z.string()).optional(),
  sameDay: z.boolean().optional(),
  partnershipTier: z.number().int().min(0).max(2).optional(),
  reliabilityScore: z.number().min(0).max(100).optional(),
  status: z.enum(["active", "inactive", "vetting"]).optional(),
});

async function guardVendorAccess(
  userId: string,
  campaignId: string,
  vendorId: string
): Promise<{ ok: boolean; vendor?: Awaited<ReturnType<typeof prisma.foodVendor.findFirst>> }> {
  const [membership, vendor] = await Promise.all([
    prisma.membership.findUnique({ where: { userId_campaignId: { userId, campaignId } } }),
    prisma.foodVendor.findFirst({
      where: { id: vendorId, deletedAt: null, OR: [{ campaignId }, { campaignId: null }] },
      include: {
        pricingTiers: { where: { isActive: true } },
        agreements: { where: { campaignId } },
        outreachLogs: { where: { campaignId }, orderBy: { createdAt: "desc" }, take: 20 },
        _count: { select: { quotes: true } },
      },
    }),
  ]);
  if (!membership || !vendor) return { ok: false };
  return { ok: true, vendor };
}

export async function GET(req: NextRequest, { params }: { params: { vendorId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const { ok, vendor } = await guardVendorAccess(session!.user.id, campaignId, params.vendorId);
  if (!ok || !vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: vendor });
}

export async function PATCH(req: NextRequest, { params }: { params: { vendorId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const vendor = await prisma.foodVendor.findFirst({
    where: { id: params.vendorId, deletedAt: null, OR: [{ campaignId: body.campaignId }, { campaignId: null }] },
  });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { campaignId: _c, ...updates } = body;
  const updated = await prisma.foodVendor.update({
    where: { id: params.vendorId },
    data: {
      ...updates,
      notes: updates.notes !== undefined ? sanitizeUserText(updates.notes) : undefined,
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { vendorId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  await prisma.foodVendor.update({
    where: { id: params.vendorId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
