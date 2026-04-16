import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { booleanPointInPolygon, point } from "@turf/turf";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const ward = sp.get("ward");
  const pollNumber = sp.get("pollNumber");
  const streets = sp.getAll("streets");
  const oddEven = sp.get("oddEven") ?? "all";
  const boundaryParam = sp.get("boundary");

  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // ── Boundary mode: polygon drawn on map ────────────────────────────────────
  if (boundaryParam) {
    let polygon: GeoJSON.Feature<GeoJSON.Polygon> | null = null;
    try {
      const parsed = JSON.parse(decodeURIComponent(boundaryParam)) as unknown;
      // Accept either a GeoJSON Feature<Polygon> or a raw Polygon geometry
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "type" in parsed
      ) {
        const geo = parsed as { type: string; geometry?: unknown; coordinates?: unknown };
        if (geo.type === "Feature" && geo.geometry && typeof geo.geometry === "object") {
          const g = geo.geometry as { type: string; coordinates: unknown };
          if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
            polygon = parsed as GeoJSON.Feature<GeoJSON.Polygon>;
          }
        } else if (geo.type === "Polygon" && Array.isArray(geo.coordinates)) {
          polygon = {
            type: "Feature",
            geometry: parsed as GeoJSON.Polygon,
            properties: {},
          };
        }
      }
    } catch {
      return NextResponse.json({ error: "Invalid boundary parameter" }, { status: 400 });
    }

    if (!polygon) {
      return NextResponse.json({ error: "boundary must be a GeoJSON Polygon or Feature<Polygon>" }, { status: 400 });
    }

    // Fetch all contacts in this campaign that have household lat/lng
    const allContacts = await prisma.contact.findMany({
      where: {
        campaignId,
        deletedAt: null,
        isDeceased: false,
        doNotContact: false,
        skipHouse: false,
        household: {
          lat: { not: null },
          lng: { not: null },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        address1: true,
        streetNumber: true,
        streetName: true,
        city: true,
        ward: true,
        municipalPoll: true,
        supportLevel: true,
        householdId: true,
        household: { select: { lat: true, lng: true } },
      },
      take: 2000,
    });

    const inBoundary = allContacts.filter((c) => {
      if (!c.household?.lat || !c.household?.lng) return false;
      const pt = point([c.household.lng, c.household.lat]);
      return booleanPointInPolygon(pt, polygon!);
    });

    return NextResponse.json({
      contacts: inBoundary,
      total: inBoundary.length,
      wards: [],
      polls: [],
      streets: [],
    });
  }

  // ── Standard ward/poll filter mode ────────────────────────────────────────
  const where: Record<string, unknown> = {
    campaignId,
    deletedAt: null,
    isDeceased: false,
    doNotContact: false,
    skipHouse: false,
  };

  if (ward) where.ward = ward;
  if (pollNumber) where.municipalPoll = pollNumber;
  if (streets.length) where.streetName = { in: streets };

  const contacts = await prisma.contact.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      address1: true,
      streetNumber: true,
      streetName: true,
      city: true,
      ward: true,
      municipalPoll: true,
      supportLevel: true,
      householdId: true,
      household: { select: { lat: true, lng: true } },
    },
    orderBy: [{ streetName: "asc" }, { streetNumber: "asc" }],
    take: 500,
  });

  // Apply odd/even filter
  const filtered = contacts.filter((c) => {
    if (oddEven === "all") return true;
    const num = parseInt(c.streetNumber ?? "");
    if (isNaN(num)) return true;
    return oddEven === "odd" ? num % 2 !== 0 : num % 2 === 0;
  });

  // Get distinct wards and poll numbers for dropdowns
  const [distinctWards, distinctPolls, distinctStreets] = await Promise.all([
    prisma.contact.findMany({
      where: { campaignId: campaignId!, deletedAt: null, ward: { not: null } },
      select: { ward: true },
      distinct: ["ward"],
      orderBy: { ward: "asc" },
    }),
    prisma.contact.findMany({
      where: { campaignId: campaignId!, deletedAt: null, municipalPoll: { not: null } },
      select: { municipalPoll: true },
      distinct: ["municipalPoll"],
      orderBy: { municipalPoll: "asc" },
    }),
    prisma.contact.findMany({
      where: { campaignId: campaignId!, deletedAt: null, streetName: { not: null } },
      select: { streetName: true },
      distinct: ["streetName"],
      orderBy: { streetName: "asc" },
    }),
  ]);

  return NextResponse.json({
    contacts: filtered,
    total: filtered.length,
    wards: distinctWards.map((w) => w.ward).filter(Boolean),
    polls: distinctPolls.map((p) => p.municipalPoll).filter(Boolean),
    streets: distinctStreets.map((s) => s.streetName).filter(Boolean),
  });
}
