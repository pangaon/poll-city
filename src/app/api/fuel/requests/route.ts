import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { sanitizeUserText } from "@/lib/security/monitor";
import { rankVendors } from "@/lib/fuel/ranking-engine";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  requestType: z.enum(["hq_daily", "event", "phone_bank", "canvassing", "sign_crew", "volunteer_meal", "other"]),
  headcount: z.number().int().positive(),
  budgetCapCad: z.number().positive().nullish(),
  neededBy: z.string().datetime(),
  location: z.string().max(500).nullish(),
  notes: z.string().max(5000).nullish(),
  dietaryNotes: z.string().max(2000).nullish(),
  linkedEventId: z.string().nullish(),
  linkedShiftId: z.string().nullish(),
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

  const status = req.nextUrl.searchParams.get("status");

  const requests = await prisma.foodRequest.findMany({
    where: {
      campaignId,
      deletedAt: null,
      ...(status ? { status: status as never } : {}),
    },
    include: {
      requestedBy: { select: { id: true, name: true } },
      _count: { select: { quotes: true } },
      order: { select: { id: true, status: true } },
    },
    orderBy: { neededBy: "asc" },
  });

  return NextResponse.json({ data: requests });
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

  const request = await prisma.foodRequest.create({
    data: {
      campaignId: body.campaignId,
      requestedByUserId: session!.user.id,
      requestType: body.requestType,
      headcount: body.headcount,
      budgetCapCad: body.budgetCapCad ?? null,
      neededBy: new Date(body.neededBy),
      location: body.location?.trim() ?? null,
      notes: sanitizeUserText(body.notes),
      dietaryNotes: body.dietaryNotes?.trim() ?? null,
      linkedEventId: body.linkedEventId ?? null,
      linkedShiftId: body.linkedShiftId ?? null,
    },
  });

  // Eagerly compute vendor rankings for the response
  const vendors = await prisma.foodVendor.findMany({
    where: {
      OR: [{ campaignId: body.campaignId }, { campaignId: null }],
      deletedAt: null,
      status: "active",
    },
    include: { pricingTiers: { where: { isActive: true } } },
  });

  const ranked = rankVendors(vendors, {
    headcount: body.headcount,
    neededByDate: new Date(body.neededBy),
    requestedAtDate: new Date(),
    budgetCapCad: body.budgetCapCad ?? null,
    requestLocation: body.location ?? null,
  });

  return NextResponse.json({ data: request, rankedVendors: ranked.slice(0, 10) }, { status: 201 });
}
