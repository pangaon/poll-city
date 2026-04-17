import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

/** GET — return active sessions for the authenticated user. */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const userId = session!.user.id as string;

  const sessions = await prisma.userSession.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastSeen: "desc" },
    select: {
      id: true,
      device: true,
      ip: true,
      lastSeen: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ sessions });
}

/** DELETE — revoke a specific session or all sessions.
 *  ?id=<session_id>   — revoke one
 *  ?all=true           — revoke all + increment sessionVersion to invalidate JWTs
 */
export async function DELETE(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const userId = session!.user.id as string;

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("id");
  const all = searchParams.get("all") === "true";

  if (!sessionId && !all) {
    return NextResponse.json({ error: "Provide ?id=<session_id> or ?all=true" }, { status: 400 });
  }

  if (all) {
    // Mark all sessions revoked + increment sessionVersion to invalidate all JWTs
    await prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    });
    await prisma.securityEvent.create({ data: { userId, type: "session_revoked", success: true } });
    return NextResponse.json({ ok: true, signedOut: true });
  }

  // Revoke specific session — verify it belongs to this user
  const target = await prisma.userSession.findFirst({
    where: { id: sessionId!, userId, revokedAt: null },
  });
  if (!target) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  await prisma.userSession.update({
    where: { id: target.id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
