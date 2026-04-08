import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/public/unsubscribe
 * Marks a contact as Do Not Contact and unsubscribes newsletter subscribers.
 * No auth required — this is a public CASL compliance endpoint.
 */
export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { contactId, email } = await req.json();

    if (!contactId && !email) {
      return NextResponse.json({ error: "contactId or email required" }, { status: 400 });
    }

    let updated = 0;

    // Mark contact as Do Not Contact
    if (contactId) {
      try {
        await prisma.contact.update({
          where: { id: contactId },
          data: { doNotContact: true },
        });
        updated++;
      } catch {
        // Contact not found — try by email
      }
    }

    // Also try by email if provided
    if (email) {
      // Update all contacts with this email across all campaigns
      const result = await prisma.contact.updateMany({
        where: { email: { equals: email, mode: "insensitive" } },
        data: { doNotContact: true },
      });
      updated += result.count;

      // Unsubscribe from newsletters
      await prisma.newsletterSubscriber.updateMany({
        where: { email: { equals: email, mode: "insensitive" } },
        data: { status: "unsubscribed", unsubscribedAt: new Date() },
      });
    }

    // If we had a contactId but no email, fetch the contact's email and unsubscribe newsletters too
    if (contactId && !email) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { email: true },
      });
      if (contact?.email) {
        await prisma.newsletterSubscriber.updateMany({
          where: { email: { equals: contact.email, mode: "insensitive" } },
          data: { status: "unsubscribed", unsubscribedAt: new Date() },
        });
      }
    }

    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return NextResponse.json({ error: "Failed to process unsubscribe" }, { status: 500 });
  }
}
