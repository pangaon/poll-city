import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { ensureCampaignMapAccess } from "@/lib/maps/auth";
import prisma from "@/lib/db/prisma";
import fs from "fs";
import path from "path";

type GeoFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: object;
};

type GeoFeatureCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

function loadMunicipalityGeoJSON(municipality: string): GeoFeatureCollection | null {
  try {
    const filePath = path.join(
      process.cwd(),
      "docs",
      "geodata",
      "municipalities",
      "ontario",
      municipality,
      `${municipality}-wards.geojson`,
    );
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as GeoFeatureCollection;
  } catch {
    return null;
  }
}

function detectMunicipality(jurisdiction: string | null | undefined): string | null {
  if (!jurisdiction) return null;
  const lower = jurisdiction.toLowerCase();
  if (lower.includes("whitby")) return "whitby";
  // TODO: expand to full municipality registry as geodata grows
  return null;
}

function filterWardForJurisdiction(
  geojson: GeoFeatureCollection,
  jurisdiction: string,
): GeoFeature | null {
  const lower = jurisdiction.toLowerCase();
  return (
    geojson.features.find((f) => {
      const desc = String(f.properties.WARD_DESC ?? "").toLowerCase();
      const text = String(f.properties.WARD_TEXT ?? "").toLowerCase();
      return desc === lower || text === lower || desc.includes(lower) || lower.includes(desc);
    }) ?? null
  );
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const access = await ensureCampaignMapAccess(session!.user.id, campaignId);
  if (access.error) return access.error;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { jurisdiction: true, officialId: true, customization: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";

  // Prefer boundary imported via Atlas or seeded directly — highest fidelity
  const cx = (campaign.customization && typeof campaign.customization === "object")
    ? campaign.customization as Record<string, unknown>
    : {};
  if (cx.boundaryGeoJSON && typeof cx.boundaryGeoJSON === "object") {
    return NextResponse.json(
      { data: cx.boundaryGeoJSON },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const municipality = detectMunicipality(campaign.jurisdiction);
  if (!municipality) {
    return NextResponse.json({ data: null }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  const geojson = loadMunicipalityGeoJSON(municipality);
  if (!geojson) {
    return NextResponse.json({ data: null }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  if (isSuperAdmin) {
    return NextResponse.json(
      { data: geojson },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  }

  const feature = filterWardForJurisdiction(geojson, campaign.jurisdiction ?? "");
  if (feature) {
    return NextResponse.json(
      { data: feature },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  }

  // Fallback: return the full municipality boundary
  return NextResponse.json(
    { data: geojson },
    { headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
