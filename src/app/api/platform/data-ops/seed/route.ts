/**
 * POST /api/platform/data-ops/seed
 * SUPER_ADMIN only. One-time seed of the source/dataset registry.
 * Idempotent — upserts by slug.
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { CIVIC_DATA_SOURCES } from "@/lib/ingestion/registry";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req, [Role.SUPER_ADMIN]);
  if (error) return error;
  void session;

  let sourcesUpserted = 0;
  let datasetsUpserted = 0;

  for (const s of CIVIC_DATA_SOURCES) {
    const source = await prisma.dataSource.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        jurisdictionLevel: s.jurisdictionLevel,
        jurisdictionName: s.jurisdictionName,
        sourceType: s.sourceType,
        platformType: s.platformType,
        baseUrl: s.baseUrl,
        licenseUrl: s.licenseUrl,
        commercialUseAllowed: s.commercialUseAllowed,
        authRequired: s.authRequired,
        notes: s.notes,
      },
      create: {
        name: s.name,
        slug: s.slug,
        jurisdictionLevel: s.jurisdictionLevel,
        jurisdictionName: s.jurisdictionName,
        sourceType: s.sourceType,
        platformType: s.platformType,
        baseUrl: s.baseUrl,
        licenseUrl: s.licenseUrl,
        commercialUseAllowed: s.commercialUseAllowed,
        authRequired: s.authRequired,
        notes: s.notes,
      },
    });
    sourcesUpserted++;

    for (const d of s.datasets) {
      await prisma.dataset.upsert({
        where: { dataSourceId_slug: { dataSourceId: source.id, slug: d.slug } },
        update: {
          name: d.name,
          category: d.category,
          description: d.description,
          officialDatasetUrl: d.officialDatasetUrl,
          apiEndpointUrl: d.apiEndpointUrl,
          downloadUrl: d.downloadUrl,
          format: d.format,
          isSpatial: d.isSpatial,
          containsPii: d.containsPii,
          updateFrequencyDeclared: d.updateFrequencyDeclared,
          refreshIntervalMinutes: d.refreshIntervalMinutes,
          status: d.status,
        },
        create: {
          dataSourceId: source.id,
          name: d.name,
          slug: d.slug,
          category: d.category,
          description: d.description,
          officialDatasetUrl: d.officialDatasetUrl,
          apiEndpointUrl: d.apiEndpointUrl,
          downloadUrl: d.downloadUrl,
          format: d.format,
          isSpatial: d.isSpatial,
          containsPii: d.containsPii,
          updateFrequencyDeclared: d.updateFrequencyDeclared,
          refreshIntervalMinutes: d.refreshIntervalMinutes,
          status: d.status,
        },
      });
      datasetsUpserted++;
    }
  }

  return NextResponse.json({ data: { sourcesUpserted, datasetsUpserted, message: "Source registry seeded." } });
}
