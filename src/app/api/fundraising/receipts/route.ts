import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { sendReceiptEmail } from "@/lib/fundraising/receipt-email";

const generateSchema = z.object({
  campaignId: z.string(),
  donationId: z.string(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const receiptStatus = sp.get("status");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") ?? "25", 10)));

  const [receipts, total] = await Promise.all([
    prisma.donationReceipt.findMany({
      where: { campaignId: campaignId!, ...(receiptStatus ? { receiptStatus: receiptStatus as never } : {}) },
      include: {
        donation: {
          select: {
            id: true, amount: true, donationDate: true,
            contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        sentBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.donationReceipt.count({
      where: { campaignId: campaignId!, ...(receiptStatus ? { receiptStatus: receiptStatus as never } : {}) },
    }),
  ]);

  return NextResponse.json({ data: receipts, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, parsed.data.campaignId);
  if (forbidden) return forbidden;

  // Validate donation is in a receiptable state
  const donation = await prisma.donation.findUnique({
    where: { id: parsed.data.donationId, campaignId: parsed.data.campaignId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!donation) return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  if (!["processed", "receipted", "partially_refunded"].includes(donation.status)) {
    return NextResponse.json({ error: "Receipt can only be generated for processed donations" }, { status: 422 });
  }

  // Idempotent: return existing receipt if already generated
  const existing = await prisma.donationReceipt.findUnique({ where: { donationId: parsed.data.donationId } });
  if (existing) return NextResponse.json({ data: existing });

  // Generate receipt number: REC-{YEAR}-{RANDOM}
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  const receiptNumber = `REC-${year}-${rand}`;

  const receipt = await prisma.donationReceipt.create({
    data: {
      campaignId: parsed.data.campaignId,
      donationId: parsed.data.donationId,
      receiptNumber,
      issuedDate: new Date(),
      receiptStatus: "generated",
    },
  });

  // Update donation receiptStatus
  await prisma.donation.update({
    where: { id: parsed.data.donationId },
    data: { receiptStatus: "generated", receiptNumber },
  });

  await audit(prisma, "receipt.generate", {
    campaignId: parsed.data.campaignId,
    userId: session!.user.id,
    entityId: receipt.id,
    entityType: "DonationReceipt",
    ip: req.headers.get("x-forwarded-for"),
  });

  // Send receipt email — fire-and-forget, never fail the request
  sendReceiptEmail(receipt.id).catch((e: unknown) =>
    console.error("[receipts] email dispatch failed:", e),
  );

  return NextResponse.json({ data: receipt }, { status: 201 });
}
