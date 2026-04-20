/**
 * POST /api/platform/data-ops/run
 * SUPER_ADMIN only. Manually triggers a connector for a specific dataset.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { startRun, completeRun } from "@/lib/ingestion/runner";
import type { ConnectorInterface } from "@/lib/ingestion/types";
import { TorontoWardBoundariesConnector, TorontoElectionResultsConnector } from "@/lib/ingestion/connectors/toronto";

const CONNECTORS: Record<string, ConnectorInterface> = {
  "toronto-ward-boundaries": new TorontoWardBoundariesConnector(),
  "toronto-election-results": new TorontoElectionResultsConnector(),
};

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req, [Role.SUPER_ADMIN]);
  if (error) return error;
  void session;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { datasetSlug } = body as { datasetSlug?: string };
  if (!datasetSlug) return NextResponse.json({ error: "datasetSlug required" }, { status: 422 });

  const dataset = await prisma.dataset.findFirst({
    where: { slug: datasetSlug },
    include: { dataSource: { select: { id: true, name: true, baseUrl: true } } },
  });
  if (!dataset) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });

  const connector = CONNECTORS[datasetSlug];
  if (!connector) {
    return NextResponse.json({ error: `No connector available for "${datasetSlug}". Coming soon.` }, { status: 422 });
  }

  const run = await startRun(dataset.id, dataset.dataSourceId, "manual");

  try {
    const result = await connector.run({
      sourceId: dataset.dataSourceId,
      datasetId: dataset.id,
      baseUrl: dataset.dataSource.baseUrl ?? "",
    });
    await completeRun(run.id, result);

    await prisma.dataset.update({
      where: { id: dataset.id },
      data: {
        lastIngestedAt: new Date(),
        recordCount: result.recordsInserted + result.recordsUpdated,
        status: result.status === "failed" ? "broken" : "active",
      },
    });

    return NextResponse.json({ data: { runId: run.id, ...result } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    await completeRun(run.id, {
      status: "failed", httpStatus: 500, recordsFetched: 0,
      recordsInserted: 0, recordsUpdated: 0, recordsFailed: 0,
      errorSummary: msg, durationMs: 0,
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
