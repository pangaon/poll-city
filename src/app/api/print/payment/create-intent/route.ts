import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "billing:manage");
  if (permError) return permError;

  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  let body: { jobId?: string; bidId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.jobId || !body.bidId) {
    return NextResponse.json({ error: "jobId and bidId are required" }, { status: 400 });
  }

  const job = await prisma.printJob.findUnique({ where: { id: body.jobId } });
  if (!job) return NextResponse.json({ error: "Print job not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: job.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const bid = await prisma.printBid.findUnique({
    where: { id: body.bidId },
    include: { shop: true },
  });

  if (!bid || bid.jobId !== body.jobId) {
    return NextResponse.json({ error: "Bid not found" }, { status: 404 });
  }

  if (!bid.shop.stripeAccountId) {
    return NextResponse.json({ error: "Print shop has not completed Stripe onboarding" }, { status: 400 });
  }

  const amount = Math.round(bid.price * 100);
  const applicationFee = Math.round(amount * 0.15);

  const intent = await stripe.paymentIntents.create({
    amount,
    currency: "cad",
    automatic_payment_methods: { enabled: true },
    application_fee_amount: applicationFee,
    transfer_data: {
      destination: bid.shop.stripeAccountId,
    },
    metadata: {
      printJobId: job.id,
      printBidId: bid.id,
      campaignId: job.campaignId,
    },
  });

  await prisma.printJob.update({
    where: { id: job.id },
    data: {
      awardedBidId: bid.id,
      paymentIntentId: intent.id,
      paymentStatus: "paid",
      status: "in_production",
    },
  });

  await prisma.notificationLog.create({
    data: {
      campaignId: job.campaignId,
      userId: session!.user.id,
      title: "Print job payment captured",
      body: `Payment captured for print job ${job.title}. Production can begin.`,
      status: "sent",
      sentAt: new Date(),
      totalSubscribers: 1,
      deliveredCount: 1,
      failedCount: 0,
    },
  });

  return NextResponse.json({
    data: {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount,
      applicationFee,
    },
  });
}
