import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(200),
  contactName: z.string().max(200).nullish(),
  email: z.string().email().nullish(),
  phone: z.string().max(50).nullish(),
  address: z.string().max(500).nullish(),
  city: z.string().max(100).nullish(),
  province: z.string().max(10).default("ON"),
  website: z.string().url().nullish(),
  notes: z.string().max(5000).nullish(),
  cuisineTypes: z.array(z.string()).default([]),
  serviceTags: z.array(z.string()).default([]),
  dietaryOptions: z.array(z.string()).default([]),
  sameDay: z.boolean().default(false),
  partnershipTier: z.number().int().min(0).max(2).default(0),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const city = req.nextUrl.searchParams.get("city") ?? "";
  const sameDay = req.nextUrl.searchParams.get("sameDay");
  const dietary = req.nextUrl.searchParams.get("dietary");
  const tag = req.nextUrl.searchParams.get("tag");

  const vendors = await prisma.foodVendor.findMany({
    where: {
      OR: [{ campaignId }, { campaignId: null }],
      deletedAt: null,
      status: { not: "inactive" },
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      ...(sameDay === "true" ? { sameDay: true } : {}),
      ...(dietary ? { dietaryOptions: { has: dietary } } : {}),
      ...(tag ? { serviceTags: { has: tag } } : {}),
    },
    include: {
      pricingTiers: { where: { isActive: true }, orderBy: { pricePerHead: "asc" } },
      _count: { select: { quotes: true, outreachLogs: true } },
    },
    orderBy: [{ partnershipTier: "desc" }, { reliabilityScore: "desc" }, { name: "asc" }],
    take: 100,
  });

  return NextResponse.json({ data: vendors });
}

export async function POST(req: NextRequest) {
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

  const vendor = await prisma.foodVendor.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      contactName: body.contactName?.trim() ?? null,
      email: body.email?.toLowerCase().trim() ?? null,
      phone: body.phone?.trim() ?? null,
      address: body.address?.trim() ?? null,
      city: body.city?.trim() ?? null,
      province: body.province,
      website: body.website?.trim() ?? null,
      notes: sanitizeUserText(body.notes),
      cuisineTypes: body.cuisineTypes,
      serviceTags: body.serviceTags,
      dietaryOptions: body.dietaryOptions,
      sameDay: body.sameDay,
      partnershipTier: body.partnershipTier,
    },
  });

  return NextResponse.json({ data: vendor }, { status: 201 });
}
