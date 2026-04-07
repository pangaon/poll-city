import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const createResultSchema = z.object({
  mediaOutletId: z.string().min(1),
  province: z.string().min(1),
  municipality: z.string().min(1),
  ward: z.string().nullish(),
  office: z.string().min(1),
  candidateName: z.string().min(1),
  party: z.string().nullish(),
  votes: z.number().int().min(0),
  percentReporting: z.number().min(0).max(100).optional().default(0),
  isLeading: z.boolean().optional().default(false),
  isCalled: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  const { session, error } = await apiAuth(request);
  if (error) return error;

  const outletId = request.nextUrl.searchParams.get("outletId");
  const where = outletId ? { mediaOutletId: outletId } : {};

  const results = await prisma.liveResult.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ data: results });
}

export async function POST(request: NextRequest) {
  const { session, error } = await apiAuth(request);
  if (error) return error;

  const rawBody = await request.json().catch(() => null);
  const parsed = createResultSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const userId = session!.user.id;
  const d = parsed.data;

  // Double-entry verification: check if there's an unverified result for same race+candidate
  const existing = await prisma.liveResult.findFirst({
    where: {
      mediaOutletId: d.mediaOutletId,
      municipality: d.municipality,
      office: d.office,
      candidateName: d.candidateName,
      ward: d.ward ?? null,
      isVerified: false,
      entryOneUserId: { not: null },
      entryTwoUserId: null,
    },
  });

  if (existing && existing.entryOneUserId !== userId) {
    // Second entry — verify if votes match
    const isMatch = existing.votes === d.votes;
    const updated = await prisma.liveResult.update({
      where: { id: existing.id },
      data: {
        entryTwoUserId: userId,
        isVerified: isMatch,
        votes: isMatch ? d.votes : existing.votes,
        percentReporting: d.percentReporting,
        isLeading: d.isLeading,
        isCalled: d.isCalled,
      },
    });
    return NextResponse.json({
      data: updated,
      verified: isMatch,
      message: isMatch
        ? "Result verified — both entries match"
        : "Mismatch detected — needs review",
    }, { status: isMatch ? 200 : 409 });
  }

  // First entry
  const result = await prisma.liveResult.create({
    data: {
      mediaOutletId: d.mediaOutletId,
      province: d.province,
      municipality: d.municipality,
      ward: d.ward ?? null,
      office: d.office,
      candidateName: d.candidateName,
      party: d.party ?? null,
      votes: d.votes,
      percentReporting: d.percentReporting,
      isLeading: d.isLeading,
      isCalled: d.isCalled,
      entryOneUserId: userId,
    },
  });

  return NextResponse.json(
    { data: result, message: "First entry recorded — awaiting verification" },
    { status: 201 }
  );
}
