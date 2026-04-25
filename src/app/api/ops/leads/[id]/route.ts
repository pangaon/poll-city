import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { CandidateVerificationStatus, CandidateReviewStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchBody = z.object({
  reviewStatus:       z.enum(["unreviewed", "in_review", "reviewed"]).optional(),
  verificationStatus: z.enum(["pending", "auto_verified", "manually_verified", "rejected", "duplicate"]).optional(),
  reviewNotes:        z.string().max(2000).optional(),
  canonicalName:      z.string().max(200).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  const { reviewStatus, verificationStatus, reviewNotes, canonicalName } = parsed.data;

  const lead = await prisma.candidateLead.update({
    where: { id: params.id },
    data: {
      ...(reviewStatus      ? { reviewStatus:       reviewStatus as CandidateReviewStatus,       reviewedAt: new Date(), reviewedByUserId: session.user.id } : {}),
      ...(verificationStatus ? { verificationStatus: verificationStatus as CandidateVerificationStatus } : {}),
      ...(reviewNotes !== undefined ? { reviewNotes }  : {}),
      ...(canonicalName     ? { canonicalName }        : {}),
    },
    select: { id: true, reviewStatus: true, verificationStatus: true, reviewNotes: true },
  });

  return NextResponse.json({ lead });
}
