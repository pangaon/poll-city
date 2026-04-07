/**
 * POST /api/public/candidates/[slug]/donate — Create a Stripe checkout session for a public donation.
 * Ontario municipal rules: max $1,200/donor, no corporate donations, Ontario residents only.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const donationSchema = z.object({
  amount: z.number().positive().max(25000),
  donorName: z.string().min(1).max(200),
  donorEmail: z.string().email().max(200),
  donorAddress: z.string().max(500).optional(),
  donorPostalCode: z.string().max(20).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  const body = await req.json();
  const parsed = donationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { amount, donorName, donorEmail, donorAddress, donorPostalCode } = parsed.data;

  if (amount < 1 || amount > 1200) {
    return NextResponse.json({ error: "Donation amount must be between $1 and $1,200 (Ontario municipal limit)" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, candidateName: true },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Online donations are not configured. Contact the campaign directly." }, { status: 503 });
  }

  try {
    const stripe = require("stripe")(stripeKey);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: donorEmail,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: `Donation to ${campaign.candidateName ?? campaign.name}`,
              description: `Political contribution — ${campaign.name}`,
            },
            unit_amount: Math.round(amount * 100), // cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        campaignId: campaign.id,
        donorName,
        donorEmail,
        donorAddress: donorAddress ?? "",
        donorPostalCode: donorPostalCode ?? "",
        type: "public_donation",
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://pollcity.ca"}/candidates/${params.slug}?donated=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://pollcity.ca"}/candidates/${params.slug}?donated=cancelled`,
    });

    // Create or update contact in CRM
    let contact = await prisma.contact.findFirst({
      where: { campaignId: campaign.id, email: donorEmail.trim() },
    });

    if (contact) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { supportLevel: "strong_support" },
      });
    } else {
      const nameParts = donorName.trim().split(" ");
      contact = await prisma.contact.create({
        data: {
          campaignId: campaign.id,
          firstName: nameParts[0] ?? "",
          lastName: nameParts.slice(1).join(" ") ?? "",
          email: donorEmail.trim(),
          address1: donorAddress ?? null,
          postalCode: donorPostalCode ?? null,
          supportLevel: "strong_support",
          source: "online_donation",
        },
      });
    }

    return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (e) {
    console.error("[Donate] Stripe error:", e);
    return NextResponse.json({ error: "Failed to create donation session" }, { status: 500 });
  }
}
