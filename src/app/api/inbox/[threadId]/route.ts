import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  campaignId: z.string().min(1),
});

const patchSchema = z.object({
  campaignId: z.string().min(1),
  status: z.enum(["open", "resolved", "snoozed"]).optional(),
  assignedToId: z.string().nullable().optional(),
  snoozedUntil: z.string().datetime().nullable().optional(),
});

// GET /api/inbox/[threadId]?campaignId=
// Returns thread metadata + full message history.
export async function GET(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const qp = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(qp);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
  }
  const { campaignId } = parsed.data;

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const thread = await prisma.inboxThread.findFirst({
    where: { id: params.threadId, campaignId },
    include: {
      contact: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
      assignedTo: { select: { id: true, name: true } },
      messages: {
        orderBy: { sentAt: "asc" },
        select: {
          id: true,
          direction: true,
          fromHandle: true,
          toHandle: true,
          body: true,
          bodyHtml: true,
          sentAt: true,
          sentByUser: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Mark as read — zero the unread count when staff open the thread.
  if (thread.unreadCount > 0) {
    await prisma.inboxThread.update({
      where: { id: params.threadId },
      data: { unreadCount: 0 },
    }).catch(() => {});
  }

  return NextResponse.json({ thread });
}

// PATCH /api/inbox/[threadId] — update status, assignment, or snooze
export async function PATCH(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { campaignId, status, assignedToId, snoozedUntil } = parsed.data;

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const existing = await prisma.inboxThread.findFirst({
    where: { id: params.threadId, campaignId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const updated = await prisma.inboxThread.update({
    where: { id: params.threadId },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(assignedToId !== undefined ? { assignedToId } : {}),
      ...(snoozedUntil !== undefined
        ? { snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : null }
        : {}),
    },
    select: { id: true, status: true, assignedToId: true, snoozedUntil: true },
  });

  return NextResponse.json({ thread: updated });
}
