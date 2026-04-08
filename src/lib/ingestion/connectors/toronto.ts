/**
 * Poll City — Toronto Open Data Connector
 *
 * Connects to Toronto's CKAN-based open data portal.
 * Phase 1: ward boundaries + election results.
 *
 * CKAN API reference: https://docs.ckan.org/en/2.10/api/
 * Toronto portal base: https://ckan0.cf.opendata.inter.prod-toronto.ca
 */

import prisma from "@/lib/db/prisma";
import type { ConnectorConfig, ConnectorInterface, IngestResult } from "../types";
import { checksumPayload } from "../runner";
import { GovernmentLevel } from "@prisma/client";

const CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchCkanResource(packageId: string): Promise<{ resourceUrl: string; format: string } | null> {
  const res = await fetch(`${CKAN_BASE}/api/3/action/package_show?id=${packageId}`);
  if (!res.ok) return null;
  const data = await res.json() as { result?: { resources?: Array<{ url: string; format: string }> } };
  const resources = data.result?.resources ?? [];
  const geojson = resources.find((r) => r.format?.toLowerCase() === "geojson");
  const csv = resources.find((r) => r.format?.toLowerCase() === "csv");
  const picked = geojson ?? csv ?? resources[0] ?? null;
  if (!picked) return null;
  return { resourceUrl: picked.url, format: picked.format };
}

// ── Ward Boundaries Connector ─────────────────────────────────────────────────

export class TorontoWardBoundariesConnector implements ConnectorInterface {
  readonly sourceSlug = "toronto-open-data";
  readonly datasetSlug = "toronto-ward-boundaries";

  async run(config: ConnectorConfig): Promise<IngestResult> {
    const started = Date.now();

    const resource = await fetchCkanResource("city-wards");
    if (!resource) {
      return { status: "failed", httpStatus: 404, recordsFetched: 0, recordsInserted: 0, recordsUpdated: 0, recordsFailed: 0, errorSummary: "Could not find city-wards package resource", durationMs: Date.now() - started };
    }

    const res = await fetch(resource.resourceUrl);
    if (!res.ok) {
      return { status: "failed", httpStatus: res.status, recordsFetched: 0, recordsInserted: 0, recordsUpdated: 0, recordsFailed: 0, errorSummary: `HTTP ${res.status} fetching ward boundaries`, durationMs: Date.now() - started };
    }

    const raw = await res.text();
    const checksum = checksumPayload(raw);
    const geojson = JSON.parse(raw) as { features?: Array<{ properties: Record<string, unknown>; geometry: unknown }> };
    const features = geojson.features ?? [];

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const feature of features) {
      const props = feature.properties;
      const wardNum = String(props["AREA_SHORT_CODE"] ?? props["WARD_NUM"] ?? props["NAME"] ?? "");
      const wardName = String(props["AREA_LONG_CODE"] ?? props["AREA_NAME"] ?? props["NAME"] ?? "");

      try {
        // Ward boundary records have no postalPrefix — use findFirst + update/create pattern
        const existing = await prisma.geoDistrict.findFirst({
          where: { externalId: wardNum, level: GovernmentLevel.municipal, city: "Toronto" },
        });
        if (existing) {
          await prisma.geoDistrict.update({
            where: { id: existing.id },
            data: { geoJson: feature.geometry as object, name: wardName, slug: `toronto-ward-${wardNum}`, districtType: "municipal", ingestedAt: new Date() },
          });
          updated++;
        } else {
          await prisma.geoDistrict.create({
            data: { province: "ON", city: "Toronto", level: GovernmentLevel.municipal, ward: wardName, wardCode: wardNum, name: wardName, slug: `toronto-ward-${wardNum}`, districtType: "municipal", externalId: wardNum, geoJson: feature.geometry as object, ingestedAt: new Date() },
          });
          inserted++;
        }
      } catch {
        failed++;
      }
    }

    await prisma.dataset.update({
      where: { id: config.datasetId },
      data: { lastIngestedAt: new Date(), recordCount: features.length },
    });

    return {
      status: failed > 0 && inserted === 0 ? "failed" : failed > 0 ? "partial" : "success",
      httpStatus: 200,
      recordsFetched: features.length,
      recordsInserted: inserted,
      recordsUpdated: updated,
      recordsFailed: failed,
      payloadChecksum: checksum,
      durationMs: Date.now() - started,
    };
  }
}

// ── Election Results Connector ────────────────────────────────────────────────

export class TorontoElectionResultsConnector implements ConnectorInterface {
  readonly sourceSlug = "toronto-open-data";
  readonly datasetSlug = "toronto-election-results";

  async run(config: ConnectorConfig): Promise<IngestResult> {
    const started = Date.now();

    const resource = await fetchCkanResource("elections-official-results");
    if (!resource) {
      return { status: "failed", httpStatus: 404, recordsFetched: 0, recordsInserted: 0, recordsUpdated: 0, recordsFailed: 0, errorSummary: "Could not find elections-official-results package resource", durationMs: Date.now() - started };
    }

    const res = await fetch(resource.resourceUrl);
    if (!res.ok) {
      return { status: "failed", httpStatus: res.status, recordsFetched: 0, recordsInserted: 0, recordsUpdated: 0, recordsFailed: 0, errorSummary: `HTTP ${res.status} fetching election results`, durationMs: Date.now() - started };
    }

    const raw = await res.text();
    const checksum = checksumPayload(raw);
    const lines = raw.split("\n").filter(Boolean);
    const headers = lines[0]?.split(",").map((h) => h.trim().replace(/^"|"$/g, "")) ?? [];

    let inserted = 0;
    let failed = 0;

    for (const line of lines.slice(1)) {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ""; });

      const electionDate = row["Election Date"] || row["ELECTION_DATE"];
      const candidateName = row["Candidate Name"] || row["CANDIDATE_NAME"];
      const jurisdiction = row["Ward"] || row["WARD"] || row["District"] || row["DISTRICT"];
      const votes = parseInt(row["Votes Received"] || row["VOTES_RECEIVED"] || "0", 10);
      const total = parseInt(row["Total Votes Cast"] || row["TOTAL_VOTES"] || "0", 10);

      if (!electionDate || !candidateName || !jurisdiction || isNaN(votes)) { failed++; continue; }

      try {
        await prisma.electionResult.upsert({
          where: {
            // Use a synthetic approach — if no unique constraint exists, create
            id: `toronto-${electionDate}-${candidateName}-${jurisdiction}`.replace(/\s+/g, "-").toLowerCase().slice(0, 50),
          },
          update: { votesReceived: votes, totalVotesCast: total, percentage: total > 0 ? votes / total : 0 },
          create: {
            id: `toronto-${electionDate}-${candidateName}-${jurisdiction}`.replace(/\s+/g, "-").toLowerCase().slice(0, 50),
            electionDate: new Date(electionDate),
            electionType: "municipal",
            jurisdiction,
            candidateName,
            votesReceived: votes,
            totalVotesCast: total,
            percentage: total > 0 ? votes / total : 0,
            source: "toronto-open-data",
          },
        });
        inserted++;
      } catch {
        failed++;
      }
    }

    await prisma.dataset.update({
      where: { id: config.datasetId },
      data: { lastIngestedAt: new Date(), recordCount: lines.length - 1 },
    });

    return {
      status: failed > 0 && inserted === 0 ? "failed" : failed > 0 ? "partial" : "success",
      httpStatus: 200,
      recordsFetched: lines.length - 1,
      recordsInserted: inserted,
      recordsUpdated: 0,
      recordsFailed: failed,
      payloadChecksum: checksum,
      durationMs: Date.now() - started,
    };
  }
}
