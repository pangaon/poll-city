import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { WARD_ASSET_REGISTRY, type WardAssetEntry, type WardAssetSource } from "@/config/ward-asset-registry";

export interface IngestResult {
  municipality: string;
  count: number;
  sourceUrl: string;
  sourceType: string;
  error?: string;
}

// ─── Source fetchers ──────────────────────────────────────────────────────────

async function fetchArcGISRest(src: WardAssetSource): Promise<GeoJSONFeature[]> {
  // Item metadata pattern (arcgis.com item ID) — derive service URL first
  if (src.url.includes("/sharing/rest/content/items/")) {
    const metaRes = await fetch(`${src.url}?f=json`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!metaRes.ok) throw new Error(`ArcGIS meta ${metaRes.status}`);
    const meta = (await metaRes.json()) as { url?: string };
    if (!meta.url) throw new Error("ArcGIS item has no service URL");
    const layer = src.layer ?? 0;
    const qUrl = buildArcGISQuery(`${meta.url}/${layer}`, src);
    return fetchArcGISQuery(qUrl);
  }
  // Direct FeatureServer URL
  const layer = src.layer ?? 0;
  const qUrl = buildArcGISQuery(`${src.url}/${layer}`, src);
  return fetchArcGISQuery(qUrl);
}

function buildArcGISQuery(baseUrl: string, src: WardAssetSource): string {
  const where = src.filter ? encodeURIComponent(src.filter) : "1%3D1";
  return (
    `${baseUrl}/query` +
    `?where=${where}` +
    `&outFields=*` +
    `&f=geojson` +
    `&outSR=${src.outSR ?? 4326}` +
    `&resultRecordCount=500`
  );
}

async function fetchArcGISQuery(url: string): Promise<GeoJSONFeature[]> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`ArcGIS query ${res.status}`);
  const data = (await res.json()) as { type?: string; features?: GeoJSONFeature[] };
  if (data?.type !== "FeatureCollection" || !data.features?.length) {
    throw new Error("ArcGIS query returned empty FeatureCollection");
  }
  validateWGS84(data.features, url);
  return data.features;
}

async function fetchArcGISGeoJSON(src: WardAssetSource): Promise<GeoJSONFeature[]> {
  const res = await fetch(src.url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`GeoJSON download ${res.status}`);
  const data = (await res.json()) as { type?: string; features?: GeoJSONFeature[] };
  if (data?.type !== "FeatureCollection" || !data.features?.length) {
    throw new Error("GeoJSON download returned empty FeatureCollection");
  }
  validateWGS84(data.features, src.url);
  return data.features;
}

// Retry fetch on 429 (rate limit) with linear backoff. Returns null on timeout/network error.
async function fetchWithRetry(url: string, timeoutMs: number, maxAttempts = 4): Promise<Response | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 1500));
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (res.status !== 429) return res;
    } catch {
      if (attempt === maxAttempts - 1) return null;
    }
  }
  return null;
}

async function fetchRepresent(src: WardAssetSource): Promise<GeoJSONFeature[]> {
  const listRes = await fetchWithRetry(src.url, 10000);
  if (!listRes || !listRes.ok) throw new Error(`Represent list ${listRes?.status ?? "no response"}`);
  const listData = (await listRes.json()) as {
    objects: Array<{ url: string; name: string }>;
  };
  if (!listData.objects?.length) throw new Error("Represent returned no boundary objects");

  const results = await Promise.allSettled(
    listData.objects.map(async (b) => {
      // Retry individual shape fetches — Represent rate-limits per-request, not just per-list
      const shapeRes = await fetchWithRetry(
        `https://represent.opennorth.ca${b.url}simple_shape`,
        8000,
      );
      if (!shapeRes || !shapeRes.ok) return null;
      const geometry = await shapeRes.json();
      const rawName = b.name.split("/").pop() ?? b.name;
      const wardName = rawName.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        type: "Feature",
        properties: { WARD_NAME: wardName } as Record<string, unknown>,
        geometry,
      } as GeoJSONFeature;
    }),
  );

  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<GeoJSONFeature | null>).value)
    .filter((v): v is GeoJSONFeature => v !== null);
}

async function fetchCKAN(src: WardAssetSource): Promise<GeoJSONFeature[]> {
  const pkgRes = await fetch(src.url, {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: "application/json" },
  });
  if (!pkgRes.ok) throw new Error(`CKAN package ${pkgRes.status}`);
  const pkg = (await pkgRes.json()) as {
    success: boolean;
    result: { resources: Array<{ format: string; url: string; name: string }> };
  };
  if (!pkg.success) throw new Error("CKAN package request failed");

  const resources = pkg.result.resources;
  const gjResource =
    resources.find(
      (r) => r.format.toUpperCase() === "GEOJSON" && r.name.includes("4326") && !r.url.includes("datastore/dump"),
    ) ??
    resources.find(
      (r) => (r.format.toLowerCase().includes("geojson") || r.format.toLowerCase() === "geo json") && !r.url.includes("datastore/dump"),
    );

  if (!gjResource?.url) throw new Error("CKAN package has no GeoJSON resource");

  const dataRes = await fetch(gjResource.url, {
    signal: AbortSignal.timeout(25000),
    headers: { Accept: "application/json" },
  });
  if (!dataRes.ok) throw new Error(`CKAN GeoJSON download ${dataRes.status}`);
  const data = (await dataRes.json()) as { type?: string; features?: GeoJSONFeature[] };
  if (data?.type !== "FeatureCollection" || (data.features?.length ?? 0) < 5) {
    throw new Error("CKAN GeoJSON returned insufficient features");
  }
  return data.features ?? [];
}

// ─── WGS84 guard ─────────────────────────────────────────────────────────────

type GeoJSONFeature = {
  type: string;
  properties: Record<string, unknown> | null;
  geometry: unknown;
};

function validateWGS84(features: GeoJSONFeature[], sourceUrl: string): void {
  // Sample first feature coordinates — WGS84 lng must be -180..180, lat -90..90
  // Ontario bounds: lng -95..-74, lat 42..57
  const firstGeom = features[0]?.geometry as { coordinates?: unknown } | null;
  if (!firstGeom?.coordinates) return;

  function findFirstCoord(c: unknown): [number, number] | null {
    if (!Array.isArray(c)) return null;
    if (typeof c[0] === "number" && typeof c[1] === "number") return c as [number, number];
    for (const child of c) {
      const found = findFirstCoord(child);
      if (found) return found;
    }
    return null;
  }

  const coord = findFirstCoord(firstGeom.coordinates);
  if (!coord) return;
  const [lng, lat] = coord;

  // EPSG:3857 (Web Mercator) coordinates are in the millions
  if (Math.abs(lng) > 180 || Math.abs(lat) > 90) {
    throw new Error(
      `Source returned projected coordinates (lng=${lng}, lat=${lat}) not WGS84. ` +
      `Add outSR=4326 to the query. Source: ${sourceUrl}`,
    );
  }

  // Sanity check for Ontario bounds
  if (lng < -95 || lng > -74 || lat < 41 || lat > 57) {
    throw new Error(
      `Coordinates (lng=${lng}, lat=${lat}) are outside Ontario bounds. ` +
      `Source may be returning wrong dataset. Source: ${sourceUrl}`,
    );
  }
}

// ─── Ward name normalisation ──────────────────────────────────────────────────

function extractWardName(props: Record<string, unknown> | null, fallbackIndex: number): string {
  if (!props) return `Ward ${fallbackIndex + 1}`;
  const raw =
    (props["WARD_NAME"] as string) ||
    (props["WardName"] as string) ||
    (props["Ward_Name"] as string) ||
    (props["AREA_NAME"] as string) ||
    (props["NAME"] as string) ||
    (props["name"] as string) ||
    (props["WARD"] as string) ||
    (props["TEXT_"] as string);  // Pickering Open Data uses TEXT_ for ward name
  if (raw) {
    const s = String(raw).trim();
    return /^\d+$/.test(s) ? `Ward ${s}` : s;
  }
  const num =
    (props["WARD_NUM"] as number | string) ||
    (props["WardNumber"] as number | string) ||
    (props["Ward_Num"] as number | string) ||
    (props["AREA_SHORT_CODE"] as number | string);
  if (num != null) return `Ward ${num}`;
  return `Ward ${fallbackIndex + 1}`;
}

function extractWardNumber(wardName: string): number | null {
  const m = /\b(\d+)\b/.exec(wardName);
  return m ? parseInt(m[1], 10) : null;
}

// ─── Per-source dispatch ──────────────────────────────────────────────────────

async function fetchFromSource(src: WardAssetSource): Promise<GeoJSONFeature[]> {
  switch (src.type) {
    case "arcgis-rest":    return fetchArcGISRest(src);
    case "arcgis-geojson": return fetchArcGISGeoJSON(src);
    case "represent":      return fetchRepresent(src);
    case "ckan":           return fetchCKAN(src);
    default:               throw new Error(`Unknown source type: ${(src as WardAssetSource).type}`);
  }
}

// ─── DB upsert ────────────────────────────────────────────────────────────────

async function upsertWards(
  entry: WardAssetEntry,
  features: GeoJSONFeature[],
  sourceUrl: string,
  globalIndexOffset: number,
): Promise<number> {
  // Build all upsert operations then send in one transaction — one DB round trip
  // instead of N sequential awaits. Critical for seed performance (280+ wards total).
  const ops = features.map((f, i) => {
    const wardName = extractWardName(f.properties, i);
    const wardNumber = extractWardNumber(wardName);
    const wardIndex = globalIndexOffset + i;
    return prisma.wardBoundary.upsert({
      where: { municipality_wardName: { municipality: entry.municipality, wardName } },
      create: {
        municipality: entry.municipality,
        wardName,
        wardNumber,
        wardIndex,
        geojsonFeature: f as unknown as Prisma.InputJsonValue,
        sourceUrl,
      },
      update: {
        wardNumber,
        wardIndex,
        geojsonFeature: f as unknown as Prisma.InputJsonValue,
        sourceUrl,
        fetchedAt: new Date(),
      },
    });
  });
  await prisma.$transaction(ops);
  return ops.length;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Ingest a single municipality — tries sources in registry order, stops at first success.
 * globalIndexOffset ensures wardIndex values are unique across all municipalities.
 */
export async function ingestMunicipality(
  entry: WardAssetEntry,
  globalIndexOffset: number,
): Promise<IngestResult> {
  const errors: string[] = [];

  for (const src of entry.wardSources) {
    try {
      const features = await fetchFromSource(src);
      if (!features.length) {
        errors.push(`${src.type}:${src.url} — returned 0 features`);
        continue;
      }
      const count = await upsertWards(entry, features, src.url, globalIndexOffset);
      return { municipality: entry.municipality, count, sourceUrl: src.url, sourceType: src.type };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${src.type}: ${msg}`);
    }
  }

  return {
    municipality: entry.municipality,
    count: 0,
    sourceUrl: "",
    sourceType: "none",
    error: errors.join(" | "),
  };
}

/**
 * Ingest all municipalities in the registry.
 *
 * Strategy: ArcGIS/CKAN sources are parallel (no rate limit). Represent sources
 * are fully serial with a 3s gap — Represent silently returns empty results (not 429)
 * when overwhelmed, so batching is not safe. Serial guarantees every city gets a
 * clean window. 28 cities × ~6s = ~168s, well within the 300s seed timeout.
 *
 * wardIndex offset: registry position × 200 — no Ontario city has 200 wards,
 * so cross-municipality collisions are impossible.
 */
export async function ingestAllMunicipalities(): Promise<IngestResult[]> {
  const results: IngestResult[] = [];

  const representPrimary = (e: WardAssetEntry) => e.wardSources[0]?.type === "represent";
  const fastEntries = WARD_ASSET_REGISTRY.filter((e) => !representPrimary(e));
  const slowEntries = WARD_ASSET_REGISTRY.filter((e) => representPrimary(e));

  // ─── Fast pass: ArcGIS / CKAN — parallel, no rate limit ─────────────────
  const FAST_BATCH = 4;
  for (let i = 0; i < fastEntries.length; i += FAST_BATCH) {
    const batch = fastEntries.slice(i, i + FAST_BATCH);
    const batchResults = await Promise.allSettled(
      batch.map((entry) => {
        const idx = WARD_ASSET_REGISTRY.indexOf(entry);
        return ingestMunicipality(entry, idx * 200);
      }),
    );
    for (const r of batchResults) {
      results.push(
        r.status === "fulfilled"
          ? r.value
          : { municipality: "unknown", count: 0, sourceUrl: "", sourceType: "none", error: String(r.reason) },
      );
    }
  }

  // ─── Slow pass: Represent — fully serial, 3s gap between each ───────────
  // Represent throttles concurrent callers and returns empty objects (not 429) when overwhelmed.
  for (const entry of slowEntries) {
    await new Promise((r) => setTimeout(r, 3000));
    const idx = WARD_ASSET_REGISTRY.indexOf(entry);
    try {
      results.push(await ingestMunicipality(entry, idx * 200));
    } catch (err) {
      results.push({ municipality: entry.municipality, count: 0, sourceUrl: "", sourceType: "none", error: String(err) });
    }
  }

  return results;
}

/**
 * Ingest only municipalities with at least one verified source.
 * Used for lazy seeding — fast enough to run within a single Vercel request.
 * Uses the same stable wardIndex offsets as ingestAllMunicipalities so indices
 * are consistent regardless of which function populated the DB.
 */
export async function ingestVerifiedMunicipalities(): Promise<IngestResult[]> {
  const verified = WARD_ASSET_REGISTRY
    .map((entry, idx) => ({ entry, idx }))
    .filter(({ entry }) => entry.wardSources.some((s) => s.verified));

  const results: IngestResult[] = [];
  const BATCH = 3;
  for (let b = 0; b < verified.length; b += BATCH) {
    if (b > 0) await new Promise((r) => setTimeout(r, 1500));
    const batch = verified.slice(b, b + BATCH);
    const batchResults = await Promise.allSettled(
      batch.map(({ entry, idx }) => ingestMunicipality(entry, idx * 200)),
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.push(r.value);
      } else {
        results.push({ municipality: "unknown", count: 0, sourceUrl: "", sourceType: "none", error: String(r.reason) });
      }
    }
  }

  return results;
}
