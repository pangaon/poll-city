import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "gotv:read");
  if (forbidden) return forbidden;

  const templates = await prisma.votedListTemplate.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    include: { uploads: { select: { id: true, uploadedAt: true, fileName: true } } },
  });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: { campaignId?: string; name?: string; columnMapping?: unknown; sampleRows?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { campaignId, name, columnMapping, sampleRows } = body;
  if (!campaignId || !name || !columnMapping) {
    return NextResponse.json(
      { error: "campaignId, name, columnMapping required" },
      { status: 400 },
    );
  }
  const { forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, campaignId, "gotv:write");
  if (forbidden2) return forbidden2;

  const template = await prisma.votedListTemplate.create({
    data: {
      campaignId,
      name: String(name).slice(0, 100),
      columnMapping: columnMapping as object,
      sampleRows: sampleRows ? (sampleRows as object) : undefined,
    },
  });

  return NextResponse.json({ template });
}
