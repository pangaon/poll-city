import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const logs = await prisma.importLog.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      filename: true,
      fileType: true,
      totalRows: true,
      processedRows: true,
      importedCount: true,
      updatedCount: true,
      skippedCount: true,
      errorCount: true,
      status: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json({ data: logs });
}