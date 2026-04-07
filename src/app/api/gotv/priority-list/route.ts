/**
 * GET /api/gotv/priority-list — P1-P4 tier filtered contact list.
 *
 * George's spec:
 * Query params: tier (P1/P2/P3/P4), page, limit
 * Returns contacts filtered by tier who have NOT voted yet
 * Sorted by support level (strongest first)
 * Include: id, firstName, lastName, address, phone, supportLevel, lastContactedAt, voted
 *
 * Tier mapping (using support level as proxy):
 * P1 = strong_support (most reliable — call on election morning)
 * P2 = leaning_support (call day before + morning)
 * P3 = undecided (persuadable — call 3 days out)
 * P4 = leaning_against (low priority)
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { getGotvPriorityList } from "@/lib/operations/metrics-truth";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:read");
  if (permError) return permError;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tier = sp.get("tier")?.toUpperCase() ?? "P1";
  const page = Math.max(1, Number(sp.get("page") || "1"));
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit") || "50")));

  const result = await getGotvPriorityList(
    campaignId,
    (["P1", "P2", "P3", "P4"].includes(tier) ? tier : "P1") as "P1" | "P2" | "P3" | "P4",
    page,
    limit,
  );

  return NextResponse.json({
    tier: result.tier,
    data: result.contacts,
    contacts: result.contacts,
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages,
  });
}
