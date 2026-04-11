import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { PrintJobStatus } from "@prisma/client";
import { sanitizeUserText } from "@/lib/security/monitor";
import {
  budgetCategoryForProduct,
  findPrintBudgetLine,
  postPrintExpense,
  printExpenseExists,
} from "@/lib/finance/post-print-expense";

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

  const { forbidden } = await guardCampaignRoute(session!.user.id, job.campaignId, "signs:read");
  if (forbidden) return forbidden;

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

  const { forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, job.campaignId, "signs:write");
  if (forbidden2) return forbidden2;

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
    trackingNumber: string;
    carrier: string;
    estimatedDelivery: string;
  }>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // When awarding a bid, update the bid and set status to awarded
  let awardedBidPrice: number | null = null;
  if (body.awardedBidId) {
    // Verify bid belongs to this job
    const bid = await prisma.printBid.findUnique({ where: { id: body.awardedBidId } });
    if (!bid || bid.jobId !== params.id) {
      return NextResponse.json({ error: "Bid not found on this job" }, { status: 400 });
    }
    awardedBidPrice = bid.price;
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
      ...(body.description !== undefined ? { description: sanitizeUserText(body.description) } : {}),
      ...(body.deadline !== undefined ? { deadline: new Date(body.deadline) } : {}),
      ...(body.deliveryAddress !== undefined ? { deliveryAddress: body.deliveryAddress } : {}),
      ...(body.deliveryCity !== undefined ? { deliveryCity: body.deliveryCity } : {}),
      ...(body.deliveryPostal !== undefined ? { deliveryPostal: body.deliveryPostal } : {}),
      ...(body.fileUrl !== undefined ? { fileUrl: body.fileUrl } : {}),
      ...(body.budgetMin !== undefined ? { budgetMin: body.budgetMin } : {}),
      ...(body.budgetMax !== undefined ? { budgetMax: body.budgetMax } : {}),
      ...(body.notes !== undefined ? { notes: sanitizeUserText(body.notes) } : {}),
      ...(body.trackingNumber !== undefined ? { trackingNumber: body.trackingNumber } : {}),
      ...(body.carrier !== undefined ? { carrier: body.carrier } : {}),
      ...(body.estimatedDelivery !== undefined ? { estimatedDelivery: new Date(body.estimatedDelivery) } : {}),
    },
    include: {
      bids: { include: { shop: true } },
    },
  });

  // Auto-post finance expense when a bid is awarded (idempotent — skip if already posted)
  if (body.awardedBidId && awardedBidPrice !== null) {
    try {
      const alreadyPosted = await printExpenseExists({
        campaignId: job.campaignId,
        printJobId: job.id,
      });
      if (!alreadyPosted) {
        const category = budgetCategoryForProduct(job.productType);
        const budgetLineId = await findPrintBudgetLine(job.campaignId, category);
        await postPrintExpense({
          campaignId: job.campaignId,
          amount: awardedBidPrice,
          description: `Print job awarded: ${job.title} ×${job.quantity}`,
          sourceType: "print_order",
          budgetLineId,
          printJobId: job.id,
          userId: session!.user.id,
        });
      }
    } catch (expenseErr) {
      console.error("[print/jobs] expense auto-post failed", expenseErr);
      // Non-fatal: job was updated successfully, expense can be posted manually
    }
  }

  return NextResponse.json({ data: updated });
}
