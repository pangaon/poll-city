/**
 * GET /api/platform/data-ops
 * SUPER_ADMIN only. Returns source registry + dataset health + recent runs.
 *
 * POST /api/platform/data-ops/seed
 * Seeds the source/dataset registry from CIVIC_DATA_SOURCES.
 */

import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { getDatasetHealth, getRecentRuns } from "@/lib/ingestion/runner";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req, [Role.SUPER_ADMIN]);
  if (error) return error;
  void session;

  const [sources, datasetHealth, recentRuns] = await Promise.all([
    prisma.dataSource.findMany({
      orderBy: [{ jurisdictionLevel: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { datasets: true, ingestRuns: true } },
      },
    }),
    getDatasetHealth(),
    getRecentRuns(undefined, 20),
  ]);

  return NextResponse.json({ data: { sources, datasetHealth, recentRuns } });
}
