/**
 * POST /api/canvasser/sign-requests
 * Creates a sign request from a canvasser's door visit.
 *
 * Body: {
 *   campaignId: string
 *   contactId: string
 *   signType?: string
 *   quantity?: number
 *   notes?: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { mobileApiAuth } from "@/lib/auth/helpers";

const schema = z.object({
  campaignId: z.string().min(1),
  contactId: z.string().min(1),
  signType: z.string().optional(),
  quantity: z.number().int().min(1).max(20).optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await mobileApiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { campaignId, contactId, signType, quantity, notes } = parsed.data;

  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";
  const membership = isSuperAdmin
    ? null
    : await prisma.membership.findUnique({
        where: { userId_campaignId: { userId: session!.user.id, campaignId } },
        select: { id: true },
      });

  if (!isSuperAdmin && !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify contact belongs to campaign and get address/name
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, campaignId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      address1: true,
      city: true,
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const address = [contact.address1, contact.city].filter(Boolean).join(", ");
  const noteParts: string[] = [];
  if (signType) noteParts.push(`Type: ${signType}`);
  if (quantity && quantity > 1) noteParts.push(`Qty: ${quantity}`);
  if (notes) noteParts.push(notes);

  // Create the sign request record + flag the contact
  const [signRequest] = await prisma.$transaction([
    prisma.signRequest.create({
      data: {
        campaignId,
        address: address || "Unknown address",
        name: `${contact.firstName} ${contact.lastName}`,
        email: contact.email ?? "",
      },
    }),
    prisma.contact.update({
      where: { id: contactId },
      data: { signRequested: true },
    }),
  ]);

  return NextResponse.json({ data: { id: signRequest.id, contactId } }, { status: 201 });
}
