import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

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

  let body: {
    campaignId: string;
    templateId?: string;
    productType: string;
    quantity: number;
    designData?: Record<string, unknown>;
    shippingAddr?: Record<string, unknown>;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.campaignId || !body.productType || !body.quantity) {
    return NextResponse.json({ error: "campaignId, productType, and quantity are required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const order = await prisma.printOrder.create({
    data: {
      campaignId: body.campaignId,
      templateId: body.templateId ?? null,
      productType: body.productType,
      quantity: body.quantity,
      designData: body.designData as object ?? undefined,
      shippingAddr: body.shippingAddr as object ?? undefined,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json({ data: order }, { status: 201 });
}
