import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { DuplicateDecision, type Prisma } from "@prisma/client";
import { apiAuth } from "@/lib/auth/helpers";

/**
 * GET /api/crm/duplicates
 * List duplicate candidates for review. CAMPAIGN_MANAGER+ only.
 * Query: campaignId, decision? (pending|merged|not_duplicate|deferred), page?, limit?
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const decision = sp.get("decision") ?? "pending";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") ?? "25", 10));

  const where: Prisma.DuplicateCandidateWhereInput = { campaignId };
  if (decision !== "all") where.decision = decision as DuplicateDecision;

  const [candidates, total] = await Promise.all([
    prisma.duplicateCandidate.findMany({
      where,
      orderBy: [{ confidence: "asc" }, { confidenceScore: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contactA: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            phone: true, address1: true, city: true, postalCode: true,
            supportLevel: true, createdAt: true,
            _count: { select: { interactions: true, donations: true } },
          },
        },
        contactB: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            phone: true, address1: true, city: true, postalCode: true,
            supportLevel: true, createdAt: true,
            _count: { select: { interactions: true, donations: true } },
          },
        },
      },
    }),
    prisma.duplicateCandidate.count({ where }),
  ]);

  return NextResponse.json({
    data: candidates,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
