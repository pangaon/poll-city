import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { runMockIngestion } from "@/lib/reputation/alert-engine";

export const dynamic = "force-dynamic";

/** POST /api/reputation/ingest?campaignId=X — trigger mock ingestion pipeline */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const campaignId = body.campaignId as string;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const alerts = await runMockIngestion(campaignId, session!.user.id);
  return NextResponse.json({ alerts, count: alerts.length }, { status: 201 });
}
