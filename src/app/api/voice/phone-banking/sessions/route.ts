/**
 * Phone banking session management.
 * POST — Start a new phone banking session
 * GET — List active sessions (for campaign manager dashboard)
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

/** POST — Start a phone banking session */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "canvassing:write");
  if (error) return error;

  const campaignId = session.user.activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const body = await req.json();

  const phoneBankSession = await prisma.phoneBankSession.create({
    data: {
      campaignId,
      volunteerId: session.user.id as string,
      scriptId: body.scriptId ?? null,
      contactFilter: body.contactFilter ?? null,
    },
  });

  return NextResponse.json({ session: phoneBankSession }, { status: 201 });
}

/** GET — List active phone banking sessions (manager view) */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "volunteers:read");
  if (error) return error;

  const campaignId = session.user.activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const sessions = await prisma.phoneBankSession.findMany({
    where: { campaignId, status: "active" },
    include: { volunteer: { select: { name: true, email: true } } },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json({ sessions });
}
