/**
 * E-Day: My Assignment
 *
 * Returns the current user's scrutineer assignment for today (or the next
 * upcoming election date). Used to pre-populate the OCR scan form with
 * polling station info so the scrutineer doesn't need to enter it manually.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  // Verify membership (any role)
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  // Find the nearest upcoming (or today's) signed assignment
  const assignment = await prisma.scrutineerAssignment.findFirst({
    where: {
      campaignId,
      userId: session!.user.id,
      candidateSigned: true,
      electionDate: { gte: new Date(now.toDateString()) }, // start of today
    },
    orderBy: { electionDate: "asc" },
  });

  return NextResponse.json({ data: assignment ?? null });
}
