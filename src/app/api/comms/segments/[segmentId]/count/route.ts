import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// ─── POST /api/comms/segments/[segmentId]/count ───────────────────────────────
// Resolves the live contact count for a saved segment and persists lastCount.
export async function POST(
  req: NextRequest,
  { params }: { params: { segmentId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const segment = await prisma.savedSegment.findUnique({
    where: { id: params.segmentId, deletedAt: null },
    select: { id: true, campaignId: true, filterDefinition: true },
  });
  if (!segment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: segment.campaignId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse filterDefinition (stored as Json — cast to known shape)
  const fd = segment.filterDefinition as {
    supportLevels?: string[];
    wards?: string[];
    tagIds?: string[];
    channel?: "email" | "sms" | "all";
    volunteerOnly?: boolean;
    hasEmail?: boolean;
    hasPhone?: boolean;
    excludeDnc?: boolean;
  } | null ?? {};

  const excludeDnc = fd.excludeDnc ?? true;

  const where = {
    campaignId: segment.campaignId,
    deletedAt: null,
    isDeceased: false,
    ...(excludeDnc ? { doNotContact: false } : {}),
    ...(fd.volunteerOnly ? { volunteerInterest: true } : {}),
    ...(fd.hasEmail ? { email: { not: null } } : {}),
    ...(fd.hasPhone ? { phone: { not: null } } : {}),
    ...(fd.channel === "email" ? { email: { not: null } } : {}),
    ...(fd.channel === "sms" ? { phone: { not: null } } : {}),
    ...(fd.supportLevels && fd.supportLevels.length > 0
      ? { supportLevel: { in: fd.supportLevels as never[] } }
      : {}),
    ...(fd.wards && fd.wards.length > 0 ? { ward: { in: fd.wards } } : {}),
    ...(fd.tagIds && fd.tagIds.length > 0
      ? { tags: { some: { tagId: { in: fd.tagIds } } } }
      : {}),
  };

  const count = await prisma.contact.count({ where });

  // Persist the refreshed count
  await prisma.savedSegment.update({
    where: { id: segment.id },
    data: { lastCount: count, lastCountedAt: new Date() },
  });

  return NextResponse.json({ count, countedAt: new Date().toISOString() });
}
