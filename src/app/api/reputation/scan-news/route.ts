import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { scanNewsForCampaign } from "@/lib/reputation/news-scanner";

export const dynamic = "force-dynamic";

/** POST /api/reputation/scan-news — fetch real Canadian news for the campaign's candidate */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const campaignId = body.campaignId as string;
  const overrideQuery = body.query as string | undefined;

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  // Resolve search query from explicit override or campaign's candidate name / name
  let query = overrideQuery?.trim();
  if (!query) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { candidateName: true, name: true },
    });
    query = campaign?.candidateName?.trim() || campaign?.name?.trim() || "";
  }

  if (!query) {
    return NextResponse.json({ error: "No search query — set a candidate name on the campaign or pass query in the request body." }, { status: 400 });
  }

  try {
    const result = await scanNewsForCampaign(campaignId, session!.user.id, query);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `News scan failed: ${msg}` }, { status: 502 });
  }
}
