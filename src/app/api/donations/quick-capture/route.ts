import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "donations:write");
  if (permError) return permError;

  let body: {
    campaignId?: string;
    contactId?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    amount?: string | number;
    method?: string;
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const campaignId = body.campaignId?.trim();
  const amount = Number(body.amount);

  if (!campaignId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "campaignId and valid amount required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let resolvedContactId = body.contactId?.trim() || undefined;
  if (resolvedContactId) {
    const existingContact = await prisma.contact.findUnique({
      where: { id: resolvedContactId },
      select: { id: true, campaignId: true },
    });
    if (!existingContact || existingContact.campaignId !== campaignId) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
  } else if (body.firstName?.trim() || body.lastName?.trim()) {
    const contact = await prisma.contact.create({
      data: {
        campaignId,
        firstName: body.firstName?.trim() || "Unknown",
        lastName: body.lastName?.trim() || "Unknown",
        phone: body.phone?.trim() || null,
        address1: body.address?.trim() || null,
        source: "donation_capture",
      },
    });
    resolvedContactId = contact.id;
  }

  const donation = await prisma.donation.create({
    data: {
      campaignId,
      contactId: resolvedContactId ?? null,
      recordedById: session!.user.id,
      amount,
      method: body.method?.trim() || "cash",
      notes: body.notes?.trim() || null,
      status: "pledged",
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "donation_recorded",
      entityType: "donation",
      entityId: donation.id,
      details: { amount, method: body.method || "cash" },
    },
  });

  return NextResponse.json({ data: donation }, { status: 201 });
}
