import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// FSA (first 3 chars of postal code) → province mapping
const FSA_PROVINCE: Record<string, string> = {
  A: "NL", B: "NS", C: "PE", E: "NB", G: "QC", H: "QC", J: "QC",
  K: "ON", L: "ON", M: "ON", N: "ON", P: "ON", R: "MB", S: "SK",
  T: "AB", V: "BC", X: "NT", X0: "NU", Y: "YT",
};

const PROVINCE_NAMES: Record<string, string> = {
  NL: "Newfoundland and Labrador", NS: "Nova Scotia", PE: "Prince Edward Island",
  NB: "New Brunswick", QC: "Quebec", ON: "Ontario", MB: "Manitoba",
  SK: "Saskatchewan", AB: "Alberta", BC: "British Columbia",
  NT: "Northwest Territories", NU: "Nunavut", YT: "Yukon",
};

const schema = z.object({
  postalCode: z.string().min(5).max(7),
});

// Simple in-process cache — avoid hitting OpenNorth repeatedly for same postal code
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid postal code format" }, { status: 422 });

  const raw = parsed.data.postalCode.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(raw)) {
    return NextResponse.json({ error: "Postal code must be in format A1A1A1 or A1A 1A1" }, { status: 422 });
  }

  const fsa = raw.slice(0, 3);

  // Check cache
  const cached = cache.get(fsa);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ data: cached.data });
  }

  // Determine province from FSA first character
  const firstChar = fsa[0];
  const province = FSA_PROVINCE[fsa.slice(0, 2)] ?? FSA_PROVINCE[firstChar] ?? null;
  const provinceName = province ? PROVINCE_NAMES[province] ?? province : null;

  // Try OpenNorth Represent API (free, no key)
  let ward: string | null = null;
  let municipality: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://represent.opennorth.ca/postcodes/${fsa}/`, {
      signal: controller.signal,
      headers: { "User-Agent": "PollCity/1.0 (pollcity.ca)" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json() as Record<string, unknown>;
      // Extract ward and municipality from boundaries_centroid or boundaries
      const boundaries = (data.boundaries_centroid as Array<{ name: string; related_boundary_sets?: string[] }>) ?? [];
      for (const b of boundaries) {
        const name = b.name ?? "";
        if (!ward && /ward|district/i.test(name)) ward = name;
        if (!municipality && /city|town|municipality|county/i.test(name)) municipality = name;
      }
    }
  } catch {
    // OpenNorth unavailable — use FSA-level data only
  }

  const result = { fsa, province, provinceName, ward, municipality, formattedPostal: `${raw.slice(0,3)} ${raw.slice(3)}` };
  cache.set(fsa, { data: result, ts: Date.now() });

  return NextResponse.json({ data: result });
}
