import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/social/petitions
 *
 * Returns active public petitions with signature counts.
 * If the user is authenticated, includes whether they have signed each one.
 *
 * Query params:
 *   limit  — max petitions to return (default 10, max 25)
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "read");
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const rawLimit = parseInt(sp.get("limit") ?? "10", 10);
  const limit = Math.min(Math.max(rawLimit, 1), 25);

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const petitions = await prisma.petition.findMany({
    where: { isPublic: true, status: "active" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      signatureGoal: true,
      targetMunicipality: true,
      targetWard: true,
      createdAt: true,
      _count: { select: { signatures: true } },
      // Include the current user's signature if authenticated
      signatures: userId
        ? { where: { userId }, select: { id: true }, take: 1 }
        : false,
    },
  });

  const data = petitions.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    signatureGoal: p.signatureGoal,
    targetMunicipality: p.targetMunicipality,
    targetWard: p.targetWard,
    signatures: p._count.signatures,
    signed: userId ? (p.signatures as { id: string }[]).length > 0 : false,
  }));

  return NextResponse.json({ data });
}
