import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "volunteers:manage");
  if (permError) return permError;

  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  try {
    // Verify all volunteers belong to campaigns the user has access to
    const profiles = await prisma.volunteerProfile.findMany({
      where: { id: { in: ids } },
      select: { campaignId: true },
    });

    const campaignIds = Array.from(new Set(profiles.map(p => p.campaignId).filter(Boolean))) as string[];
    const memberships = await prisma.membership.findMany({
      where: {
        userId: session!.user.id,
        campaignId: { in: campaignIds },
      },
    });

    if (memberships.length !== campaignIds.length) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.volunteerProfile.updateMany({
      where: { id: { in: ids } },
      data: { isActive: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bulk activate volunteers error:", error);
    return NextResponse.json({ error: "Failed to activate volunteers" }, { status: 500 });
  }
}