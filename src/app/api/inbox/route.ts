import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  campaignId: z.string().min(1),
  channel: z.enum(["email", "sms"]).optional(),
  status: z.enum(["open", "resolved", "snoozed"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// GET /api/inbox?campaignId=&channel=&status=&cursor=&limit=
// Returns paginated InboxThread list (most recent first), with latest message preview.
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { campaignId, channel, status, cursor, limit } = parsed.data;

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const threads = await prisma.inboxThread.findMany({
    where: {
      campaignId,
      ...(channel ? { channel } : {}),
      ...(status ? { status } : {}),
      ...(cursor
        ? {
            OR: [
              { lastMessageAt: { lt: new Date(cursor) } },
              {
                lastMessageAt: { equals: new Date(cursor) },
                id: { lt: cursor },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      channel: true,
      status: true,
      subject: true,
      fromHandle: true,
      fromName: true,
      lastMessageAt: true,
      unreadCount: true,
      contact: {
        select: { id: true, firstName: true, lastName: true },
      },
      assignedTo: {
        select: { id: true, name: true },
      },
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { body: true, direction: true, sentAt: true },
      },
    },
  });

  const hasMore = threads.length > limit;
  if (hasMore) threads.pop();

  const nextCursor =
    hasMore && threads.length > 0
      ? threads[threads.length - 1].lastMessageAt.toISOString()
      : null;

  return NextResponse.json({ threads, nextCursor });
}
