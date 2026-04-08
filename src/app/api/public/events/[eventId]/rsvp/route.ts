import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken, isTurnstileEnabled } from "@/lib/security/turnstile";
import { EventRsvpStatus } from "@prisma/client";
import { findOrCreateContact, autoTagContact, logWebInteraction, updateEngagement } from "@/lib/automation/inbound-engine";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 16_000) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    notes?: string;
    captchaToken?: string;
  } | null;

  if (!body?.name?.trim() || !body?.email?.trim()) {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 });
  }

  const captchaValid = await verifyTurnstileToken(req, body.captchaToken);
  if (!captchaValid) {
    return NextResponse.json(
      {
        error: isTurnstileEnabled() ? "Captcha verification failed" : "Captcha token missing",
      },
      { status: 400 }
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    select: {
      id: true,
      campaignId: true,
      isPublic: true,
      status: true,
      allowPublicRsvp: true,
      requiresApproval: true,
      capacity: true,
      name: true,
      eventDate: true,
      location: true,
      _count: { select: { rsvps: true } },
      campaign: {
        select: { name: true, candidateName: true, primaryColor: true, websiteUrl: true },
      },
    },
  });

  if (!event || !event.isPublic || !event.allowPublicRsvp || !["scheduled", "live"].includes(event.status)) {
    return NextResponse.json({ error: "RSVP not available" }, { status: 404 });
  }

  const email = body.email.trim().toLowerCase();
  const submittedStatus =
    body.status && Object.values(EventRsvpStatus).includes(body.status as EventRsvpStatus)
      ? (body.status as EventRsvpStatus)
      : EventRsvpStatus.going;
  const effectiveStatus = event.requiresApproval ? EventRsvpStatus.interested : submittedStatus;

  const existing = await prisma.eventRsvp.findFirst({
    where: { eventId: event.id, email },
    select: { id: true },
  });

  if (!existing && event.capacity && event._count.rsvps >= event.capacity) {
    return NextResponse.json({ error: "Event is full", waitlist: true }, { status: 409 });
  }

  const rsvp = existing
    ? await prisma.eventRsvp.update({
        where: { id: existing.id },
        data: {
          name: body.name.trim(),
          email,
          phone: body.phone?.trim() || null,
          notes: body.notes?.trim() || null,
          status: effectiveStatus,
          source: "public",
        },
      })
    : await prisma.eventRsvp.create({
        data: {
          eventId: event.id,
          name: body.name.trim(),
          email,
          phone: body.phone?.trim() || null,
          notes: body.notes?.trim() || null,
          status: effectiveStatus,
          source: "public",
        },
      });

  // Inbound automation — fire-and-forget, never blocks the response
  try {
    const contact = await findOrCreateContact({
      campaignId: event.campaignId,
      email,
      firstName: body.name.trim().split(" ")[0] || "",
      lastName: body.name.trim().split(" ").slice(1).join(" ") || "",
      phone: body.phone?.trim() || undefined,
      source: "website-rsvp",
    });

    if (contact) {
      await prisma.eventRsvp.update({ where: { id: rsvp.id }, data: { contactId: contact.id } }).catch(() => {});
      await autoTagContact(event.campaignId, contact.id, "event-rsvp", "#7C3AED");
      await logWebInteraction(event.campaignId, contact.id, "note", `RSVP'd to event (${effectiveStatus})`);
      await updateEngagement(contact.id, "website-rsvp");
    }
  } catch (automationError) {
    console.error("RSVP automation error (non-blocking):", automationError);
  }

  // Confirmation email — fire-and-forget
  const firstName = body.name.trim().split(" ")[0] || "there";
  const campaignName = event.campaign.candidateName ?? event.campaign.name;
  const accentColor = event.campaign.primaryColor ?? "#0A2342";
  const eventDate = event.eventDate
    ? new Intl.DateTimeFormat("en-CA", { dateStyle: "full", timeStyle: "short" }).format(new Date(event.eventDate))
    : null;

  sendEmail({
    to: email,
    subject: event.requiresApproval
      ? `RSVP received — ${event.name}`
      : `You're registered for ${event.name}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: ${accentColor}; padding: 24px 28px;">
      <p style="margin: 0; color: white; font-size: 13px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.05em;">
        ${event.requiresApproval ? "RSVP Received" : "Event Registration"}
      </p>
      <h1 style="margin: 6px 0 0; color: white; font-size: 22px;">${event.name}</h1>
    </div>

    <div style="padding: 28px;">
      <p style="color: #374151; font-size: 15px; margin: 0 0 16px;">Hi ${firstName},</p>
      <p style="color: #374151; font-size: 15px; margin: 0 0 16px;">
        ${event.requiresApproval
          ? `Thank you for your interest in <strong>${event.name}</strong>. Your RSVP has been received and is pending approval. We'll be in touch shortly.`
          : `You're registered for <strong>${event.name}</strong> — we're looking forward to seeing you!`
        }
      </p>

      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        ${eventDate ? `
        <p style="color: #64748b; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Date & Time</p>
        <p style="color: #0f172a; font-size: 15px; font-weight: 600; margin: 0 0 12px;">${eventDate}</p>
        ` : ""}
        ${event.location ? `
        <p style="color: #64748b; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em;">Location</p>
        <p style="color: #0f172a; font-size: 15px; font-weight: 600; margin: 0;">${event.location}</p>
        ` : ""}
      </div>

      ${event.campaign.websiteUrl ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${event.campaign.websiteUrl}" style="background: ${accentColor}; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block;">
          Visit Our Campaign
        </a>
      </div>
      ` : ""}

      <p style="color: #374151; font-size: 15px; margin: 0;">
        See you there,<br><strong>${campaignName}</strong>
      </p>
    </div>

    <div style="border-top: 1px solid #e2e8f0; padding: 16px 28px;">
      <p style="color: #94a3b8; font-size: 11px; margin: 0;">
        You're receiving this because you RSVP'd to a campaign event.
        Powered by <a href="https://poll.city" style="color: #94a3b8;">Poll City</a>.
      </p>
    </div>
  </div>
</body>
</html>`,
  }).catch((e) => console.error("[rsvp] Confirmation email failed:", e));

  return NextResponse.json({ data: rsvp }, { status: existing ? 200 : 201 });
}
