import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PromoteBody = z.object({
  ids: z.array(z.string().cuid()).min(1).max(500),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = PromoteBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const { ids } = parsed.data;

  const rawCandidates = await prisma.rawMuniCandidate.findMany({
    where: { id: { in: ids } },
    include: { run: { select: { sourceUrl: true } } },
  });

  if (!rawCandidates.length) {
    return NextResponse.json({ error: "No candidates found for given IDs" }, { status: 404 });
  }

  // Skip any that are already promoted (same name + office + jurisdiction)
  const existing = await prisma.candidateLead.findMany({
    where: {
      detectedNameRaw: { in: rawCandidates.map(c => c.candidateName) },
      sourceType: "official_list",
    },
    select: { detectedNameRaw: true, officeRaw: true, jurisdictionRaw: true },
  });

  const existingKeys = new Set(
    existing.map(l => `${l.detectedNameRaw}|${l.officeRaw}|${l.jurisdictionRaw}`)
  );

  const toCreate = rawCandidates.filter(c => {
    const key = `${c.candidateName}|${c.office}|${c.municipality}`;
    return !existingKeys.has(key);
  });

  if (!toCreate.length) {
    return NextResponse.json({ promoted: 0, skipped: rawCandidates.length, message: "All already promoted" });
  }

  await prisma.candidateLead.createMany({
    data: toCreate.map(c => ({
      detectedNameRaw:    c.candidateName,
      officeRaw:          c.office,
      jurisdictionRaw:    c.municipality,
      wardOrRidingRaw:    c.ward,
      sourceType:         "official_list",
      sourceUrl:          c.run.sourceUrl,
      confidenceScore:    90.0,
      verificationStatus: "pending",
      reviewStatus:       "unreviewed",
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({
    promoted: toCreate.length,
    skipped: rawCandidates.length - toCreate.length,
  });
}
