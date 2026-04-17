import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(200),
  minHeads: z.number().int().positive().nullish(),
  maxHeads: z.number().int().positive().nullish(),
  pricePerHead: z.number().positive(),
  includes: z.string().max(500).nullish(),
  leadTimeDays: z.number().int().min(0).default(1),
  notes: z.string().max(2000).nullish(),
});

export async function GET(req: NextRequest, { params }: { params: { vendorId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tiers = await prisma.foodVendorPricingTier.findMany({
    where: { vendorId: params.vendorId, isActive: true },
    orderBy: { pricePerHead: "asc" },
  });

  return NextResponse.json({ data: tiers });
}

export async function POST(req: NextRequest, { params }: { params: { vendorId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
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

  const tier = await prisma.foodVendorPricingTier.create({
    data: {
      vendorId: params.vendorId,
      name: body.name.trim(),
      minHeads: body.minHeads ?? null,
      maxHeads: body.maxHeads ?? null,
      pricePerHead: body.pricePerHead,
      includes: body.includes?.trim() ?? null,
      leadTimeDays: body.leadTimeDays,
      notes: body.notes?.trim() ?? null,
    },
  });

  return NextResponse.json({ data: tier }, { status: 201 });
}
