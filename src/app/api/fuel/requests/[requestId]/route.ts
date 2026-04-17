import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { sanitizeUserText } from "@/lib/security/monitor";
import { rankVendors } from "@/lib/fuel/ranking-engine";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  campaignId: z.string().min(1),
  headcount: z.number().int().positive().optional(),
  budgetCapCad: z.number().positive().nullish(),
  neededBy: z.string().datetime().optional(),
  location: z.string().max(500).nullish(),
  notes: z.string().max(5000).nullish(),
  dietaryNotes: z.string().max(2000).nullish(),
  status: z.enum(["draft", "quoting", "quoted", "ordered", "delivered", "cancelled"]).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { requestId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const request = await prisma.foodRequest.findFirst({
    where: { id: params.requestId, campaignId, deletedAt: null },
    include: {
      requestedBy: { select: { id: true, name: true, email: true } },
      quotes: {
        include: { vendor: { include: { pricingTiers: { where: { isActive: true } } } } },
        orderBy: { totalAmountCad: "asc" },
      },
      order: true,
    },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Compute vendor rankings
  const vendors = await prisma.foodVendor.findMany({
    where: {
      OR: [{ campaignId }, { campaignId: null }],
      deletedAt: null,
      status: "active",
    },
    include: { pricingTiers: { where: { isActive: true } } },
  });

  const dietaryRequired = request.dietaryNotes
    ? request.dietaryNotes.toLowerCase().split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    : [];

  const ranked = rankVendors(vendors, {
    headcount: request.headcount,
    neededByDate: request.neededBy,
    requestedAtDate: request.createdAt,
    budgetCapCad: request.budgetCapCad ? Number(request.budgetCapCad) : null,
    requestLocation: request.location,
    requiredDietaryOptions: dietaryRequired,
  });

  return NextResponse.json({ data: request, rankedVendors: ranked.slice(0, 10) });
}

export async function PATCH(req: NextRequest, { params }: { params: { requestId: string } }) {
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

  const { campaignId: _c, notes, neededBy, ...rest } = body;
  const updated = await prisma.foodRequest.update({
    where: { id: params.requestId },
    data: {
      ...rest,
      notes: notes !== undefined ? sanitizeUserText(notes) : undefined,
      neededBy: neededBy ? new Date(neededBy) : undefined,
    },
  });

  return NextResponse.json({ data: updated });
}
