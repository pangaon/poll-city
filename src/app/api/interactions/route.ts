import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, mobileApiAuth } from "@/lib/auth/helpers";
import { rateLimit } from "@/lib/rate-limit";
import { createInteractionSchema } from "@/lib/validators";
import { sanitizeUserText } from "@/lib/security/monitor";
import { advanceFunnel } from "@/lib/operations/funnel-engine";
import { FunnelStage } from "@prisma/client";

/**
 * GET /api/interactions
 * Cursor-paginated interactions history for a campaign.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    select: { userId: true },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cursor = sp.get("cursor")?.trim() || undefined;
  const pageSize = Math.max(1, Math.min(250, Number(sp.get("pageSize") ?? "50")));

  const [batch, total] = await Promise.all([
    prisma.interaction.findMany({
      where: { contact: { campaignId, deletedAt: null } },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, address1: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: pageSize + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.interaction.count({ where: { contact: { campaignId, deletedAt: null } } }),
  ]);

  const hasMore = batch.length > pageSize;
  const interactions = hasMore ? batch.slice(0, pageSize) : batch;
  const nextCursor = hasMore ? interactions[interactions.length - 1]?.id ?? null : null;

  return NextResponse.json({
    data: interactions,
    total,
    pageSize,
    hasMore,
    nextCursor,
  });
}

/**
 * POST /api/interactions
 * Log a new interaction with a contact.
 * Accepts both NextAuth cookie sessions (web) and mobile Bearer JWT tokens.
 */
export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  const { session, error } = await mobileApiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createInteractionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const data = parsed.data;

  // Verify access to contact
  const contact = await prisma.contact.findUnique({
    where: { id: data.contactId },
    select: { id: true, campaignId: true, firstName: true, lastName: true },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: contact.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Create interaction
  const interaction = await prisma.interaction.create({
    data: {
      contactId: data.contactId,
      userId: session!.user.id,
      type: data.type,
      notes: sanitizeUserText(data.notes) ?? undefined,
      supportLevel: data.supportLevel ?? undefined,
      issues: data.issues ?? [],
      signRequested: data.signRequested ?? false,
      volunteerInterest: data.volunteerInterest ?? false,
      followUpNeeded: data.followUpNeeded ?? false,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      doorNumber: data.doorNumber,
      duration: data.duration,
      latitude: data.latitude,
      longitude: data.longitude,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  // Update contact fields based on interaction
  const contactUpdate: Record<string, unknown> = { lastContactedAt: new Date() };
  if (data.supportLevel) contactUpdate.supportLevel = data.supportLevel;
  if (data.issues?.length) contactUpdate.issues = data.issues;
  if (data.signRequested) contactUpdate.signRequested = true;
  if (data.volunteerInterest) contactUpdate.volunteerInterest = true;
  if (data.followUpNeeded !== undefined) contactUpdate.followUpNeeded = data.followUpNeeded;
  if (data.followUpDate) contactUpdate.followUpDate = new Date(data.followUpDate);

  await prisma.contact.update({ where: { id: data.contactId }, data: contactUpdate });

  // Advance funnel stage
  const funnelTarget = data.volunteerInterest ? FunnelStage.volunteer
    : data.signRequested ? FunnelStage.supporter
    : FunnelStage.contact;
  await advanceFunnel(data.contactId, funnelTarget, `interaction:${data.type}`, session!.user.id);

  // Mark TurfStop visited — non-fatal: a failed map update must not block the interaction
  await prisma.turfStop
    .updateMany({
      where: { contactId: data.contactId, visited: false },
      data: { visited: true, visitedAt: new Date() },
    })
    .catch(() => {});

  // Log activity
  await prisma.activityLog.create({
    data: {
      campaignId: contact.campaignId,
      userId: session!.user.id,
      action: "logged_interaction",
      entityType: "contact",
      entityId: data.contactId,
      details: {
        type: data.type,
        contactName: `${contact.firstName} ${contact.lastName}`,
        ...(data.supportLevel && { supportLevel: data.supportLevel }),
      },
    },
  });

  return NextResponse.json({ data: interaction }, { status: 201 });
}
