import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const printOrderSchema = z.object({
  campaignId: z.string().min(1, "campaignId is required"),
  templateId: z.string().nullish(),
  productType: z.string().min(1, "productType is required"),
  quantity: z.number().int().positive("quantity must be positive"),
  designData: z.record(z.unknown()).optional(),
  shippingAddr: z.record(z.unknown()).optional(),
  notes: z.string().nullish(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orders = await prisma.printOrder.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    include: { template: { select: { name: true, slug: true, category: true, thumbnail: true } } },
  });

  return NextResponse.json({ data: orders });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = printOrderSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: parsed.data.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const order = await prisma.printOrder.create({
    data: {
      campaignId: parsed.data.campaignId,
      templateId: parsed.data.templateId ?? null,
      productType: parsed.data.productType,
      quantity: parsed.data.quantity,
      designData: parsed.data.designData as object ?? undefined,
      shippingAddr: parsed.data.shippingAddr as object ?? undefined,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json({ data: order }, { status: 201 });
}
