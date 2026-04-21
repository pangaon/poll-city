import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

/**
 * POST /api/atlas/boundaries
 * Accepts a GeoJSON file (FeatureCollection or Feature) and stores the
 * ward/riding boundary in Campaign.customization.boundaryGeoJSON.
 *
 * Used by the Atlas Command import panel. Replaces the "coming soon" stub.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.headers.get("x-campaign-id");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:write");
  if (forbidden) return forbidden;

  let body: FormData;
  try {
    body = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = body.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const filename = (file as File).name ?? "boundary";
  const ext = filename.split(".").pop()?.toLowerCase();

  if (!["geojson", "json"].includes(ext ?? "")) {
    return NextResponse.json(
      { error: "Only GeoJSON (.geojson or .json) is supported. To import a Shapefile, open the ArcGIS GeoHub and download as GeoJSON." },
      { status: 415 }
    );
  }

  if ((file as File).size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 50 MB" }, { status: 413 });
  }

  let geojson: unknown;
  try {
    const text = await (file as File).text();
    geojson = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "File is not valid JSON" }, { status: 422 });
  }

  if (!geojson || typeof geojson !== "object") {
    return NextResponse.json({ error: "Invalid GeoJSON" }, { status: 422 });
  }

  const gj = geojson as Record<string, unknown>;
  if (!["FeatureCollection", "Feature", "Polygon", "MultiPolygon"].includes(gj.type as string)) {
    return NextResponse.json({ error: "GeoJSON must be a FeatureCollection, Feature, Polygon, or MultiPolygon" }, { status: 422 });
  }

  // Count features for the response
  let featureCount = 1;
  if (gj.type === "FeatureCollection" && Array.isArray(gj.features)) {
    featureCount = (gj.features as unknown[]).length;
  }

  // Merge into existing customization
  const existing = await prisma.campaign.findUnique({
    where: { id: campaignId! },
    select: { customization: true },
  });
  const existingCx = (existing?.customization && typeof existing.customization === "object")
    ? existing.customization as Record<string, unknown>
    : {};

  await prisma.campaign.update({
    where: { id: campaignId! },
    data: {
      customization: {
        ...existingCx,
        boundaryGeoJSON: geojson,
        boundaryFilename: filename,
        boundaryImportedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({
    data: {
      filename,
      featureCount,
      importedAt: new Date().toISOString(),
    },
  });
}
