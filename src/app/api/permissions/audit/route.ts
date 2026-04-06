import { NextRequest, NextResponse } from "next/server";
import { apiAuthWithPermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

/** GET — List permission audit log for the active campaign */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "team:manage");
  if (error) return error;

  const campaignId = (session.user as any).activeCampaignId as string;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 100);
  const offset = Number(searchParams.get("offset") || "0");

  const [entries, total] = await Promise.all([
    prisma.permissionAuditLog.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.permissionAuditLog.count({ where: { campaignId } }),
  ]);

  return NextResponse.json({ entries, total });
}
