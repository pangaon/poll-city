import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

const POSTAL_CODE_PREFIX_REGEX = /^[A-Z0-9]{3}$/;
const REPRESENT_BASE = "https://represent.opennorth.ca";

interface RepresentPostcode {
  code: string;
  representatives: Array<{
    name: string;
    elected_office: string;
    district_name: string;
    representative_set_name: string;
    related?: { boundary_url?: string };
  }>;
  boundaries_centroid?: Array<{
    name: string;
    set: string;
  }>;
}

async function lookupFromRepresent(prefix: string): Promise<{
  ward: string | null;
  wardCode: string | null;
  riding: string | null;
  ridingCode: string | null;
  province: string | null;
  city: string | null;
} | null> {
  try {
    const res = await fetch(`${REPRESENT_BASE}/postcodes/${prefix}1A1/`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data: RepresentPostcode = await res.json();

    let ward: string | null = null;
    let wardCode: string | null = null;
    let riding: string | null = null;
    let ridingCode: string | null = null;
    let city: string | null = null;

    for (const rep of data.representatives ?? []) {
      const setName = rep.representative_set_name ?? "";
      const lower = (setName + " " + rep.elected_office).toLowerCase();

      if (
        !ward &&
        (lower.includes("council") || lower.includes("mayor") || lower.includes("ward"))
      ) {
        ward = rep.district_name ?? null;
        city = setName.replace(/city council|council/gi, "").trim() || null;
        wardCode =
          rep.related?.boundary_url?.split("/").filter(Boolean).pop() ?? null;
      }

      if (
        !riding &&
        (lower.includes("mp ") || lower.includes("member of parliament") || lower.includes("federal"))
      ) {
        riding = rep.district_name ?? null;
        ridingCode =
          rep.related?.boundary_url?.split("/").filter(Boolean).pop() ?? null;
      }
    }

    // Provincial from boundaries_centroid
    for (const b of data.boundaries_centroid ?? []) {
      const setLower = (b.set ?? "").toLowerCase();
      if (!riding && (setLower.includes("provincial") || setLower.includes("legislature"))) {
        riding = b.name ?? null;
      }
    }

    return { ward, wardCode, riding, ridingCode, province: "ON", city };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const rateLimitResponse = rateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const postalCode = req.nextUrl.searchParams.get("postalCode");
  if (!postalCode) {
    return NextResponse.json({ error: "postalCode is required" }, { status: 400 });
  }

  const normalized = postalCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const prefix = normalized.slice(0, 3);

  if (!POSTAL_CODE_PREFIX_REGEX.test(prefix)) {
    return NextResponse.json({ error: "postalCode must contain a valid 3 character prefix" }, { status: 422 });
  }

  // 1) Check GeoDistrict cache first
  let districts = await prisma.geoDistrict.findMany({
    where: { postalPrefix: prefix },
  });

  // 2) If nothing in DB, try live lookup — fall back to "no data" gracefully if unreachable
  if (districts.length === 0) {
    const live = await lookupFromRepresent(prefix);
    if (live) {
      const province = live.province ?? "ON";

      const ops: Promise<unknown>[] = [];

      if (live.ward || live.city) {
        ops.push(
          prisma.geoDistrict
            .upsert({
              where: { postalPrefix_level: { postalPrefix: prefix, level: "municipal" } },
              create: {
                postalPrefix: prefix,
                ward: live.ward ?? undefined,
                wardCode: live.wardCode ?? undefined,
                city: live.city ?? undefined,
                province,
                level: "municipal",
              },
              update: {
                ward: live.ward ?? undefined,
                wardCode: live.wardCode ?? undefined,
                city: live.city ?? undefined,
              },
            })
            .catch(() => null)
        );
      }

      if (live.riding) {
        ops.push(
          prisma.geoDistrict
            .upsert({
              where: { postalPrefix_level: { postalPrefix: prefix, level: "federal" } },
              create: {
                postalPrefix: prefix,
                riding: live.riding ?? undefined,
                ridingCode: live.ridingCode ?? undefined,
                province,
                level: "federal",
              },
              update: {
                riding: live.riding ?? undefined,
                ridingCode: live.ridingCode ?? undefined,
              },
            })
            .catch(() => null)
        );
      }

      await Promise.all(ops);

      // Re-fetch from DB after cache write
      districts = await prisma.geoDistrict.findMany({ where: { postalPrefix: prefix } });
    }
    // If live lookup failed (API unreachable), districts remains empty — handled below
  }

  if (districts.length === 0) {
    return NextResponse.json({
      data: null,
      message: `No district data found for postal code ${prefix}. This postal code may not be in our database yet, or the boundary data lookup service may be temporarily unavailable.`,
    });
  }

  const municipal = districts.find((d) => d.level === "municipal");
  const federal = districts.find((d) => d.level === "federal");
  const provincial = districts.find((d) => d.level === "provincial");

  return NextResponse.json({
    data: {
      postalPrefix: prefix,
      ward: municipal?.ward ?? null,
      wardCode: municipal?.wardCode ?? null,
      riding: federal?.riding ?? municipal?.riding ?? null,
      ridingCode: federal?.ridingCode ?? null,
      province: municipal?.province ?? federal?.province ?? null,
      city: municipal?.city ?? federal?.city ?? null,
      levels: { municipal, federal, provincial },
    },
  });
}
