import prisma from "@/lib/db/prisma";
import type { ContactGeoPoint } from "@/lib/maps/geo";
import { buildContactGeoPoint, pointInBbox } from "@/lib/maps/geo";

export async function fetchContactGeoPoints(params: {
  campaignId: string;
  bbox: [number, number, number, number] | null;
  take: number;
  cursor?: string;
}) {
  const rows = await prisma.contact.findMany({
    where: {
      campaignId: params.campaignId,
      household: {
        isNot: null,
      },
    },
    take: Math.min(10000, Math.max(1, params.take)) + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    orderBy: [{ id: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      address1: true,
      supportLevel: true,
      voted: true,
      gotvStatus: true,
      signRequested: true,
      volunteerInterest: true,
      lastContactedAt: true,
      streetNumber: true,
      household: {
        select: {
          lat: true,
          lng: true,
          visited: true,
        },
      },
      _count: {
        select: { interactions: true },
      },
    },
  });

  const points = rows
    .map((row) =>
      buildContactGeoPoint({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        address1: row.address1,
        supportLevel: row.supportLevel,
        voted: row.voted,
        gotvStatus: row.gotvStatus,
        signRequested: row.signRequested,
        volunteerInterest: row.volunteerInterest,
        lastContactedAt: row.lastContactedAt,
        streetNumber: row.streetNumber,
        household: row.household,
        interactionsCount: row._count.interactions,
      }),
    )
    .filter((row): row is ContactGeoPoint => Boolean(row))
    .filter((row) => pointInBbox({ lat: row.lat, lng: row.lng }, params.bbox));

  const hasMore = rows.length > Math.min(10000, Math.max(1, params.take));
  const sliced = hasMore ? points.slice(0, Math.min(10000, Math.max(1, params.take))) : points;
  const nextCursor = hasMore ? rows[rows.length - 2]?.id ?? null : null;

  return {
    points: sliced,
    hasMore,
    nextCursor,
  };
}
