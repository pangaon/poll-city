import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import type { FeatureCollection, Feature, Point } from "geojson";

const StationSchema = z.object({
  stationNumber: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  wardName: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  electorCount: z.number().int().positive().optional(),
  isAccessible: z.boolean().default(true),
  notes: z.string().optional(),
  electionYear: z.string().default("2026"),
});

const IngestSchema = z.object({
  stations: z.array(StationSchema).min(1).max(500),
  replace: z.boolean().default(false), // replace existing for this ward/year
  wardName: z.string().optional(),
});

// GET — returns polling stations as GeoJSON for the map overlay
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error || !session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignId = session.user.activeCampaignId;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const wardName = searchParams.get("wardName") ?? undefined;
  const electionYear = searchParams.get("year") ?? "2026";

  const stations = await prisma.pollingStation.findMany({
    where: {
      campaignId,
      deletedAt: null,
      electionYear,
      ...(wardName ? { wardName: { contains: wardName, mode: "insensitive" } } : {}),
    },
    orderBy: { stationNumber: "asc" },
  });

  const features: Feature<Point>[] = stations
    .filter(s => s.lat != null && s.lng != null)
    .map(s => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [s.lng!, s.lat!],
      },
      properties: {
        id: s.id,
        stationNumber: s.stationNumber,
        name: s.name,
        address: s.address,
        city: s.city ?? "",
        wardName: s.wardName ?? "",
        electorCount: s.electorCount ?? 0,
        isAccessible: s.isAccessible,
        notes: s.notes ?? "",
        electionYear: s.electionYear,
      },
    }));

  const allStations = stations.map(s => ({
    id: s.id,
    stationNumber: s.stationNumber,
    name: s.name,
    address: s.address,
    city: s.city,
    wardName: s.wardName,
    lat: s.lat,
    lng: s.lng,
    electorCount: s.electorCount,
    isAccessible: s.isAccessible,
    electionYear: s.electionYear,
    hasPinDrop: s.lat != null && s.lng != null,
  }));

  const fc: FeatureCollection<Point> = { type: "FeatureCollection", features };

  return NextResponse.json({
    ...fc,
    allStations, // includes stations without coordinates (for the management table)
    stats: {
      total: stations.length,
      withCoordinates: features.length,
      withoutCoordinates: stations.length - features.length,
      accessible: stations.filter(s => s.isAccessible).length,
    },
  });
}

// POST — bulk ingest polling stations
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error || !session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignId = session.user.activeCampaignId;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = IngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const { stations, replace, wardName } = parsed.data;

  if (replace) {
    await prisma.pollingStation.updateMany({
      where: {
        campaignId,
        ...(wardName ? { wardName: { contains: wardName, mode: "insensitive" } } : {}),
      },
      data: { deletedAt: new Date() },
    });
  }

  const created = await prisma.$transaction(
    stations.map(s =>
      prisma.pollingStation.create({
        data: {
          campaignId,
          stationNumber: s.stationNumber,
          name: s.name,
          address: s.address,
          city: s.city,
          postalCode: s.postalCode,
          wardName: s.wardName,
          lat: s.lat,
          lng: s.lng,
          electorCount: s.electorCount,
          isAccessible: s.isAccessible,
          notes: s.notes,
          electionYear: s.electionYear,
        },
      })
    )
  );

  return NextResponse.json({ created: created.length, message: `${created.length} polling stations ingested` });
}

// DELETE — soft-delete all polling stations for ward/year
export async function DELETE(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error || !session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaignId = session.user.activeCampaignId;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const wardName = searchParams.get("wardName") ?? undefined;
  const electionYear = searchParams.get("year") ?? "2026";

  const { count } = await prisma.pollingStation.updateMany({
    where: {
      campaignId,
      electionYear,
      deletedAt: null,
      ...(wardName ? { wardName: { contains: wardName, mode: "insensitive" } } : {}),
    },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ deleted: count });
}
