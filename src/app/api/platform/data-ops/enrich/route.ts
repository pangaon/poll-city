/**
 * POST /api/platform/data-ops/enrich
 * SUPER_ADMIN only. Enriches a specific campaign with data relevant to its jurisdiction.
 * Checks what ingested data is available and matches it to the campaign's ward/jurisdiction.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req, [Role.SUPER_ADMIN]);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { campaignId } = body as { campaignId?: string };
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 422 });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, jurisdiction: true, electionType: true },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const jurisdiction = campaign.jurisdiction ?? "";
  const enriched: string[] = [];

  // Check what datasets have been ingested that are relevant to this campaign's jurisdiction
  const municipality = extractMunicipality(jurisdiction);

  const relevantDatasets = await prisma.dataset.findMany({
    where: {
      status: "active",
      lastIngestedAt: { not: null },
      dataSource: {
        jurisdictionName: { contains: municipality, mode: "insensitive" },
      },
    },
    select: { name: true, category: true, recordCount: true, lastIngestedAt: true },
  });

  for (const ds of relevantDatasets) {
    enriched.push(`${ds.name} (${ds.recordCount ?? 0} records, last updated ${ds.lastIngestedAt?.toLocaleDateString("en-CA") ?? "unknown"})`);
  }

  // Log the enrichment action
  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "intelligence_enriched",
      entityType: "campaign",
      entityId: campaignId,
      details: {
        jurisdiction,
        municipality,
        datasetsFound: enriched.length,
        datasets: enriched,
        triggeredBy: "super_admin_manual",
      },
    },
  });

  return NextResponse.json({
    data: {
      campaignId,
      jurisdiction,
      enriched,
      message: enriched.length > 0
        ? `${enriched.length} dataset(s) available for ${municipality}`
        : `No ingested data found for "${municipality}" yet. Seed the registry and run the relevant sources first.`,
    },
  });
}

function extractMunicipality(jurisdiction: string): string {
  const parts = jurisdiction.split(",");
  if (parts.length > 1) return parts[parts.length - 1].trim();
  const words = jurisdiction.split(" ");
  return words[0] ?? jurisdiction;
}
