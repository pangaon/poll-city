import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { sanitizeUserText } from "@/lib/security/monitor";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  if (session!.user.role !== "PRINT_VENDOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shop = await prisma.printShop.findUnique({
    where: { userId: session!.user.id },
  });

  if (!shop || !shop.isActive) {
    return NextResponse.json({ error: "No active shop linked to this account" }, { status: 404 });
  }

  const job = await prisma.printJob.findUnique({ where: { id: params.id } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status !== "posted" && job.status !== "bidding") {
    return NextResponse.json({ error: "Job is not accepting bids" }, { status: 400 });
  }

  // Check for duplicate bid
  const existing = await prisma.printBid.findFirst({
    where: { jobId: params.id, shopId: shop.id },
  });
  if (existing) {
    return NextResponse.json({ error: "You have already submitted a bid on this job" }, { status: 400 });
  }

  let body: { price: number; turnaround: number; notes?: string; fileUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.price || !body.turnaround) {
    return NextResponse.json({ error: "price and turnaround are required" }, { status: 400 });
  }

  const [bid] = await prisma.$transaction([
    prisma.printBid.create({
      data: {
        jobId: params.id,
        shopId: shop.id,
        price: body.price,
        turnaround: body.turnaround,
        notes: sanitizeUserText(body.notes),
        fileUrl: body.fileUrl ?? null,
      },
      include: { shop: { select: { name: true } } },
    }),
    // Advance job to bidding if still just posted
    ...(job.status === "posted"
      ? [prisma.printJob.update({ where: { id: params.id }, data: { status: "bidding" } })]
      : []),
  ]);

  return NextResponse.json({ data: bid }, { status: 201 });
}

// Update an existing bid (price / turnaround / notes)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  if (session!.user.role !== "PRINT_VENDOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shop = await prisma.printShop.findUnique({
    where: { userId: session!.user.id },
  });
  if (!shop) {
    return NextResponse.json({ error: "No shop linked to this account" }, { status: 404 });
  }

  const bid = await prisma.printBid.findFirst({
    where: { jobId: params.id, shopId: shop.id },
  });
  if (!bid) {
    return NextResponse.json({ error: "Bid not found" }, { status: 404 });
  }
  if (bid.isAccepted) {
    return NextResponse.json({ error: "Accepted bids cannot be edited" }, { status: 400 });
  }

  let body: { price?: number; turnaround?: number; notes?: string; fileUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updated = await prisma.printBid.update({
    where: { id: bid.id },
    data: {
      ...(body.price !== undefined ? { price: body.price } : {}),
      ...(body.turnaround !== undefined ? { turnaround: body.turnaround } : {}),
      ...(body.notes !== undefined ? { notes: sanitizeUserText(body.notes) } : {}),
      ...(body.fileUrl !== undefined ? { fileUrl: body.fileUrl } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}
