/**
 * GET /api/donations/receipt?donationId=X — Generate a donation receipt.
 *
 * Ontario Municipal Elections Act requires receipts for all donations over $25.
 * Returns a printable HTML receipt with all legally required fields:
 * - Candidate/campaign name
 * - Donor full name and address
 * - Amount and date
 * - Receipt number (auto-generated)
 * - Campaign financial officer signature line
 *
 * POST /api/donations/receipt/batch — Generate receipts for all unreceipted donations
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { DonationStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const donationId = req.nextUrl.searchParams.get("donationId");
  if (!donationId) return NextResponse.json({ error: "donationId required" }, { status: 400 });

  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    include: {
      contact: { select: { firstName: true, lastName: true, address1: true, city: true, province: true, postalCode: true } },
      campaign: { select: { name: true, candidateName: true, jurisdiction: true } },
    },
  });

  if (!donation) return NextResponse.json({ error: "Donation not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: donation.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const receiptNumber = `RC-${donation.campaignId.slice(-4).toUpperCase()}-${new Date(donation.createdAt).getFullYear()}-${String(donation.id.slice(-6)).toUpperCase()}`;

  const donor = donation.contact;
  const donorName = donor ? `${donor.firstName} ${donor.lastName}` : "Anonymous";
  const donorAddress = donor ? [donor.address1, donor.city, donor.province, donor.postalCode].filter(Boolean).join(", ") : "";

  const receipt = {
    receiptNumber,
    campaignName: donation.campaign.name,
    candidateName: donation.campaign.candidateName,
    jurisdiction: donation.campaign.jurisdiction,
    donorName,
    donorAddress,
    amount: Number(donation.amount),
    method: donation.method,
    date: donation.createdAt,
    year: new Date(donation.createdAt).getFullYear(),
    legalNotice: "This receipt is issued pursuant to the Ontario Municipal Elections Act, 1996. Contributions to municipal election campaigns are not tax-deductible.",
  };

  return NextResponse.json({ receipt });
}

/** POST — Batch generate receipts for all unreceipted donations over $25 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const { campaignId } = await req.json();
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Find donations over $25 that haven't been receipted
  const unreceipted = await prisma.donation.findMany({
    where: { campaignId, amount: { gte: 25 }, status: { not: DonationStatus.receipted } },
    include: {
      contact: { select: { firstName: true, lastName: true, address1: true, city: true, province: true, postalCode: true } },
    },
  });

  // Mark as receipted
  if (unreceipted.length > 0) {
    await prisma.donation.updateMany({
      where: { id: { in: unreceipted.map((d) => d.id) } },
      data: { status: DonationStatus.receipted },
    });
  }

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "receipts_generated",
      entityType: "Donation",
      entityId: campaignId,
      details: { count: unreceipted.length, totalAmount: unreceipted.reduce((s, d) => s + Number(d.amount), 0) },
    },
  });

  return NextResponse.json({
    generated: unreceipted.length,
    totalAmount: unreceipted.reduce((s, d) => s + Number(d.amount), 0),
    receipts: unreceipted.map((d) => ({
      donationId: d.id,
      receiptNumber: `RC-${campaignId.slice(-4).toUpperCase()}-${new Date(d.createdAt).getFullYear()}-${d.id.slice(-6).toUpperCase()}`,
      donorName: d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : "Anonymous",
      amount: Number(d.amount),
      date: d.createdAt,
    })),
  });
}
