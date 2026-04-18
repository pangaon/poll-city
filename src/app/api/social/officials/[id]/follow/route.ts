import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/social/officials/[id]/follow   — follow an official
 * DELETE /api/social/officials/[id]/follow — unfollow an official
 */

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = rateLimit(req, "read");
  if (rateLimitResponse) return rateLimitResponse;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user.id;
  const officialId = params.id;

  const official = await prisma.official.findUnique({
    where: { id: officialId, isActive: true },
    select: { id: true, name: true },
  });
  if (!official) {
    return NextResponse.json({ error: "Official not found" }, { status: 404 });
  }

  await prisma.officialFollow.upsert({
    where: { userId_officialId: { userId, officialId } },
    create: { userId, officialId },
    update: {}, // already following — no-op
  });

  return NextResponse.json({ data: { following: true, officialId } });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = rateLimit(req, "read");
  if (rateLimitResponse) return rateLimitResponse;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user.id;
  const officialId = params.id;

  await prisma.officialFollow.deleteMany({
    where: { userId, officialId },
  });

  return NextResponse.json({ data: { following: false, officialId } });
}
