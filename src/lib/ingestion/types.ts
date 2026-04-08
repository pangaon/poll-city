/**
 * Poll City — Civic Data Ingestion Types
 *
 * Canonical type definitions for the civic data ingestion framework.
 * Every connector must implement ConnectorInterface.
 * Every boundary-aware entity should resolve to BoundaryRef.
 */

export type JurisdictionLevel = "municipal" | "provincial" | "federal" | "statistical";
export type SourceType = "api" | "bulk_download" | "rss" | "manual_import";
export type PlatformType = "ckan" | "arcgis" | "statscan_wds" | "custom" | "unknown";
export type DataFormat = "json" | "csv" | "geojson" | "shp" | "zip" | "xml" | "xlsx";
export type DataCategory = "boundaries" | "elections" | "demographics" | "issues" | "finance" | "planning" | "officials";
export type IngestStatus = "running" | "success" | "partial" | "failed" | "skipped";
export type BoundaryMatchMethod = "postal_map" | "point_in_polygon" | "source_native" | "manual";

export interface ConnectorConfig {
  sourceId: string;
  datasetId: string;
  baseUrl: string;
  apiKey?: string;
  extra?: Record<string, unknown>;
}

export interface IngestResult {
  status: IngestStatus;
  httpStatus?: number;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsFailed: number;
  payloadChecksum?: string;
  errorSummary?: string;
  durationMs: number;
}

/**
 * Every connector must implement this interface.
 * Connectors are stateless — they receive config and return results.
 */
export interface ConnectorInterface {
  readonly sourceSlug: string;
  readonly datasetSlug: string;
  run(config: ConnectorConfig): Promise<IngestResult>;
}

/** A resolved boundary reference for any entity */
export interface BoundaryRef {
  wardName?: string;
  wardCode?: string;
  municipalRiding?: string;
  provincialRiding?: string;
  federalRiding?: string;
  province: string;
  city?: string;
  postalPrefix?: string;
  geoDistrictId?: string;
}

/** Canonical address input for boundary matching */
export interface AddressInput {
  address?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
  province?: string;
}

/** Result of a boundary match operation */
export interface BoundaryMatchResult {
  success: boolean;
  method: BoundaryMatchMethod;
  confidence: number;
  boundaries: BoundaryRef[];
  message?: string;
}

/** Source registry seed entry — used to populate data_sources table */
export interface DataSourceSeed {
  name: string;
  slug: string;
  jurisdictionLevel: JurisdictionLevel;
  jurisdictionName: string;
  sourceType: SourceType;
  platformType: PlatformType;
  baseUrl: string;
  licenseUrl?: string;
  commercialUseAllowed: boolean;
  authRequired: boolean;
  notes?: string;
  datasets: DatasetSeed[];
}

/** Dataset registry seed entry */
export interface DatasetSeed {
  name: string;
  slug: string;
  category: DataCategory;
  description?: string;
  officialDatasetUrl?: string;
  apiEndpointUrl?: string;
  downloadUrl?: string;
  format: DataFormat;
  isSpatial: boolean;
  containsPii: boolean;
  updateFrequencyDeclared?: string;
  refreshIntervalMinutes: number;
  status: "planned" | "active" | "paused";
}
