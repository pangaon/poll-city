import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const slug = sp.get("slug");

  if (!campaignId && !slug) {
    return NextResponse.json({ error: "campaignId or slug is required" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: campaignId ? { id: campaignId } : { slug: slug! },
    select: { id: true, slug: true, jurisdiction: true, electionType: true },
  });

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const sampleContact = await prisma.contact.findFirst({
    where: { campaignId: campaign.id },
    select: { ward: true, riding: true, city: true, province: true },
    orderBy: { createdAt: "desc" },
  });

  const lookupNames = [
    campaign.jurisdiction,
    sampleContact?.ward,
    sampleContact?.riding,
    sampleContact?.city,
  ].filter((v): v is string => Boolean(v && v.trim()));

  let district = null as Awaited<ReturnType<typeof prisma.geoDistrict.findFirst>>;
  for (const name of lookupNames) {
    district = await prisma.geoDistrict.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        geoJson: { not: Prisma.JsonNull },
      },
      orderBy: { createdAt: "desc" },
    });
    if (district) break;

    district = await prisma.geoDistrict.findFirst({
      where: {
        OR: [
          { ward: { equals: name, mode: "insensitive" } },
          { riding: { equals: name, mode: "insensitive" } },
        ],
        geoJson: { not: Prisma.JsonNull },
      },
      orderBy: { createdAt: "desc" },
    });
    if (district) break;
  }

  if (!district) {
    return NextResponse.json({
      type: "FeatureCollection",
      features: [],
      campaignSlug: campaign.slug,
    });
  }

  return NextResponse.json({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          id: district.id,
          name: district.name ?? district.ward ?? district.riding ?? campaign.jurisdiction,
          districtType: district.districtType,
          level: district.level,
        },
        geometry: district.geoJson,
      },
    ],
    centroid: district.centroid,
    campaignSlug: campaign.slug,
  });
}
