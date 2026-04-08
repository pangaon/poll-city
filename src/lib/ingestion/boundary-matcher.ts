/**
 * Poll City — Boundary Matcher
 *
 * Resolves any address input (postal code, lat/lng, full address) to canonical
 * political boundaries using GeoDistrict records. This is the spine of the
 * civic data platform — every entity eventually points to boundaries.
 *
 * Phase 1: postal-prefix matching (fast, no geocoding dependency)
 * Phase 2: point-in-polygon using GeoJSON from GeoDistrict.geoJson
 * Phase 3: external geocoding service for full address resolution
 */

import prisma from "@/lib/db/prisma";
import type { AddressInput, BoundaryMatchResult, BoundaryRef } from "./types";
import { GovernmentLevel } from "@prisma/client";

/**
 * Extract FSA (3-character postal prefix) from a Canadian postal code.
 * "M4C 1B2" → "M4C"
 */
export function extractPostalPrefix(postalCode: string): string | null {
  const clean = postalCode.replace(/\s+/g, "").toUpperCase();
  if (clean.length >= 3) return clean.slice(0, 3);
  return null;
}

/**
 * Resolve an address input to canonical boundaries.
 * Returns all matching GeoDistrict records (municipal + provincial + federal).
 *
 * Phase 1 implementation: postal prefix → GeoDistrict lookup.
 * When PostGIS is enabled, this upgrades to point-in-polygon.
 */
export async function matchBoundaries(input: AddressInput): Promise<BoundaryMatchResult> {
  const prefix = input.postalCode ? extractPostalPrefix(input.postalCode) : null;

  if (!prefix) {
    return { success: false, method: "postal_map", confidence: 0, boundaries: [], message: "No postal code provided" };
  }

  const districts = await prisma.geoDistrict.findMany({
    where: { postalPrefix: prefix },
  });

  if (districts.length === 0) {
    return { success: false, method: "postal_map", confidence: 0.5, boundaries: [], message: `No boundaries found for postal prefix ${prefix}` };
  }

  const boundaries: BoundaryRef[] = districts.map((d) => ({
    wardName: d.ward ?? undefined,
    wardCode: d.wardCode ?? undefined,
    municipalRiding: d.level === GovernmentLevel.municipal ? (d.riding ?? undefined) : undefined,
    provincialRiding: d.level === GovernmentLevel.provincial ? (d.riding ?? undefined) : undefined,
    federalRiding: d.level === GovernmentLevel.federal ? (d.riding ?? undefined) : undefined,
    province: d.province,
    city: d.city ?? undefined,
    postalPrefix: d.postalPrefix ?? undefined,
    geoDistrictId: d.id,
  }));

  return {
    success: true,
    method: "postal_map",
    confidence: 0.85, // postal prefix is approximate — one prefix can span ward boundaries
    boundaries,
  };
}

/**
 * Write BoundaryMembership records for an entity.
 * Idempotent — skips duplicates.
 */
export async function linkEntityToBoundaries(
  entityType: string,
  entityId: string,
  matchResult: BoundaryMatchResult,
): Promise<void> {
  if (!matchResult.success || matchResult.boundaries.length === 0) return;

  for (const b of matchResult.boundaries) {
    if (!b.geoDistrictId) continue;
    await prisma.boundaryMembership.upsert({
      where: {
        // We need a unique constraint — use a synthetic check
        id: `${entityType}-${entityId}-${b.geoDistrictId}`,
      },
      update: { confidenceScore: matchResult.confidence },
      create: {
        id: `${entityType}-${entityId}-${b.geoDistrictId}`,
        entityType,
        entityId,
        geoBoundaryId: b.geoDistrictId,
        method: matchResult.method,
        confidenceScore: matchResult.confidence,
      },
    });
  }
}
