import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: {
    campaignId?: string;
    contactId?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    availability?: string;
    hasVehicle?: boolean;
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const campaignId = body.campaignId?.trim();
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let resolvedId = body.contactId?.trim() || undefined;

  if (resolvedId) {
    const existingContact = await prisma.contact.findUnique({
      where: { id: resolvedId },
      select: { id: true, campaignId: true },
    });
    if (!existingContact || existingContact.campaignId !== campaignId) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await prisma.contact.update({
      where: { id: resolvedId },
      data: { volunteerInterest: true },
    });
  } else {
    const contact = await prisma.contact.create({
      data: {
        campaignId,
        firstName: body.firstName?.trim() || "Unknown",
        lastName: body.lastName?.trim() || "Unknown",
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        address1: body.address?.trim() || null,
        volunteerInterest: true,
        notes: body.notes?.trim() || null,
        source: "volunteer_capture",
      },
    });
    resolvedId = contact.id;
  }

  await prisma.volunteerProfile.upsert({
    where: { contactId: resolvedId },
    update: {
      availability: body.availability?.trim() || null,
      hasVehicle: body.hasVehicle ?? false,
      notes: body.notes?.trim() || null,
      campaignId,
    },
    create: {
      contactId: resolvedId,
      campaignId,
      availability: body.availability?.trim() || null,
      hasVehicle: body.hasVehicle ?? false,
      notes: body.notes?.trim() || null,
    },
  });

  return NextResponse.json({ data: { contactId: resolvedId } }, { status: 201 });
}
