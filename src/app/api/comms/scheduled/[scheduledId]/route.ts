import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"] as const;

async function resolveScheduled(scheduledId: string, userId: string) {
  const msg = await prisma.scheduledMessage.findUnique({
    where: { id: scheduledId, deletedAt: null },
    select: { id: true, campaignId: true, status: true },
  });
  if (!msg) return null;
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: msg.campaignId } },
  });
  return membership ? { msg, membership } : null;
}

// ─── PUT /api/comms/scheduled/[scheduledId] ───────────────────────────────────
// Edit a queued scheduled message (cannot edit sent/cancelled/processing).
const updateSchema = z.object({
  subject: z.string().min(3).max(150).optional(),
  bodyHtml: z.string().min(10).max(50_000).optional(),
  bodyText: z.string().min(2).max(5_000).optional(),
  sendAt: z.string().datetime().optional(),
  timezone: z.string().optional(),
  segmentId: z.string().optional().nullable(),
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
    .optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { scheduledId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const resolved = await resolveScheduled(params.scheduledId, session!.user.id);
  if (!resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!MANAGER_ROLES.includes(resolved.membership.role as (typeof MANAGER_ROLES)[number])) {
    return NextResponse.json({ error: "Admin or Campaign Manager required" }, { status: 403 });
  }
  if (resolved.msg.status !== "queued") {
    return NextResponse.json(
      { error: `Cannot edit a message with status '${resolved.msg.status}'` },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { subject, bodyHtml, bodyText, sendAt, timezone, segmentId, filterDefinition } = parsed.data;

  if (sendAt) {
    const sendDate = new Date(sendAt);
    if (sendDate <= new Date()) {
      return NextResponse.json({ error: "sendAt must be in the future" }, { status: 400 });
    }
  }

  const message = await prisma.scheduledMessage.update({
    where: { id: params.scheduledId },
    data: {
      ...(subject !== undefined ? { subject: sanitizeUserText(subject) ?? subject } : {}),
      ...(bodyHtml !== undefined ? { bodyHtml } : {}),
      ...(bodyText !== undefined ? { bodyText: sanitizeUserText(bodyText) ?? bodyText } : {}),
      ...(sendAt !== undefined ? { sendAt: new Date(sendAt) } : {}),
      ...(timezone !== undefined ? { timezone } : {}),
      ...(segmentId !== undefined ? { segmentId } : {}),
      ...(filterDefinition !== undefined ? { filterDefinition } : {}),
    },
    select: {
      id: true,
      channel: true,
      subject: true,
      bodyText: true,
      sendAt: true,
      timezone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ message });
}

// ─── DELETE /api/comms/scheduled/[scheduledId] ────────────────────────────────
// Cancel a queued scheduled message (soft delete + status = cancelled).
export async function DELETE(
  req: NextRequest,
  { params }: { params: { scheduledId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const resolved = await resolveScheduled(params.scheduledId, session!.user.id);
  if (!resolved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!MANAGER_ROLES.includes(resolved.membership.role as (typeof MANAGER_ROLES)[number])) {
    return NextResponse.json({ error: "Admin or Campaign Manager required" }, { status: 403 });
  }

  if (resolved.msg.status === "processing") {
    return NextResponse.json(
      { error: "Message is currently being sent — cannot cancel" },
      { status: 409 },
    );
  }
  if (resolved.msg.status === "sent") {
    return NextResponse.json({ error: "Message already sent" }, { status: 409 });
  }

  await prisma.scheduledMessage.update({
    where: { id: params.scheduledId },
    data: { status: "cancelled", deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
