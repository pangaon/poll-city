import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/social/notifications
 * Returns SocialNotification records for the authenticated user.
 * Query params:
 *  - unread: "true" to return only unread
 *  - limit: default 30
 *
 * POST /api/social/notifications  (body: { markAllRead: true })
 * Marks all notifications as read.
 */

export async function GET(req: NextRequest) {
  const rateLimitResponse = rateLimit(req, "read");
  if (rateLimitResponse) return rateLimitResponse;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user.id;
  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 100);

  const [notifications, unreadCount] = await Promise.all([
    prisma.socialNotification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        isRead: true,
        createdAt: true,
        postId: true,
        officialId: true,
        official: {
          select: { id: true, name: true, title: true, photoUrl: true },
        },
      },
    }),
    prisma.socialNotification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return NextResponse.json({ data: notifications, unreadCount });
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = rateLimit(req, "read");
  if (rateLimitResponse) return rateLimitResponse;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user.id;
  const body = await req.json();

  if (body.markAllRead) {
    await prisma.socialNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ data: { marked: true } });
  }

  if (body.notificationId) {
    await prisma.socialNotification.updateMany({
      where: { id: body.notificationId, userId },
      data: { isRead: true },
    });
    return NextResponse.json({ data: { marked: true } });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 422 });
}
