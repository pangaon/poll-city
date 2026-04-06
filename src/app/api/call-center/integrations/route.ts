import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";
import { callCenterIntegrationSchema } from "@/lib/validators/campaigns";

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

  const body = await req.json();
  const parsed = callCenterIntegrationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const { provider, name, apiKey, apiUrl } = parsed.data;

  const integration = await prisma.callCenterIntegration.create({
    data: { campaignId, provider, name, apiKey: apiKey ?? null, apiUrl: apiUrl ?? null },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pollcity.ca";
  const { webhookSecret: _webhookSecret, apiKey: _apiKey, ...safeIntegration } = integration;

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: (session.user as any).id,
      action: "call_center_integration_created",
      entityType: "CallCenterIntegration",
      entityId: integration.id,
      details: { provider, name },
    },
  });

  return NextResponse.json(
    {
      integration: safeIntegration,
      webhookUrl: `${baseUrl}/api/call-center/webhook/${integration.webhookSecret}`,
      webhookUrlOneTime: true,
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
