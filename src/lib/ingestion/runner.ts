/**
 * Poll City — Ingestion Runner
 *
 * Manages IngestRun records. Connectors call startRun() before fetching,
 * then completeRun() when done. This gives the DataOps console full visibility
 * into every ingestion attempt regardless of outcome.
 */

import prisma from "@/lib/db/prisma";
import crypto from "crypto";
import type { IngestResult } from "./types";

export async function startRun(datasetId: string, dataSourceId: string, triggeredBy = "manual") {
  return prisma.ingestRun.create({
    data: { datasetId, dataSourceId, triggeredBy, status: "running" },
  });
}

export async function completeRun(runId: string, result: IngestResult) {
  return prisma.ingestRun.update({
    where: { id: runId },
    data: {
      status: result.status,
      httpStatus: result.httpStatus,
      recordsFetched: result.recordsFetched,
      recordsInserted: result.recordsInserted,
      recordsUpdated: result.recordsUpdated,
      recordsFailed: result.recordsFailed,
      payloadChecksum: result.payloadChecksum,
      errorSummary: result.errorSummary,
      durationMs: result.durationMs,
      completedAt: new Date(),
    },
  });
}

/** Compute SHA-256 of a string payload for deduplication */
export function checksumPayload(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Fetch recent ingest runs for the DataOps console */
export async function getRecentRuns(datasetId?: string, limit = 50) {
  return prisma.ingestRun.findMany({
    where: datasetId ? { datasetId } : undefined,
    orderBy: { startedAt: "desc" },
    take: limit,
    include: {
      dataSource: { select: { name: true, slug: true } },
      dataset: { select: { name: true, slug: true, category: true } },
    },
  });
}

/** Get dataset health summary for the DataOps console */
export async function getDatasetHealth() {
  const datasets = await prisma.dataset.findMany({
    where: { status: { not: "deprecated" } },
    include: {
      dataSource: { select: { name: true, slug: true, jurisdictionLevel: true } },
      ingestRuns: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { status: true, startedAt: true, recordsFetched: true, errorSummary: true },
      },
    },
    orderBy: [{ dataSource: { jurisdictionLevel: "asc" } }, { category: "asc" }],
  });

  return datasets.map((d) => {
    const lastRun = d.ingestRuns[0] ?? null;
    const isOverdue = d.lastIngestedAt
      ? Date.now() - d.lastIngestedAt.getTime() > d.refreshIntervalMinutes * 60 * 1000 * 1.5
      : d.status === "active";

    return {
      id: d.id,
      name: d.name,
      slug: d.slug,
      category: d.category,
      status: d.status,
      source: d.dataSource,
      lastIngestedAt: d.lastIngestedAt,
      recordCount: d.recordCount,
      qualityScore: d.qualityScore,
      isOverdue,
      lastRun,
    };
  });
}
