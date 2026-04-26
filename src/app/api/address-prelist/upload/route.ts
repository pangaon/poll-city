import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import type { Feature, FeatureCollection, Point } from "geojson";

export const maxDuration = 60;

function getPropStr(props: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = props[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function getPropInt(props: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = props[k];
    if (v !== undefined && v !== null) {
      const n = parseInt(String(v), 10);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

export async function processGeoJson(geojson: unknown, campaignId: string): Promise<NextResponse> {
  if (!geojson || typeof geojson !== "object") {
    return NextResponse.json({ error: "Invalid GeoJSON" }, { status: 422 });
  }

  const gj = geojson as Record<string, unknown>;
  let features: Feature[] = [];

  if (gj.type === "FeatureCollection") {
    features = ((gj as unknown as FeatureCollection).features ?? []) as Feature[];
  } else if (gj.type === "Feature") {
    features = [gj as unknown as Feature];
  } else {
    return NextResponse.json(
      { error: "GeoJSON must be a FeatureCollection or Feature with Point geometries" },
      { status: 422 }
    );
  }

  const rows: {
    campaignId: string;
    civicNum: number;
    street: string;
    unit?: string;
    postalCode: string;
    pollDivId: string;
    daCode: string;
    lat: number;
    lng: number;
    source: string;
  }[] = [];

  let skipped = 0;

  for (const f of features) {
    if (!f || f.type !== "Feature") { skipped++; continue; }
    const geom = f.geometry as Point | null;
    if (!geom || geom.type !== "Point" || !Array.isArray(geom.coordinates)) { skipped++; continue; }

    const [lng, lat] = geom.coordinates as [number, number];
    if (typeof lng !== "number" || typeof lat !== "number") { skipped++; continue; }

    const props = (f.properties ?? {}) as Record<string, unknown>;

    const civicNum = getPropInt(props, [
      "ADDRESSNUMBER", "CIVIC_NUM", "CIVIC", "civic_num", "civic", "addressNumber",
      "AddressNumber", "ADDRESS_NUMBER", "NUMBER", "STREET_NUM",
    ]);
    if (civicNum === null) { skipped++; continue; }

    const street = getPropStr(props, [
      "FULLSTREET", "FULL_STREET", "STREET", "STREET_NAME", "street", "street_name",
      "STREETNAME", "StreetName", "STREETFULL", "ADDRESS",
    ]);
    if (!street) { skipped++; continue; }

    const postalCode = getPropStr(props, [
      "POSTALCODE", "POSTAL_CODE", "postal_code", "postalCode", "PostalCode",
      "POSTCODE", "postcode", "ZIP",
    ]);

    const unitStr = getPropStr(props, ["UNIT", "unit", "SUITE", "suite", "APT", "apt"]);

    rows.push({
      campaignId,
      civicNum,
      street,
      unit: unitStr || undefined,
      postalCode,
      pollDivId: "",
      daCode: "",
      lat,
      lng,
      source: "arcgis",
    });
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid Point features found. The GeoJSON must contain Point features with civic number and street name properties." },
      { status: 422 }
    );
  }

  await prisma.addressPreList.deleteMany({ where: { campaignId, source: "arcgis" } });

  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    await prisma.addressPreList.createMany({ data: rows.slice(i, i + BATCH) });
  }

  return NextResponse.json({ count: rows.length, skipped, source: "arcgis" });
}

/**
 * POST /api/address-prelist/upload
 * Accepts a multipart GeoJSON file of Point features (e.g. ArcGIS Hub address export).
 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.headers.get("x-campaign-id");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:write");
  if (forbidden) return forbidden;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if ((file as File).size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 50 MB" }, { status: 413 });
  }

  let geojson: unknown;
  try {
    geojson = JSON.parse(await (file as File).text());
  } catch {
    return NextResponse.json({ error: "File is not valid JSON" }, { status: 422 });
  }

  return processGeoJson(geojson, campaignId!);
}
