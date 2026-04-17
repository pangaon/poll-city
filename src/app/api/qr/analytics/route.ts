/**
 * GET /api/qr/analytics?campaignId=xxx&qrCodeId=yyy&days=30
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { getQrAnalytics } from "@/lib/qr/analytics";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const qrCodeId = sp.get("qrCodeId") ?? undefined;
  const days = parseInt(sp.get("days") ?? "30", 10);

  const analytics = await getQrAnalytics(campaignId, { qrCodeId, days });
  return NextResponse.json(analytics);
}
