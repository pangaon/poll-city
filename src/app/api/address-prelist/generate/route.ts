import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { booleanPointInPolygon, point } from "@turf/turf";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import { Prisma } from "@prisma/client";
import type { AddrRecord, GeneratePrelistRequest } from "@/lib/types/address";

// Cache TTLs in days
const TTL: Record<string, number> = { osm: 30, mpac: 90, statcan: 365 };

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as GeneratePrelistRequest;
  const { municipality, source, postalFrom, postalTo } = body;

  if (!municipality || !source || !["osm", "mpac", "statcan"].includes(source)) {
    return NextResponse.json({ error: "municipality and source required" }, { status: 400 });
  }

  // Check cache first
  const now = new Date();
  const cached = await prisma.municipalityAddressCache.findUnique({
    where: { municipality_source: { municipality, source } },
  });

  if (cached && cached.expiresAt > now) {
    return NextResponse.json({
      records: cached.addressJson as unknown as AddrRecord[],
      count: cached.recordCount,
      source,
      cached: true,
    });
  }

  let records: AddrRecord[] = [];

  if (source === "osm") {
    records = await fetchOsm(municipality);
  } else if (source === "mpac") {
    records = await fetchMpac(municipality, postalFrom, postalTo);
  } else {
    records = await fetchStatcan(municipality);
  }

  // Attach DA demographics via spatial join (turf, no PostGIS required)
  records = await attachDemographics(records, municipality);

  const expiresAt = new Date(now.getTime() + TTL[source] * 24 * 60 * 60 * 1000);
  const bbox = source === "osm" ? computeBbox(records) : null;

  const jsonRecords = records as unknown as Prisma.InputJsonValue;
  const jsonBbox = bbox as Prisma.InputJsonValue | null;

  await prisma.municipalityAddressCache.upsert({
    where: { municipality_source: { municipality, source } },
    create: {
      municipality,
      source,
      addressJson: jsonRecords,
      recordCount: records.length,
      bbox: jsonBbox ?? Prisma.JsonNull,
      expiresAt,
    },
    update: {
      addressJson: jsonRecords,
      recordCount: records.length,
      bbox: jsonBbox ?? Prisma.JsonNull,
      expiresAt,
    },
  });

  return NextResponse.json({ records, count: records.length, source, cached: false });
}

// ─── OSM / Overpass ────────────────────────────────────────────────────────────

async function fetchOsm(municipality: string): Promise<AddrRecord[]> {
  // 1. Geocode municipality to bounding box via Nominatim
  const geoRes = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(municipality + ", Ontario, Canada")}&format=json&limit=1`,
    { headers: { "User-Agent": "PollCity/1.0 (contact@poll.city)" } }
  );
  const geoData = (await geoRes.json()) as Array<{ boundingbox: string[] }>;
  if (!geoData.length) return [];

  const [south, north, west, east] = geoData[0].boundingbox.map(Number);

  // 2. Query Overpass for address nodes/ways inside the bbox
  const overpassQuery = `[out:json][timeout:60];(node["addr:housenumber"](${south},${west},${north},${east});way["addr:housenumber"](${south},${west},${north},${east}););out center 1000;`;

  const ovRes = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(overpassQuery)}`,
  });
  const ovData = (await ovRes.json()) as {
    elements: Array<{
      id: number;
      type: string;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  };

  const records: AddrRecord[] = [];
  let idx = 0;

  for (const el of ovData.elements ?? []) {
    const tags = el.tags ?? {};
    const civicRaw = tags["addr:housenumber"];
    const street = tags["addr:street"] ?? "";
    if (!civicRaw || !street) continue;

    const civic = parseInt(civicRaw, 10);
    if (isNaN(civic)) continue;

    const lat = el.lat ?? el.center?.lat ?? 0;
    const lng = el.lon ?? el.center?.lon ?? 0;
    const postalCode = tags["addr:postcode"] ?? "";

    records.push({
      id: `osm-${el.id}`,
      civic,
      street,
      unit: tags["addr:unit"],
      postalCode,
      pollDiv: postalCode ? `PD-${postalCode.slice(0, 3).toUpperCase()}` : "PD-UNK",
      daCode: "",
      lat,
      lng,
      households: 1,
      daMedianIncome: 0,
      daMedianAge: 0,
      daLangPrimary: "en",
    });
    idx++;
  }

  return records;
}

// ─── MPAC ──────────────────────────────────────────────────────────────────────

async function fetchMpac(
  municipality: string,
  postalFrom?: string,
  postalTo?: string
): Promise<AddrRecord[]> {
  const where: Record<string, unknown> = {
    municipality: { contains: municipality, mode: "insensitive" as const },
  };

  if (postalFrom && postalTo) {
    where.postalCode = { gte: postalFrom.toUpperCase(), lte: postalTo.toUpperCase() };
  } else if (postalFrom) {
    where.postalCode = { gte: postalFrom.toUpperCase() };
  }

  const rows = await prisma.mpacAddress.findMany({ where, take: 5000 });

  return rows.map((r) => ({
    id: `mpac-${r.id}`,
    civic: r.civic,
    street: r.street,
    postalCode: r.postalCode,
    pollDiv: r.postalCode ? `PD-${r.postalCode.slice(0, 3).toUpperCase()}` : "PD-UNK",
    daCode: "",
    lat: r.lat,
    lng: r.lng,
    households: 1,
    daMedianIncome: 0,
    daMedianAge: 0,
    daLangPrimary: "en",
  }));
}

// ─── StatsCan DA centroids ─────────────────────────────────────────────────────

async function fetchStatcan(municipality: string): Promise<AddrRecord[]> {
  const das = await prisma.disseminationArea.findMany({
    where: { municipality: { contains: municipality, mode: "insensitive" } },
  });

  if (!das.length) return [];

  const records: AddrRecord[] = [];

  for (const da of das) {
    const boundary = da.boundaryGeoJson as Feature<Polygon | MultiPolygon> | null;
    if (!boundary) continue;

    // Use centroid of bounding box as approximate address anchor
    const coords = extractCoords(boundary);
    if (!coords) continue;

    records.push({
      id: `da-${da.daCode}`,
      civic: 1,
      street: `${municipality} DA ${da.daCode}`,
      postalCode: "",
      pollDiv: `PD-DA-${da.daCode.slice(-3)}`,
      daCode: da.daCode,
      lat: coords.lat,
      lng: coords.lng,
      households: Math.round(da.population / 2.5),
      daMedianIncome: da.medianIncome,
      daMedianAge: da.medianAge,
      daLangPrimary: da.englishPct >= da.frenchPct ? "en" : "fr",
    });
  }

  return records;
}

// ─── Demographic attachment ────────────────────────────────────────────────────

async function attachDemographics(
  records: AddrRecord[],
  municipality: string
): Promise<AddrRecord[]> {
  const das = await prisma.disseminationArea.findMany({
    where: {
      municipality: { contains: municipality, mode: "insensitive" },
      boundaryGeoJson: { not: Prisma.JsonNull },
    },
  });

  if (!das.length) return records;

  return records.map((r) => {
    if (r.daCode || r.lat === 0) return r;

    const pt = point([r.lng, r.lat]);
    for (const da of das) {
      const boundary = da.boundaryGeoJson as Feature<Polygon | MultiPolygon> | null;
      if (!boundary) continue;
      try {
        if (booleanPointInPolygon(pt, boundary)) {
          return {
            ...r,
            daCode: da.daCode,
            daMedianIncome: da.medianIncome,
            daMedianAge: da.medianAge,
            daLangPrimary: da.englishPct >= da.frenchPct ? "en" : "fr",
          };
        }
      } catch {
        // malformed geometry — skip
      }
    }
    return r;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeBbox(records: AddrRecord[]) {
  if (!records.length) return null;
  const lats = records.map((r) => r.lat).filter(Boolean);
  const lngs = records.map((r) => r.lng).filter(Boolean);
  return {
    south: Math.min(...lats),
    north: Math.max(...lats),
    west: Math.min(...lngs),
    east: Math.max(...lngs),
  };
}

function extractCoords(feature: Feature<Polygon | MultiPolygon>) {
  try {
    const geom = feature.geometry ?? feature;
    let ring: number[][];
    if ("type" in geom && geom.type === "Polygon") {
      ring = (geom as Polygon).coordinates[0];
    } else if ("type" in geom && geom.type === "MultiPolygon") {
      ring = (geom as MultiPolygon).coordinates[0][0];
    } else {
      return null;
    }
    const avgLng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
    const avgLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    return { lat: avgLat, lng: avgLng };
  } catch {
    return null;
  }
}
