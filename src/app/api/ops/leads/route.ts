import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { CandidateVerificationStatus, CandidateReviewStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const verificationStatus = searchParams.get("verificationStatus");
  const reviewStatus       = searchParams.get("reviewStatus");
  const office             = searchParams.get("office");
  const jurisdiction       = searchParams.get("jurisdiction");
  const page               = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit              = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") ?? "50", 10)));
  const skip               = (page - 1) * limit;

  const where = {
    ...(verificationStatus ? { verificationStatus: verificationStatus as CandidateVerificationStatus } : {}),
    ...(reviewStatus       ? { reviewStatus: reviewStatus as CandidateReviewStatus }                   : {}),
    ...(office             ? { officeRaw:       { contains: office,        mode: "insensitive" as const } } : {}),
    ...(jurisdiction       ? { jurisdictionRaw: { contains: jurisdiction,  mode: "insensitive" as const } } : {}),
  };

  const [leads, total] = await Promise.all([
    prisma.candidateLead.findMany({
      where,
      orderBy: [{ confidenceScore: "desc" }, { detectedAt: "desc" }],
      skip,
      take: limit,
      select: {
        id: true, detectedNameRaw: true, canonicalName: true,
        officeRaw: true, officeNormalized: true,
        jurisdictionRaw: true, wardOrRidingRaw: true,
        partyRaw: true, sourceType: true, sourceUrl: true,
        detectedAt: true, confidenceScore: true,
        verificationStatus: true, reviewStatus: true, reviewNotes: true,
        profile: { select: { id: true, campaignStatus: true } },
        _count: { select: { outreachAttempts: true } },
      },
    }),
    prisma.candidateLead.count({ where }),
  ]);

  return NextResponse.json({ leads, total, page, pages: Math.ceil(total / limit) });
}
