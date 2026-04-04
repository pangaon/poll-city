import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { PrintJobStatus } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const job = await prisma.printJob.findUnique({
    where: { id: params.id },
    include: {
      bids: {
        include: { shop: true },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { bids: true } },
    },
  });

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: job.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ data: job });
}

export async function PATCH(
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

  let body: Partial<{
    status: PrintJobStatus;
    awardedBidId: string;
    title: string;
    quantity: number;
    description: string;
    deadline: string;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryPostal: string;
    fileUrl: string;
    budgetMin: number;
    budgetMax: number;
    notes: string;
  }>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // When awarding a bid, update the bid and set status to awarded
  if (body.awardedBidId) {
    // Verify bid belongs to this job
    const bid = await prisma.printBid.findUnique({ where: { id: body.awardedBidId } });
    if (!bid || bid.jobId !== params.id) {
      return NextResponse.json({ error: "Bid not found on this job" }, { status: 400 });
    }
    // Mark all bids as not accepted, then accept the chosen one
    await prisma.printBid.updateMany({ where: { jobId: params.id }, data: { isAccepted: false } });
    await prisma.printBid.update({ where: { id: body.awardedBidId }, data: { isAccepted: true } });
  }

  const updated = await prisma.printJob.update({
    where: { id: params.id },
    data: {
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.awardedBidId !== undefined ? { awardedBidId: body.awardedBidId, status: "awarded" } : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.quantity !== undefined ? { quantity: body.quantity } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.deadline !== undefined ? { deadline: new Date(body.deadline) } : {}),
      ...(body.deliveryAddress !== undefined ? { deliveryAddress: body.deliveryAddress } : {}),
      ...(body.deliveryCity !== undefined ? { deliveryCity: body.deliveryCity } : {}),
      ...(body.deliveryPostal !== undefined ? { deliveryPostal: body.deliveryPostal } : {}),
      ...(body.fileUrl !== undefined ? { fileUrl: body.fileUrl } : {}),
      ...(body.budgetMin !== undefined ? { budgetMin: body.budgetMin } : {}),
      ...(body.budgetMax !== undefined ? { budgetMax: body.budgetMax } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
    include: {
      bids: { include: { shop: true } },
    },
  });

  return NextResponse.json({ data: updated });
}
