import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";
import { browseSources, getCampaignActivations, activateSource } from "@/lib/sources/subscription-service";
import type { SourceAlertThreshold } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const p = req.nextUrl.searchParams;
  const campaignId = p.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const view = p.get("view") ?? "browse"; // "browse" | "active"

  if (view === "active") {
    const activations = await getCampaignActivations(campaignId!);
    return NextResponse.json({ activations });
  }

  // Default: browse available library
  const result = await browseSources(campaignId!, {
    municipality: p.get("municipality") || undefined,
    sourceType: p.get("sourceType") || undefined,
    isRecommended: p.get("isRecommended") === "true" ? true : undefined,
    search: p.get("search") || undefined,
    page: Math.max(1, parseInt(p.get("page") ?? "1", 10)),
    limit: Math.min(100, parseInt(p.get("limit") ?? "50", 10)),
  });

  return NextResponse.json(result);
}

const ActivateSchema = z.object({
  campaignId: z.string().min(1),
  sourceId: z.string().min(1),
  customAlertThreshold: z.enum(["all_alerts", "important_only", "critical_only", "digest_only", "muted"]).optional(),
  monitoringModes: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  mentionTracking: z.boolean().optional(),
  sentimentTracking: z.boolean().optional(),
  issueTracking: z.boolean().optional(),
  opponentTracking: z.boolean().optional(),
  dailyDigest: z.boolean().optional(),
  realTimeAlerts: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = ActivateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { campaignId, sourceId, ...options } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:write");
  if (forbidden) return forbidden;

  try {
    const activation = await activateSource(campaignId, sourceId, {
      ...options,
      customAlertThreshold: options.customAlertThreshold as SourceAlertThreshold | undefined,
      createdByUserId: session!.user.id,
    });
    return NextResponse.json({ activation }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to activate source";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
