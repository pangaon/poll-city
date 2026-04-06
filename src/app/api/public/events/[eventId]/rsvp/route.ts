import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken, isTurnstileEnabled } from "@/lib/security/turnstile";
import { EventRsvpStatus } from "@prisma/client";

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
      _count: { select: { rsvps: true } },
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

  return NextResponse.json({ data: rsvp }, { status: existing ? 200 : 201 });
}
