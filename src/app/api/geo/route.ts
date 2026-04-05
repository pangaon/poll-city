import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

// ─────────────────────────────────────────────────────────────────────────────
// Canadian representatives lookup — sourced from OpenNorth Represent API.
// Two paths:
//   A. postalCode → /postcodes/[code]/ → representatives_centroid (single match)
//   B. address   → Nominatim geocode → /representatives/?point=lat,lon (exact)
//   C. lat,lng   → /representatives/?point=lat,lon directly
//
// Level is ALWAYS derived from elected_office, never from district or name.
// This fixes the Jonathan Tsao MP/MPP bug.
// ─────────────────────────────────────────────────────────────────────────────

const POSTAL_CODE_REGEX = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;
const REPRESENT_BASE = "https://represent.opennorth.ca";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

interface RepresentPerson {
  name?: string;
  first_name?: string;
  last_name?: string;
  elected_office?: string;
  district_name?: string;
  party_name?: string;
  photo_url?: string;
  email?: string;
  url?: string;
  representative_set_name?: string;
  offices?: { tel?: string; type?: string; postal?: string }[];
}

interface RepresentPostcodeResponse {
  representatives_centroid?: RepresentPerson[];
  representatives_concordance?: RepresentPerson[];
  city?: string;
  province?: string;
}

interface RepresentPointResponse {
  objects?: RepresentPerson[];
}

interface NormalizedRep {
  // UI-facing identity
  id: string;
  name: string;
  title: string;
  label: string;
  district: string;
  level: "federal" | "provincial" | "municipal";
  province: string | null;
  // Party
  party: string | null;
  partyName: string | null;
  // Media
  photoUrl: string | null;
  // Contact
  email: string | null;
  phone: string | null;
  website: string | null;
  sourceUrl: string | null;
  // Socials (from DB enrichment)
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedIn: string | null;
  // Claim / campaign linkage
  isClaimed: boolean;
  isActive: boolean;
  externalId: string | null;
  campaignSlug: string | null;
  officialId: string | null;
  labelColour: string;
}

function normalizeOffice(office: string | undefined): {
  title: string;
  label: string;
  level: "federal" | "provincial" | "municipal";
  labelColour: string;
} {
  const o = (office ?? "").toUpperCase().trim();
  if (o === "MP")
    return { title: "MP", label: "This is your MP", level: "federal", labelColour: "#1A4782" };
  if (o === "MPP")
    return { title: "MPP", label: "This is your MPP", level: "provincial", labelColour: "#1A4782" };
  if (o === "MLA")
    return { title: "MLA", label: "This is your MLA", level: "provincial", labelColour: "#1A4782" };
  if (o === "MNA")
    return { title: "MNA", label: "This is your MNA", level: "provincial", labelColour: "#1A4782" };
  if (o === "MHA")
    return { title: "MHA", label: "This is your MHA", level: "provincial", labelColour: "#1A4782" };
  if (o === "MAYOR")
    return { title: "Mayor", label: "This is your Mayor", level: "municipal", labelColour: "#374151" };
  if (o.includes("COUNCILLOR") || o.includes("ALDERMAN"))
    return {
      title: "Councillor",
      label: "This is your Councillor",
      level: "municipal",
      labelColour: "#374151",
    };
  if (o.includes("TRUSTEE"))
    return {
      title: "School Trustee",
      label: "This is your School Board Trustee",
      level: "municipal",
      labelColour: "#374151",
    };
  return {
    title: office ?? "Representative",
    label: `This is your ${office ?? "Representative"}`,
    level: "municipal",
    labelColour: "#374151",
  };
}

// Dedup key = name + elected_office (authoritative level).
// Same name can legitimately hold two offices across history; Represent only
// returns currently-seated reps so same name+office = same person.
function deduplicateReps(reps: RepresentPerson[]): RepresentPerson[] {
  const seen = new Set<string>();
  const out: RepresentPerson[] = [];
  for (const r of reps) {
    const name = (r.name ?? "").trim().toLowerCase();
    const office = (r.elected_office ?? "").trim().toLowerCase();
    if (!name || !office) continue;
    const key = `${name}|${office}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

type EnrichedOfficial = {
  id: string;
  province: string | null;
  partyName: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedIn: string | null;
  website: string | null;
  externalId: string | null;
  isClaimed: boolean;
  isActive: boolean;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
};

async function enrichWithDb(
  repName: string,
  level: "federal" | "provincial" | "municipal",
): Promise<EnrichedOfficial | null> {
  try {
    const official = await prisma.official.findFirst({
      where: {
        level: level as never,
        name: { equals: repName, mode: "insensitive" },
      },
      select: {
        id: true,
        province: true,
        partyName: true,
        twitter: true,
        facebook: true,
        instagram: true,
        linkedIn: true,
        website: true,
        externalId: true,
        isClaimed: true,
        isActive: true,
        photoUrl: true,
        email: true,
        phone: true,
      },
    });
    return official ?? null;
  } catch {
    return null;
  }
}

async function geocodeAddress(
  address: string,
): Promise<{ lat: string; lon: string } | null> {
  const params = new URLSearchParams({
    q: `${address} Canada`,
    format: "json",
    addressdetails: "1",
    limit: "1",
  });

  const res = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
    headers: {
      "User-Agent": "PollCity/1.0 (support@poll.city)",
      "Accept-Language": "en-CA,en;q=0.9",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ lat?: string; lon?: string }>;
  if (!rows[0]?.lat || !rows[0]?.lon) return null;
  return { lat: rows[0].lat, lon: rows[0].lon };
}

const ORDER_KEYS = ["MP", "MPP", "MLA", "MNA", "MHA", "MAYOR", "COUNCILLOR", "ALDERMAN", "TRUSTEE"];

function sortByOffice(reps: RepresentPerson[]): RepresentPerson[] {
  return [...reps].sort((a, b) => {
    const ao = (a.elected_office ?? "").toUpperCase();
    const bo = (b.elected_office ?? "").toUpperCase();
    const ai = ORDER_KEYS.findIndex((o) => ao.includes(o));
    const bi = ORDER_KEYS.findIndex((o) => bo.includes(o));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function firstPhone(rep: RepresentPerson): string | null {
  const offices = rep.offices ?? [];
  for (const o of offices) {
    if (o?.tel) return o.tel;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const postalCodeRaw = searchParams.get("postalCode");
  const address = searchParams.get("address");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  let inputType: "postalCode" | "address" | "coordinates";
  let rawReps: RepresentPerson[] = [];

  try {
    if (lat && lng) {
      inputType = "coordinates";
      const res = await fetch(
        `${REPRESENT_BASE}/representatives/?point=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&format=json`,
        { signal: AbortSignal.timeout(10_000), headers: { Accept: "application/json" } },
      );
      if (!res.ok) throw new Error(`Represent API ${res.status}`);
      const data = (await res.json()) as RepresentPointResponse;
      rawReps = data.objects ?? [];
    } else if (postalCodeRaw) {
      inputType = "postalCode";
      const cleaned = postalCodeRaw.replace(/\s/g, "").toUpperCase();
      if (!POSTAL_CODE_REGEX.test(cleaned)) {
        return NextResponse.json(
          { error: "Invalid postal code format. Use format: A1A 1A1" },
          { status: 400 },
        );
      }
      const res = await fetch(
        `${REPRESENT_BASE}/postcodes/${cleaned}/?format=json`,
        { signal: AbortSignal.timeout(10_000), headers: { Accept: "application/json" } },
      );
      if (!res.ok) throw new Error(`Represent API ${res.status}`);
      const data = (await res.json()) as RepresentPostcodeResponse;
      // ALWAYS use representatives_centroid — single best match for the postal centroid.
      rawReps = data.representatives_centroid ?? [];
    } else if (address) {
      inputType = "address";
      const geo = await geocodeAddress(address);
      if (!geo) {
        return NextResponse.json(
          { error: "Address not found. Try including the city name." },
          { status: 404 },
        );
      }
      const res = await fetch(
        `${REPRESENT_BASE}/representatives/?point=${geo.lat},${geo.lon}&format=json`,
        { signal: AbortSignal.timeout(10_000), headers: { Accept: "application/json" } },
      );
      if (!res.ok) throw new Error(`Represent API ${res.status}`);
      const data = (await res.json()) as RepresentPointResponse;
      rawReps = data.objects ?? [];
    } else {
      return NextResponse.json(
        { error: "Provide postalCode, address, or lat+lng parameters" },
        { status: 400 },
      );
    }

    const unique = deduplicateReps(rawReps);
    const sorted = sortByOffice(unique);
    const top = sorted.slice(0, 6);

    const representatives: NormalizedRep[] = await Promise.all(
      top.map(async (rep, idx) => {
        const n = normalizeOffice(rep.elected_office);
        const db = rep.name ? await enrichWithDb(rep.name, n.level) : null;
        const fallbackId = `rep-${n.level}-${idx}-${(rep.name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
        return {
          id: db?.id ?? fallbackId,
          name: rep.name ?? "",
          title: n.title,
          label: n.label,
          district: rep.district_name ?? "",
          level: n.level,
          province: db?.province ?? null,
          party: rep.party_name || null,
          partyName: db?.partyName ?? (rep.party_name || null),
          photoUrl: db?.photoUrl ?? rep.photo_url ?? null,
          email: db?.email ?? rep.email ?? null,
          phone: db?.phone ?? firstPhone(rep),
          website: db?.website ?? null,
          sourceUrl: rep.url || null,
          twitter: db?.twitter ?? null,
          facebook: db?.facebook ?? null,
          instagram: db?.instagram ?? null,
          linkedIn: db?.linkedIn ?? null,
          isClaimed: db?.isClaimed ?? false,
          isActive: db?.isActive ?? true,
          externalId: db?.externalId ?? null,
          campaignSlug: null,
          officialId: db?.id ?? null,
          labelColour: n.labelColour,
        };
      }),
    );

    return NextResponse.json({
      representatives,
      inputType,
      cached: false,
    });
  } catch (error) {
    console.error("[GEO] Lookup failed:", error);
    return NextResponse.json(
      {
        error:
          "Could not find representatives. Please try your full address including city.",
      },
      { status: 500 },
    );
  }
}
