import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 10) return "***";
  return `${secret.slice(0, 6)}...${secret.slice(-4)}`;
}

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
    id: i.id,
    provider: i.provider,
    name: i.name,
    isActive: i.isActive,
    lastSyncAt: i.lastSyncAt,
    syncStats: i.syncStats,
    createdAt: i.createdAt,
    webhookUrl: `${baseUrl}/api/call-center/webhook/${maskSecret(i.webhookSecret)}`,
    webhookSecretMasked: maskSecret(i.webhookSecret),
  }));

  return NextResponse.json(
    { integrations: withUrls },
    { headers: { "Cache-Control": "no-store" } }
  );
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
  const { webhookSecret: _webhookSecret, apiKey: _apiKey, ...safeIntegration } = integration;

  return NextResponse.json(
    {
      integration: safeIntegration,
      webhookUrl: `${baseUrl}/api/call-center/webhook/${integration.webhookSecret}`,
      webhookUrlOneTime: true,
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
