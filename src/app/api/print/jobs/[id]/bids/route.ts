import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const job = await prisma.printJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: job.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const bids = await prisma.printBid.findMany({
    where: { jobId: params.id },
    include: { shop: true },
    orderBy: { price: "asc" },
  });

  return NextResponse.json({ data: bids });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Print shops submit bids — no campaign auth needed, but require session
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const job = await prisma.printJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "posted" && job.status !== "bidding") {
    return NextResponse.json({ error: "Job is not accepting bids" }, { status: 400 });
  }

  let body: { shopId: string; price: number; turnaround: number; notes?: string; fileUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.shopId || !body.price || !body.turnaround) {
    return NextResponse.json({ error: "shopId, price and turnaround are required" }, { status: 400 });
  }

  const shop = await prisma.printShop.findUnique({ where: { id: body.shopId } });
  if (!shop || !shop.isActive) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  // Move job to bidding status if still just posted
  if (job.status === "posted") {
    await prisma.printJob.update({ where: { id: params.id }, data: { status: "bidding" } });
  }

  const bid = await prisma.printBid.create({
    data: {
      jobId: params.id,
      shopId: body.shopId,
      price: body.price,
      turnaround: body.turnaround,
      notes: body.notes ?? null,
      fileUrl: body.fileUrl ?? null,
    },
    include: { shop: true },
  });

  return NextResponse.json({ data: bid }, { status: 201 });
}
