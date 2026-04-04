import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

const POSTAL_CODE_PREFIX_REGEX = /^[A-Z0-9]{3}$/;

export async function GET(req: NextRequest) {
  const postalCode = req.nextUrl.searchParams.get("postalCode");
  if (!postalCode) {
    return NextResponse.json({ error: "postalCode is required" }, { status: 400 });
  }

  const normalized = postalCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const prefix = normalized.slice(0, 3);

  if (!POSTAL_CODE_PREFIX_REGEX.test(prefix)) {
    return NextResponse.json({ error: "postalCode must contain a valid 3 character prefix" }, { status: 422 });
  }

  const districts = await prisma.geoDistrict.findMany({
    where: { postalPrefix: prefix },
  });

  if (districts.length === 0) {
    return NextResponse.json({ data: null, message: `No district data found for ${prefix}` });
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
