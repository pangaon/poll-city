import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

/**
 * GET /api/field-ops/ward-polls?campaignId=X
 *
 * Returns wards and their polling divisions with contact counts.
 * Used by the deployment modal to let campaign managers target by poll.
 *
 * Response:
 * {
 *   wards: [
 *     {
 *       ward: "Ward 12",
 *       contactCount: 10,
 *       polls: [
 *         { poll: "Poll 4", contactCount: 2 },
 *         ...
 *       ]
 *     }
 *   ]
 * }
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    campaignId,
    "canvassing:read",
  );
  if (forbidden) return forbidden;

  // Get all contacts with ward/poll info for this campaign
  const contacts = await prisma.contact.findMany({
    where: { campaignId, deletedAt: null },
    select: { ward: true, municipalPoll: true },
  });

  // Group by ward, then by poll within each ward
  const wardMap = new Map<string, Map<string, number>>();

  for (const c of contacts) {
    const ward = c.ward ?? "Unknown Ward";
    if (!wardMap.has(ward)) wardMap.set(ward, new Map());
    const pollMap = wardMap.get(ward)!;
    const poll = c.municipalPoll ?? "Unknown Poll";
    pollMap.set(poll, (pollMap.get(poll) ?? 0) + 1);
  }

  const wards = Array.from(wardMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ward, pollMap]) => {
      const polls = Array.from(pollMap.entries())
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .map(([poll, contactCount]) => ({ poll, contactCount }));
      const contactCount = polls.reduce((sum, p) => sum + p.contactCount, 0);
      return { ward, contactCount, polls };
    });

  return NextResponse.json({ wards });
}
