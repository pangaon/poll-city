import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

const POSTAL_CODE_REGEX = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;
const POSTAL_CODE_PREFIX_REGEX = /^[A-Z]\d[A-Z]$/;
const REPRESENT_BASE = "https://represent.opennorth.ca";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

interface RepresentPerson {
  name?: string;
  district_name?: string;
  elected_office?: string;
  representative_set_name?: string;
  related?: { boundary_url?: string };
}

interface RepresentResponse {
  representatives?: RepresentPerson[];
  objects?: RepresentPerson[];
  code?: string;
}

interface GeoMatchResult {
  federalRiding: string | null;
  provincialRiding: string | null;
  municipalWard: string | null;
  municipality: string | null;
  province: string | null;
}

type OfficialPayload = {
  id: string;
  name: string;
  title: string;
  level: string;
  district: string;
  province: string | null;
  isClaimed: boolean;
  isActive: boolean;
  partyName: string | null;
  party: string | null;
  photoUrl: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedIn: string | null;
  website: string | null;
  externalId: string | null;
  email: string | null;
  phone: string | null;
};

const OFFICIAL_SELECT = {
  id: true,
  name: true,
  title: true,
  level: true,
  district: true,
  province: true,
  isClaimed: true,
  isActive: true,
  partyName: true,
  party: true,
  photoUrl: true,
  twitter: true,
  facebook: true,
  instagram: true,
  linkedIn: true,
  website: true,
  externalId: true,
  email: true,
  phone: true,
} as const;

function normalizeWhitespace(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizePostalCode(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function scoreOfficial(official: OfficialPayload): number {
  return [official.photoUrl, official.email, official.website, official.twitter, official.facebook, official.instagram]
    .reduce((sum, current, idx) => sum + (current ? 2 ** (6 - idx) : 0), 0);
}

function pickBestOfficial(rows: OfficialPayload[]): OfficialPayload | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const scoreDiff = scoreOfficial(b) - scoreOfficial(a);
    if (scoreDiff !== 0) return scoreDiff;
    const activeDiff = Number(b.isActive) - Number(a.isActive);
    if (activeDiff !== 0) return activeDiff;
    const claimedDiff = Number(b.isClaimed) - Number(a.isClaimed);
    if (claimedDiff !== 0) return claimedDiff;
    return a.name.localeCompare(b.name);
  })[0];
}

function detectDistricts(rows: RepresentPerson[]): GeoMatchResult {
  let federalRiding: string | null = null;
  let provincialRiding: string | null = null;
  let municipalWard: string | null = null;
  let municipality: string | null = null;
  let province: string | null = null;

  for (const rep of rows) {
    const title = normalizeWhitespace(rep.elected_office).toLowerCase();
    const setName = normalizeWhitespace(rep.representative_set_name).toLowerCase();
    const district = normalizeWhitespace(rep.district_name) || null;

    if (!federalRiding && (title.includes("mp") || title.includes("member of parliament") || setName.includes("house of commons"))) {
      federalRiding = district;
    }

    if (
      !provincialRiding &&
      (title.includes("mpp") || title.includes("mla") || title.includes("mna") || title.includes("mha") || setName.includes("legislative"))
    ) {
      provincialRiding = district;
    }

    if (!municipalWard && (title.includes("councillor") || title.includes("ward") || setName.includes("council"))) {
      municipalWard = district;
    }

    if (!municipality && (title.includes("mayor") || setName.includes("city council") || setName.includes("municipal"))) {
      municipality = normalizeWhitespace(rep.representative_set_name)
        .replace(/city council/gi, "")
        .replace(/council/gi, "")
        .trim() || null;
    }

    if (!province) {
      const provinceMatch = normalizeWhitespace(rep.representative_set_name).match(/\b(AB|BC|MB|NB|NL|NT|NS|NU|ON|PE|QC|SK|YT)\b/i);
      if (provinceMatch?.[1]) {
        province = provinceMatch[1].toUpperCase();
      }
    }
  }

  return { federalRiding, provincialRiding, municipalWard, municipality, province };
}

async function geocodeAddress(address: string): Promise<{ lat: string; lon: string } | null> {
  const params = new URLSearchParams({
    q: `${address} Canada`,
    format: "json",
    limit: "1",
  });

  const res = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
    headers: {
      "User-Agent": "Poll City civic lookup (support@pollcity.ca)",
      "Accept-Language": "en-CA,en;q=0.9",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ lat?: string; lon?: string }>;
  if (!rows[0]?.lat || !rows[0]?.lon) return null;
  return { lat: rows[0].lat, lon: rows[0].lon };
}

async function fetchRepresentByPostalCode(formattedPostalCode: string): Promise<RepresentPerson[]> {
  const res = await fetch(`${REPRESENT_BASE}/postcodes/${formattedPostalCode}/?format=json`, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Represent postcode lookup failed: ${res.status}`);
  }

  const data = (await res.json()) as RepresentResponse;
  return data.representatives ?? data.objects ?? [];
}

async function fetchRepresentByPoint(lat: string, lon: string): Promise<RepresentPerson[]> {
  const point = `${lat},${lon}`;
  const params = new URLSearchParams({ point, format: "json" });
  const res = await fetch(`${REPRESENT_BASE}/representatives/?${params.toString()}`, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Represent point lookup failed: ${res.status}`);
  }

  const data = (await res.json()) as RepresentResponse;
  return data.objects ?? data.representatives ?? [];
}

async function cacheGeoDistrict(prefix: string, geo: GeoMatchResult): Promise<void> {
  const province = geo.province ?? "ON";

  await Promise.all([
    geo.federalRiding
      ? prisma.geoDistrict.upsert({
          where: { postalPrefix_level: { postalPrefix: prefix, level: "federal" } },
          create: {
            postalPrefix: prefix,
            level: "federal",
            riding: geo.federalRiding,
            province,
            city: geo.municipality ?? undefined,
          },
          update: {
            riding: geo.federalRiding,
            province,
            city: geo.municipality ?? undefined,
          },
        })
      : Promise.resolve(),
    geo.provincialRiding
      ? prisma.geoDistrict.upsert({
          where: { postalPrefix_level: { postalPrefix: prefix, level: "provincial" } },
          create: {
            postalPrefix: prefix,
            level: "provincial",
            riding: geo.provincialRiding,
            province,
            city: geo.municipality ?? undefined,
          },
          update: {
            riding: geo.provincialRiding,
            province,
            city: geo.municipality ?? undefined,
          },
        })
      : Promise.resolve(),
    geo.municipalWard || geo.municipality
      ? prisma.geoDistrict.upsert({
          where: { postalPrefix_level: { postalPrefix: prefix, level: "municipal" } },
          create: {
            postalPrefix: prefix,
            level: "municipal",
            ward: geo.municipalWard ?? undefined,
            city: geo.municipality ?? undefined,
            province,
          },
          update: {
            ward: geo.municipalWard ?? undefined,
            city: geo.municipality ?? undefined,
            province,
          },
        })
      : Promise.resolve(),
  ]);
}

async function getRepresentatives(geo: GeoMatchResult): Promise<OfficialPayload[]> {
  const [federalRows, provincialRows, mayorRows, wardRows] = await Promise.all([
    geo.federalRiding
      ? prisma.official.findMany({
          where: {
            level: "federal",
            district: { contains: geo.federalRiding, mode: "insensitive" },
          },
          select: OFFICIAL_SELECT,
          take: 10,
        })
      : Promise.resolve([]),
    geo.provincialRiding
      ? prisma.official.findMany({
          where: {
            level: "provincial",
            district: { contains: geo.provincialRiding, mode: "insensitive" },
          },
          select: OFFICIAL_SELECT,
          take: 10,
        })
      : Promise.resolve([]),
    prisma.official.findMany({
      where: {
        level: "municipal",
        title: { contains: "mayor", mode: "insensitive" },
        ...(geo.municipality ? { district: { contains: geo.municipality, mode: "insensitive" } } : {}),
      },
      select: OFFICIAL_SELECT,
      take: 10,
    }),
    geo.municipalWard
      ? prisma.official.findMany({
          where: {
            level: "municipal",
            title: { contains: "councillor", mode: "insensitive" },
            district: { contains: geo.municipalWard, mode: "insensitive" },
          },
          select: OFFICIAL_SELECT,
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  const picked = [
    pickBestOfficial(federalRows.map((row) => ({ ...row, level: String(row.level) }))),
    pickBestOfficial(provincialRows.map((row) => ({ ...row, level: String(row.level) }))),
    pickBestOfficial(mayorRows.map((row) => ({ ...row, level: String(row.level) }))),
    pickBestOfficial(wardRows.map((row) => ({ ...row, level: String(row.level) }))),
  ].filter((row): row is OfficialPayload => Boolean(row));

  const seen = new Set<string>();
  return picked.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const postalCode = req.nextUrl.searchParams.get("postalCode")?.trim() ?? "";
  const address = req.nextUrl.searchParams.get("address")?.trim() ?? "";

  if (!postalCode && !address) {
    return NextResponse.json({
      federalRiding: null,
      provincialRiding: null,
      municipalWard: null,
      municipality: null,
      province: null,
      representatives: [],
      message: "Provide either postalCode or address to find your representatives.",
    }, { status: 400 });
  }

  try {
    let geo: GeoMatchResult = {
      federalRiding: null,
      provincialRiding: null,
      municipalWard: null,
      municipality: null,
      province: null,
    };

    if (postalCode) {
      const normalized = normalizePostalCode(postalCode);
      if (!POSTAL_CODE_REGEX.test(normalized)) {
        return NextResponse.json({
          federalRiding: null,
          provincialRiding: null,
          municipalWard: null,
          municipality: null,
          province: null,
          representatives: [],
          message: "Postal code must follow the Canadian format A1A1A1.",
        }, { status: 422 });
      }

      const prefix = normalized.slice(0, 3);
      if (!POSTAL_CODE_PREFIX_REGEX.test(prefix)) {
        return NextResponse.json({
          federalRiding: null,
          provincialRiding: null,
          municipalWard: null,
          municipality: null,
          province: null,
          representatives: [],
          message: "Postal code prefix must be in the form A1A.",
        }, { status: 422 });
      }

      const cached = await prisma.geoDistrict.findMany({ where: { postalPrefix: prefix } });
      const cachedMunicipal = cached.find((row) => row.level === "municipal");
      const cachedFederal = cached.find((row) => row.level === "federal");
      const cachedProvincial = cached.find((row) => row.level === "provincial");

      geo = {
        federalRiding: cachedFederal?.riding ?? null,
        provincialRiding: cachedProvincial?.riding ?? null,
        municipalWard: cachedMunicipal?.ward ?? null,
        municipality: cachedMunicipal?.city ?? cachedFederal?.city ?? cachedProvincial?.city ?? null,
        province: cachedMunicipal?.province ?? cachedFederal?.province ?? cachedProvincial?.province ?? null,
      };

      if (!geo.federalRiding && !geo.provincialRiding && !geo.municipalWard) {
        const reps = await fetchRepresentByPostalCode(normalized);
        geo = detectDistricts(reps);
        await cacheGeoDistrict(prefix, geo);
      }
    } else {
      const geocoded = await geocodeAddress(address);
      if (!geocoded) {
        return NextResponse.json({
          federalRiding: null,
          provincialRiding: null,
          municipalWard: null,
          municipality: null,
          province: null,
          representatives: [],
          message: "Could not geocode that address. Please try a postal code like M4C 1B2.",
        });
      }

      const reps = await fetchRepresentByPoint(geocoded.lat, geocoded.lon);
      geo = detectDistricts(reps);
    }

    const representatives = await getRepresentatives(geo);

    return NextResponse.json({
      federalRiding: geo.federalRiding,
      provincialRiding: geo.provincialRiding,
      municipalWard: geo.municipalWard,
      municipality: geo.municipality,
      province: geo.province,
      representatives,
      message:
        representatives.length === 0
          ? "No local official records matched this location yet. Try another nearby postal code."
          : null,
    });
  } catch {
    return NextResponse.json({
      federalRiding: null,
      provincialRiding: null,
      municipalWard: null,
      municipality: null,
      province: null,
      representatives: [],
      message: "Represent API is temporarily unavailable. Please try again shortly.",
    });
  }
}
