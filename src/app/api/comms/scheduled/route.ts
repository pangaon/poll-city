import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { sanitizeUserText } from "@/lib/security/monitor";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"] as const;

// ─── GET /api/comms/scheduled ─────────────────────────────────────────────────
// List scheduled messages for a campaign.
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.scheduledMessage.findMany({
    where: { campaignId, deletedAt: null },
    select: {
      id: true,
      channel: true,
      subject: true,
      bodyText: true,
      sendAt: true,
      timezone: true,
      status: true,
      sentAt: true,
      sentCount: true,
      failedCount: true,
      errorMessage: true,
      sendKey: true,
      createdAt: true,
      updatedAt: true,
      segment: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { sendAt: "asc" },
  });

  return NextResponse.json({ messages });
}

// ─── POST /api/comms/scheduled ────────────────────────────────────────────────
// Schedule a new message blast.
const createSchema = z.object({
  campaignId: z.string().min(1),
  channel: z.enum(["email", "sms", "push"]),
  subject: z.string().min(3).max(150).optional(),
  bodyHtml: z.string().min(10).max(50_000).optional(),
  bodyText: z.string().min(2).max(5_000),
  segmentId: z.string().optional(),
  filterDefinition: z
    .object({
      supportLevels: z.array(z.string()).optional(),
      wards: z.array(z.string()).optional(),
      tagIds: z.array(z.string()).optional(),
      excludeDnc: z.boolean().optional(),
      volunteerOnly: z.boolean().optional(),
      hasEmail: z.boolean().optional(),
      hasPhone: z.boolean().optional(),
    })
    .default({}),
  templateId: z.string().optional(),
  sendAt: z.string().datetime(),
  timezone: z.string().default("America/Toronto"),
  // Client-generated idempotency key — prevents duplicate creates on retry
  sendKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const {
    campaignId,
    channel,
    subject,
    bodyHtml,
    bodyText,
    segmentId,
    filterDefinition,
    templateId,
    sendAt,
    timezone,
    sendKey: clientSendKey,
  } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || !MANAGER_ROLES.includes(membership.role as (typeof MANAGER_ROLES)[number])) {
    return NextResponse.json({ error: "Admin or Campaign Manager required" }, { status: 403 });
  }

  // Validate sendAt is in the future
  const sendDate = new Date(sendAt);
  if (sendDate <= new Date()) {
    return NextResponse.json({ error: "sendAt must be in the future" }, { status: 400 });
  }

  // Email requires subject
  if (channel === "email" && !subject) {
    return NextResponse.json({ error: "subject required for email" }, { status: 400 });
  }

  // Validate segmentId belongs to this campaign if provided
  if (segmentId) {
    const seg = await prisma.savedSegment.findUnique({
      where: { id: segmentId, deletedAt: null },
      select: { campaignId: true },
    });
    if (!seg || seg.campaignId !== campaignId) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }
  }

  // Validate templateId belongs to this campaign if provided
  if (templateId) {
    const tpl = await prisma.messageTemplate.findUnique({
      where: { id: templateId, deletedAt: null },
      select: { campaignId: true },
    });
    if (!tpl || tpl.campaignId !== campaignId) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
  }

  const sendKey = clientSendKey ?? randomUUID();

  const message = await prisma.scheduledMessage.create({
    data: {
      campaignId,
      createdById: session!.user.id,
      channel,
      subject: subject ? (sanitizeUserText(subject) ?? subject) : undefined,
      bodyHtml,
      bodyText: sanitizeUserText(bodyText) ?? bodyText,
      segmentId,
      filterDefinition,
      templateId,
      sendAt: sendDate,
      timezone,
      sendKey,
    },
    select: {
      id: true,
      channel: true,
      subject: true,
      bodyText: true,
      sendAt: true,
      timezone: true,
      status: true,
      sendKey: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
