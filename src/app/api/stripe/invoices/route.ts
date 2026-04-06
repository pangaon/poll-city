import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    })
  : null;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500, headers: NO_STORE_HEADERS });
  }

  const { session, error } = await apiAuth(request);
  if (error) return error;

  const userId = session!.user.id;
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ invoices: [] }, { headers: NO_STORE_HEADERS });
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 12,
    });

    return NextResponse.json({
      invoices: invoices.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
        currency: invoice.currency,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        created: invoice.created,
      })),
    }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error("Stripe invoice fetch error", err);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
