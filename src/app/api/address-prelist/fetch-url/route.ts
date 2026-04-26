import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { processGeoJson } from "../upload/route";

export const maxDuration = 60;

function resolveGeoJsonUrl(raw: string): string {
  let url: URL;
  try { url = new URL(raw); } catch { return raw; }

  if (url.hostname.endsWith(".hub.arcgis.com") && url.pathname.includes("/datasets/")) {
    const base = url.pathname
      .replace(/\/(explore|about|data)\/?$/, "")
      .replace(/\/$/, "");
    const clean = base.replace(/\.\w+$/, "");
    return `${url.protocol}//${url.hostname}${clean}.geojson`;
  }

  if (url.pathname.includes("/FeatureServer/") || url.pathname.includes("/MapServer/")) {
    url.searchParams.set("f", "geojson");
    url.searchParams.set("outFields", "*");
    url.searchParams.set("where", "1=1");
    return url.toString();
  }

  return raw;
}

/**
 * POST /api/address-prelist/fetch-url
 * Body: { url: string }
 * Fetches GeoJSON from a URL (ArcGIS Hub, REST FeatureServer, or direct).
 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.headers.get("x-campaign-id");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:write");
  if (forbidden) return forbidden;

  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawUrl = (body.url ?? "").trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const resolvedUrl = resolveGeoJsonUrl(rawUrl);

  let geojson: unknown;
  try {
    const res = await fetch(resolvedUrl, {
      signal: AbortSignal.timeout(30_000),
      headers: { Accept: "application/geo+json, application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not fetch data: HTTP ${res.status}. Resolved URL: ${resolvedUrl}` },
        { status: 502 }
      );
    }
    geojson = await res.json();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return NextResponse.json({ error: `Fetch failed: ${msg}` }, { status: 502 });
  }

  const result = await processGeoJson(geojson, campaignId!);

  if (result.status === 200) {
    const data = (await result.json()) as Record<string, unknown>;
    return NextResponse.json({ ...data, resolvedUrl });
  }
  return result;
}
