import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

/**
 * GET /api/geo?postalCode=M4C1A1
 * Returns ward + riding info for a postal code prefix
 */
export async function GET(req: NextRequest) {
  const postalCode = req.nextUrl.searchParams.get("postalCode");
  if (!postalCode) return NextResponse.json({ error: "postalCode required" }, { status: 400 });

  const prefix = postalCode.replace(/\s/g, "").slice(0, 3).toUpperCase();

  const districts = await prisma.geoDistrict.findMany({
    where: { postalPrefix: prefix },
  });

  if (districts.length === 0) {
    return NextResponse.json({ data: null, message: `No district data found for ${prefix}` });
  }

  const municipal = districts.find(d => d.level === "municipal");
  const federal = districts.find(d => d.level === "federal");
  const provincial = districts.find(d => d.level === "provincial");

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
