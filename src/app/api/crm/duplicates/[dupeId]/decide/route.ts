import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const decideSchema = z.object({
  campaignId: z.string(),
  decision: z.enum(["not_duplicate", "deferred"]),
  notes: z.string().max(500).optional(),
});

/**
 * POST /api/crm/duplicates/[dupeId]/decide
 * Mark a duplicate candidate as not-duplicate or deferred.
 * Merge is handled separately via POST /api/crm/merge.
 * CAMPAIGN_MANAGER+ only.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { dupeId: string } }
) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = decideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const candidate = await prisma.duplicateCandidate.findUnique({
    where: { id: params.dupeId },
    select: { id: true, campaignId: true, decision: true },
  });
  if (!candidate || candidate.campaignId !== parsed.data.campaignId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: candidate.campaignId } },
  });
  if (!membership || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (candidate.decision === "merged") {
    return NextResponse.json({ error: "Cannot re-decide a merged candidate" }, { status: 409 });
  }

  const updated = await prisma.duplicateCandidate.update({
    where: { id: params.dupeId },
    data: {
      decision: parsed.data.decision,
      notes: parsed.data.notes,
      decidedByUserId: session!.user.id,
      decidedAt: new Date(),
    },
  });

  return NextResponse.json({ data: updated });
}
