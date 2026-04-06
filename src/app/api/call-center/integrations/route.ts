import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

/** GET — List call center integrations */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "settings:read");
  if (error) return error;

  const campaignId = (session.user as any).activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const integrations = await prisma.callCenterIntegration.findMany({
    where: { campaignId },
    select: { id: true, provider: true, name: true, isActive: true, lastSyncAt: true, syncStats: true, webhookSecret: true, createdAt: true },
  });

  // Build webhook URLs for display
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pollcity.ca";
  const withUrls = integrations.map((i) => ({
    ...i,
    webhookUrl: `${baseUrl}/api/call-center/webhook/${i.webhookSecret}`,
  }));

  return NextResponse.json({ integrations: withUrls });
}

/** POST — Create a new call center integration */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "settings:write");
  if (error) return error;

  const campaignId = (session.user as any).activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const { provider, name, apiKey, apiUrl } = await req.json();
  if (!provider || !name) return NextResponse.json({ error: "provider and name required" }, { status: 400 });

  const integration = await prisma.callCenterIntegration.create({
    data: { campaignId, provider, name, apiKey: apiKey ?? null, apiUrl: apiUrl ?? null },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pollcity.ca";

  return NextResponse.json({
    integration,
    webhookUrl: `${baseUrl}/api/call-center/webhook/${integration.webhookSecret}`,
  }, { status: 201 });
}
