/**
 * Poll City — Civic Data Source Registry
 *
 * Canonical list of official Canadian civic/political data sources.
 * This seeds the data_sources and datasets tables.
 *
 * Phase 1: Toronto + StatsCan + Elections Canada + Elections Ontario
 * Phase 2: Brampton, Montréal
 * Phase 3: Vaughan + issue feeds
 */

import type { DataSourceSeed } from "./types";

export const CIVIC_DATA_SOURCES: DataSourceSeed[] = [
  // ── Toronto Open Data (CKAN) ──────────────────────────────────────────────
  {
    name: "Toronto Open Data",
    slug: "toronto-open-data",
    jurisdictionLevel: "municipal",
    jurisdictionName: "Toronto",
    sourceType: "api",
    platformType: "ckan",
    baseUrl: "https://ckan0.cf.opendata.inter.prod-toronto.ca",
    licenseUrl: "https://open.toronto.ca/open-data-licence/",
    commercialUseAllowed: true,
    authRequired: false,
    notes: "CKAN-based open data portal. Requires attribution under Open Government Licence – Toronto.",
    datasets: [
      {
        name: "Ward Boundaries – City Council (2022–)",
        slug: "toronto-ward-boundaries",
        category: "boundaries",
        description: "Official 25-ward municipal boundary polygons for City of Toronto.",
        officialDatasetUrl: "https://open.toronto.ca/dataset/city-wards/",
        apiEndpointUrl: "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=city-wards",
        format: "geojson",
        isSpatial: true,
        containsPii: false,
        updateFrequencyDeclared: "on_election",
        refreshIntervalMinutes: 43200, // monthly check
        status: "active",
      },
      {
        name: "Election Results – Official (Poll by Poll)",
        slug: "toronto-election-results",
        category: "elections",
        description: "Official municipal election results at poll level for all Toronto elections.",
        officialDatasetUrl: "https://open.toronto.ca/dataset/elections-official-results/",
        apiEndpointUrl: "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=elections-official-results",
        format: "csv",
        isSpatial: false,
        containsPii: false,
        updateFrequencyDeclared: "on_election",
        refreshIntervalMinutes: 43200,
        status: "active",
      },
      {
        name: "311 Service Requests – Customer Initiated",
        slug: "toronto-311",
        category: "issues",
        description: "Customer-initiated 311 service requests with status and ward. Issue heatmaps, complaint clusters.",
        officialDatasetUrl: "https://open.toronto.ca/dataset/311-service-requests-customer-initiated/",
        format: "csv",
        isSpatial: false,
        containsPii: false,
        updateFrequencyDeclared: "daily",
        refreshIntervalMinutes: 1440, // daily
        status: "planned",
      },
      {
        name: "Building Permits – Cleared",
        slug: "toronto-building-permits",
        category: "planning",
        description: "Cleared building permits with address, type, value. Housing pipeline tracking.",
        officialDatasetUrl: "https://open.toronto.ca/dataset/building-permits-cleared-permits/",
        format: "csv",
        isSpatial: false,
        containsPii: false,
        updateFrequencyDeclared: "monthly",
        refreshIntervalMinutes: 43200,
        status: "planned",
      },
    ],
  },

  // ── Statistics Canada (WDS) ───────────────────────────────────────────────
  {
    name: "Statistics Canada – Web Data Service",
    slug: "statscan-wds",
    jurisdictionLevel: "statistical",
    jurisdictionName: "Canada",
    sourceType: "api",
    platformType: "statscan_wds",
    baseUrl: "https://www150.statcan.gc.ca/t1/tbl1/en",
    licenseUrl: "https://www.statcan.gc.ca/en/reference/licence",
    commercialUseAllowed: true,
    authRequired: false,
    notes: "Statistics Canada Web Data Service. Provides census tables, demographic indicators by geography.",
    datasets: [
      {
        name: "Census 2021 – Age and Sex (Ward/Riding level)",
        slug: "statscan-age-sex-2021",
        category: "demographics",
        description: "Population by age group and sex at census subdivision and federal riding level.",
        officialDatasetUrl: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000101",
        apiEndpointUrl: "https://www150.statcan.gc.ca/t1/tbl1/en/dtbl/downloadTbl/csvDownload?pid=9810000101",
        format: "csv",
        isSpatial: false,
        containsPii: false,
        updateFrequencyDeclared: "annual",
        refreshIntervalMinutes: 525600, // yearly
        status: "planned",
      },
      {
        name: "Census 2021 – Housing and Income",
        slug: "statscan-housing-income-2021",
        category: "demographics",
        description: "Shelter costs, household income, housing tenure by geography.",
        officialDatasetUrl: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=9810000301",
        format: "csv",
        isSpatial: false,
        containsPii: false,
        updateFrequencyDeclared: "annual",
        refreshIntervalMinutes: 525600,
        status: "planned",
      },
    ],
  },

  // ── Elections Canada ──────────────────────────────────────────────────────
  {
    name: "Elections Canada – Open Data",
    slug: "elections-canada",
    jurisdictionLevel: "federal",
    jurisdictionName: "Canada",
    sourceType: "bulk_download",
    platformType: "custom",
    baseUrl: "https://www.elections.ca",
    licenseUrl: "https://www.elections.ca/content.aspx?dir=oda&document=index&lang=e&section=fin",
    commercialUseAllowed: true,
    authRequired: false,
    notes: "Federal election results and finance data. Primary delivery via bulk CSV/ZIP download, not REST API.",
    datasets: [
      {
        name: "Federal Election Results – Poll by Poll",
        slug: "elections-canada-results",
        category: "elections",
        description: "Poll-by-poll results for federal general elections. Candidate, votes, turnout by district.",
        officialDatasetUrl: "https://www.elections.ca/content.aspx?dir=oda&document=index&lang=e&section=fin",
        format: "zip",
        isSpatial: false,
        containsPii: false,
        updateFrequencyDeclared: "on_election",
        refreshIntervalMinutes: 525600,
        status: "planned",
      },
      {
        name: "Federal Electoral District Boundaries",
        slug: "elections-canada-boundaries",
        category: "boundaries",
        description: "Official federal electoral district boundary files.",
        officialDatasetUrl: "https://search.open.canada.ca/opendata/?owner_org=elections",
        format: "shp",
        isSpatial: true,
        containsPii: false,
        updateFrequencyDeclared: "on_redistribution",
        refreshIntervalMinutes: 525600,
        status: "planned",
      },
    ],
  },

  // ── Elections Ontario ─────────────────────────────────────────────────────
  {
    name: "Elections Ontario – Finance & Results",
    slug: "elections-ontario",
    jurisdictionLevel: "provincial",
    jurisdictionName: "Ontario",
    sourceType: "bulk_download",
    platformType: "custom",
    baseUrl: "https://finances.elections.on.ca",
    licenseUrl: "https://finances.elections.on.ca/",
    commercialUseAllowed: true,
    authRequired: false,
    notes: "Provincial election results, candidate finance, and contribution disclosure. Bulk download and searchable pages.",
    datasets: [
      {
        name: "Municipal Election Results – Ontario",
        slug: "elections-ontario-municipal-results",
        category: "elections",
        description: "Ontario province-level municipal election result dataset from Ontario Data Catalogue.",
        officialDatasetUrl: "https://data.ontario.ca/dataset/municipal-election-results",
        format: "csv",
        isSpatial: false,
        containsPii: false,
        updateFrequencyDeclared: "on_election",
        refreshIntervalMinutes: 525600,
        status: "planned",
      },
      {
        name: "Political Finance Contributions – Ontario",
        slug: "elections-ontario-finance",
        category: "finance",
        description: "Contribution disclosure data for Ontario campaigns and parties.",
        officialDatasetUrl: "https://finances.elections.on.ca/",
        format: "csv",
        isSpatial: false,
        containsPii: false,
        updateFrequencyDeclared: "weekly",
        refreshIntervalMinutes: 10080,
        status: "planned",
      },
    ],
  },
];
