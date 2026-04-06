/**
 * POST /api/call-center/webhook/[secret] — Universal webhook receiver for call center integrations.
 * Matches incoming events to Poll City contacts by embedded ID or phone number.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest, { params }: { params: { secret: string } }) {
  // Find integration by webhook secret
  const integration = await prisma.callCenterIntegration.findFirst({
    where: { webhookSecret: params.secret, isActive: true },
  });

  if (!integration) return NextResponse.json({ error: "Invalid webhook" }, { status: 404 });

  const payload = await req.json();

  // Store raw event
  const event = await prisma.callCenterWebhookEvent.create({
    data: {
      integrationId: integration.id,
      eventType: payload.event_type ?? payload.type ?? "unknown",
      phone: payload.phone ?? payload.phone_number ?? payload.to ?? null,
      externalId: payload.call_id ?? payload.id ?? null,
      payload,
    },
  });

  // Try to match contact
  const phone = event.phone;
  const pollCityId = payload.poll_city_id ?? payload.external_id ?? payload.custom_field_1 ?? null;

  let contactId: string | null = null;

  // Match by Poll City ID first (exact match)
  if (pollCityId) {
    const contact = await prisma.contact.findFirst({
      where: { id: pollCityId, campaignId: integration.campaignId },
    });
    if (contact) contactId = contact.id;
  }

  // Fallback: match by phone
  if (!contactId && phone) {
    const digits = phone.replace(/\D/g, "").slice(-10);
    const contact = await prisma.contact.findFirst({
      where: { campaignId: integration.campaignId, phone: { endsWith: digits } },
    });
    if (contact) contactId = contact.id;
  }

  // Process if matched
  if (contactId) {
    await prisma.callCenterWebhookEvent.update({
      where: { id: event.id },
      data: { contactId, processed: true, processedAt: new Date() },
    });

    // Create interaction record
    const result = payload.result ?? payload.disposition ?? payload.status;
    const supportMap: Record<string, string> = {
      supporter: "strong_support", support: "strong_support",
      leaning: "leaning_support",
      undecided: "undecided",
      against: "against", refused: "against",
      not_home: "unknown", no_answer: "unknown",
    };

    await prisma.interaction.create({
      data: {
        contactId,
        userId: null as any, // system-created
        type: "phone_call" as any,
        supportLevel: supportMap[result?.toLowerCase()] as any ?? null,
        notes: `Call center (${integration.provider}): ${result ?? "completed"}`,
      },
    }).catch(() => {});

    // Update support level if we got one
    if (result && supportMap[result.toLowerCase()]) {
      await prisma.contact.update({
        where: { id: contactId },
        data: { supportLevel: supportMap[result.toLowerCase()] as any },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, matched: !!contactId });
}
