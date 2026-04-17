import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  vendorId: z.string().min(1),
  totalAmountCad: z.number().positive(),
  pricePerHead: z.number().positive(),
  leadTimeDays: z.number().int().min(0).default(1),
  includesDelivery: z.boolean().default(false),
  dietaryFit: z.string().max(500).nullish(),
  details: z.string().max(5000).nullish(),
  isManualEntry: z.boolean().default(true),
  expiresAt: z.string().datetime().nullish(),
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

  const quotes = await prisma.foodQuote.findMany({
    where: { requestId: params.requestId, campaignId },
    include: {
      vendor: { include: { pricingTiers: { where: { isActive: true } } } },
    },
    orderBy: { totalAmountCad: "asc" },
  });

  return NextResponse.json({ data: quotes });
}

export async function POST(req: NextRequest, { params }: { params: { requestId: string } }) {
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

  const request = await prisma.foodRequest.findFirst({
    where: { id: params.requestId, campaignId: body.campaignId, deletedAt: null },
  });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  const quote = await prisma.foodQuote.create({
    data: {
      requestId: params.requestId,
      vendorId: body.vendorId,
      campaignId: body.campaignId,
      totalAmountCad: body.totalAmountCad,
      pricePerHead: body.pricePerHead,
      leadTimeDays: body.leadTimeDays,
      includesDelivery: body.includesDelivery,
      dietaryFit: body.dietaryFit?.trim() ?? null,
      details: body.details?.trim() ?? null,
      isManualEntry: body.isManualEntry,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  });

  // Move request to "quoted" status if still at draft/quoting
  if (["draft", "quoting"].includes(request.status)) {
    await prisma.foodRequest.update({
      where: { id: params.requestId },
      data: { status: "quoted" },
    });
  }

  return NextResponse.json({ data: quote }, { status: 201 });
}
