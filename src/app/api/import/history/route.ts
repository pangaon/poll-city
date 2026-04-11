import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "import_export:read");
  if (forbidden) return forbidden;

  const logs = await prisma.importLog.findMany({
    where: { campaignId: campaignId! },
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
      rollbackDeadline: true,
    },
  });

  return NextResponse.json({ data: logs });
}