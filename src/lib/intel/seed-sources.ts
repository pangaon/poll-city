/**
 * Candidate Intelligence Engine — Source Registry Seed
 *
 * Seeds the DataSource table with confirmed CIE sources.
 * Unconfirmed endpoints are left as null — never invented.
 * Called by POST /api/intel/seed (SUPER_ADMIN only).
 */

import prisma from "@/lib/db/prisma";

interface CieSourceDefinition {
  name: string;
  slug: string;
  jurisdictionLevel: string;
  jurisdictionName: string;
  municipality: string | null;
  province: string | null;
  sourceType: string;
  platformType: string;
  baseUrl: string;
  rssUrl: string | null;
  entityTypes: string[];
  priorityTier: number;
  authorityScore: number;
  candidateDetectionEnabled: boolean;
  parserStrategy: string | null;
  notes: string | null;
}

const CIE_SOURCES: CieSourceDefinition[] = [
  // ── FEDERAL ──────────────────────────────────────────────────────────────
  {
    name: "Elections Canada",
    slug: "elections-canada",
    jurisdictionLevel: "federal",
    jurisdictionName: "Canada",
    municipality: null,
    province: null,
    sourceType: "api",
    platformType: "custom",
    baseUrl: "https://www.elections.ca",
    rssUrl: null,
    entityTypes: ["candidate_list", "official_list", "results"],
    priorityTier: 1,
    authorityScore: 1.0,
    candidateDetectionEnabled: false, // endpoint not confirmed — manual import
    parserStrategy: null,
    notes: "Official federal election authority. Candidate data published on election call. Endpoint TBD — enable when confirmed.",
  },
  {
    name: "Government of Canada News",
    slug: "gc-news",
    jurisdictionLevel: "federal",
    jurisdictionName: "Canada",
    municipality: null,
    province: null,
    sourceType: "rss",
    platformType: "custom",
    baseUrl: "https://www.canada.ca",
    rssUrl: "https://www.canada.ca/en/news.rss.xml",
    entityTypes: ["news"],
    priorityTier: 2,
    authorityScore: 0.9,
    candidateDetectionEnabled: true,
    parserStrategy: "rss_signals",
    notes: "GC news feed — scanned for election/nomination announcements.",
  },
  // ── PROVINCIAL ───────────────────────────────────────────────────────────
  {
    name: "Elections Ontario",
    slug: "elections-ontario",
    jurisdictionLevel: "provincial",
    jurisdictionName: "Ontario",
    municipality: null,
    province: "ON",
    sourceType: "api",
    platformType: "custom",
    baseUrl: "https://www.elections.on.ca",
    rssUrl: null,
    entityTypes: ["candidate_list", "official_list", "results"],
    priorityTier: 1,
    authorityScore: 1.0,
    candidateDetectionEnabled: false, // endpoint not confirmed
    parserStrategy: null,
    notes: "Official Ontario election authority. Endpoint TBD — enable when confirmed.",
  },
  {
    name: "Ontario Legislature News",
    slug: "ontario-legislature-news",
    jurisdictionLevel: "provincial",
    jurisdictionName: "Ontario",
    municipality: null,
    province: "ON",
    sourceType: "rss",
    platformType: "custom",
    baseUrl: "https://www.ola.org",
    rssUrl: "https://www.ola.org/en/rss/news.xml",
    entityTypes: ["news"],
    priorityTier: 3,
    authorityScore: 0.85,
    candidateDetectionEnabled: true,
    parserStrategy: "rss_signals",
    notes: "Ontario Legislature news feed.",
  },
  // ── MUNICIPAL — TORONTO ──────────────────────────────────────────────────
  {
    name: "Toronto Open Data — Elections",
    slug: "toronto-open-data-elections",
    jurisdictionLevel: "municipal",
    jurisdictionName: "Toronto",
    municipality: "Toronto",
    province: "ON",
    sourceType: "api",
    platformType: "ckan",
    baseUrl: "https://ckan0.cf.opendata.inter.prod-toronto.ca",
    rssUrl: null,
    entityTypes: ["candidate_list", "results", "boundaries"],
    priorityTier: 1,
    authorityScore: 1.0,
    candidateDetectionEnabled: false, // specific dataset endpoint TBD
    parserStrategy: "ckan_candidates",
    notes: "CKAN API confirmed. Candidate dataset endpoint TBD — enable when dataset ID confirmed.",
  },
  {
    name: "City of Toronto News",
    slug: "toronto-city-news",
    jurisdictionLevel: "municipal",
    jurisdictionName: "Toronto",
    municipality: "Toronto",
    province: "ON",
    sourceType: "rss",
    platformType: "custom",
    baseUrl: "https://www.toronto.ca",
    rssUrl: "https://www.toronto.ca/news/rss.php",
    entityTypes: ["news"],
    priorityTier: 2,
    authorityScore: 0.9,
    candidateDetectionEnabled: true,
    parserStrategy: "rss_signals",
    notes: "Toronto city news — scanned for candidate/election announcements.",
  },
  {
    name: "Toronto City Council",
    slug: "toronto-city-council",
    jurisdictionLevel: "municipal",
    jurisdictionName: "Toronto",
    municipality: "Toronto",
    province: "ON",
    sourceType: "rss",
    platformType: "custom",
    baseUrl: "https://secure.toronto.ca",
    rssUrl: "https://secure.toronto.ca/cc_rss/CCMainPageRSS.jspx",
    entityTypes: ["news"],
    priorityTier: 3,
    authorityScore: 0.85,
    candidateDetectionEnabled: true,
    parserStrategy: "rss_signals",
    notes: "Council meeting feed.",
  },
  // ── MUNICIPAL — BRAMPTON ─────────────────────────────────────────────────
  {
    name: "City of Brampton Elections",
    slug: "brampton-elections",
    jurisdictionLevel: "municipal",
    jurisdictionName: "Brampton",
    municipality: "Brampton",
    province: "ON",
    sourceType: "manual_import",
    platformType: "unknown",
    baseUrl: "https://www.brampton.ca",
    rssUrl: null,
    entityTypes: ["candidate_list", "results"],
    priorityTier: 2,
    authorityScore: 1.0,
    candidateDetectionEnabled: false,
    parserStrategy: null,
    notes: "No confirmed machine-readable endpoint. Manual import required for election data.",
  },
  // ── MUNICIPAL — MISSISSAUGA ──────────────────────────────────────────────
  {
    name: "City of Mississauga Elections",
    slug: "mississauga-elections",
    jurisdictionLevel: "municipal",
    jurisdictionName: "Mississauga",
    municipality: "Mississauga",
    province: "ON",
    sourceType: "manual_import",
    platformType: "unknown",
    baseUrl: "https://www.mississauga.ca",
    rssUrl: null,
    entityTypes: ["candidate_list", "results"],
    priorityTier: 2,
    authorityScore: 1.0,
    candidateDetectionEnabled: false,
    parserStrategy: null,
    notes: "No confirmed machine-readable endpoint. Manual import required.",
  },
  // ── MUNICIPAL — VAUGHAN ──────────────────────────────────────────────────
  {
    name: "City of Vaughan Elections",
    slug: "vaughan-elections",
    jurisdictionLevel: "municipal",
    jurisdictionName: "Vaughan",
    municipality: "Vaughan",
    province: "ON",
    sourceType: "manual_import",
    platformType: "unknown",
    baseUrl: "https://www.vaughan.ca",
    rssUrl: null,
    entityTypes: ["candidate_list", "results"],
    priorityTier: 2,
    authorityScore: 1.0,
    candidateDetectionEnabled: false,
    parserStrategy: null,
    notes: "No confirmed machine-readable endpoint. Manual import required.",
  },
  // ── MUNICIPAL — MARKHAM ──────────────────────────────────────────────────
  {
    name: "Town of Markham Elections",
    slug: "markham-elections",
    jurisdictionLevel: "municipal",
    jurisdictionName: "Markham",
    municipality: "Markham",
    province: "ON",
    sourceType: "manual_import",
    platformType: "unknown",
    baseUrl: "https://www.markham.ca",
    rssUrl: null,
    entityTypes: ["candidate_list", "results"],
    priorityTier: 2,
    authorityScore: 1.0,
    candidateDetectionEnabled: false,
    parserStrategy: null,
    notes: "No confirmed machine-readable endpoint. Manual import required.",
  },
  // ── MUNICIPAL — OTTAWA ───────────────────────────────────────────────────
  {
    name: "City of Ottawa Elections",
    slug: "ottawa-elections",
    jurisdictionLevel: "municipal",
    jurisdictionName: "Ottawa",
    municipality: "Ottawa",
    province: "ON",
    sourceType: "manual_import",
    platformType: "unknown",
    baseUrl: "https://ottawa.ca",
    rssUrl: null,
    entityTypes: ["candidate_list", "results"],
    priorityTier: 2,
    authorityScore: 1.0,
    candidateDetectionEnabled: false,
    parserStrategy: null,
    notes: "No confirmed machine-readable endpoint. Manual import required.",
  },
  // ── CIVIC DATA ───────────────────────────────────────────────────────────
  {
    name: "OpenNorth Represent API",
    slug: "opennorth-represent",
    jurisdictionLevel: "federal",
    jurisdictionName: "Canada",
    municipality: null,
    province: null,
    sourceType: "api",
    platformType: "custom",
    baseUrl: "https://represent.opennorth.ca",
    rssUrl: null,
    entityTypes: ["official_list", "boundaries"],
    priorityTier: 1,
    authorityScore: 0.9,
    candidateDetectionEnabled: false, // officials, not candidates
    parserStrategy: "opennorth_reps",
    notes: "Canadian elected officials API. Good for officials lookup — not candidate announcements.",
  },
  {
    name: "Statistics Canada Boundary Data",
    slug: "statscan-boundaries",
    jurisdictionLevel: "federal",
    jurisdictionName: "Canada",
    municipality: null,
    province: null,
    sourceType: "bulk_download",
    platformType: "statscan_wds",
    baseUrl: "https://www150.statcan.gc.ca",
    rssUrl: null,
    entityTypes: ["boundaries"],
    priorityTier: 3,
    authorityScore: 1.0,
    candidateDetectionEnabled: false,
    parserStrategy: null,
    notes: "Electoral boundary shapefiles. Manual download required. No candidate detection.",
  },
  // ── NEWS ─────────────────────────────────────────────────────────────────
  {
    name: "CBC News — Top Stories",
    slug: "cbc-news-top",
    jurisdictionLevel: "federal",
    jurisdictionName: "Canada",
    municipality: null,
    province: null,
    sourceType: "rss",
    platformType: "custom",
    baseUrl: "https://www.cbc.ca",
    rssUrl: "https://www.cbc.ca/cmlink/rss-topstories",
    entityTypes: ["news"],
    priorityTier: 1,
    authorityScore: 0.8,
    candidateDetectionEnabled: true,
    parserStrategy: "rss_signals",
    notes: "CBC national news RSS — high-volume, high-authority.",
  },
  {
    name: "Toronto Star — RSS",
    slug: "toronto-star-rss",
    jurisdictionLevel: "municipal",
    jurisdictionName: "Toronto",
    municipality: "Toronto",
    province: "ON",
    sourceType: "rss",
    platformType: "custom",
    baseUrl: "https://www.thestar.com",
    rssUrl: "https://www.thestar.com/rss/",
    entityTypes: ["news"],
    priorityTier: 2,
    authorityScore: 0.75,
    candidateDetectionEnabled: true,
    parserStrategy: "rss_signals",
    notes: "Toronto Star national feed. Good for Toronto/Ontario municipal candidacy news.",
  },
  {
    name: "NewsAPI — Canadian Politics",
    slug: "newsapi-ca-politics",
    jurisdictionLevel: "federal",
    jurisdictionName: "Canada",
    municipality: null,
    province: null,
    sourceType: "news_api",
    platformType: "custom",
    baseUrl: "https://newsapi.org",
    rssUrl: null,
    entityTypes: ["news"],
    priorityTier: 2,
    authorityScore: 0.7,
    candidateDetectionEnabled: true,
    parserStrategy: "rss_signals",
    notes: "Requires NEWS_API_KEY env var. Searches for Canadian political keywords. Free tier: 100 req/day.",
  },
];

export interface CieSourceSeedResult {
  created: number;
  updated: number;
  skipped: number;
  total: number;
}

export async function seedCieSources(): Promise<CieSourceSeedResult> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const def of CIE_SOURCES) {
    try {
      const existing = await prisma.dataSource.findUnique({
        where: { slug: def.slug },
        select: { id: true },
      });

      const data = {
        name: def.name,
        jurisdictionLevel: def.jurisdictionLevel,
        jurisdictionName: def.jurisdictionName,
        municipality: def.municipality,
        sourceType: def.sourceType,
        platformType: def.platformType,
        baseUrl: def.baseUrl,
        rssUrl: def.rssUrl,
        entityTypes: def.entityTypes,
        priorityTier: def.priorityTier,
        authorityScore: def.authorityScore,
        candidateDetectionEnabled: def.candidateDetectionEnabled,
        parserStrategy: def.parserStrategy,
        notes: def.notes,
        isActive: true,
      };

      if (existing) {
        await prisma.dataSource.update({ where: { slug: def.slug }, data });
        updated++;
      } else {
        await prisma.dataSource.create({ data: { slug: def.slug, ...data } });
        created++;
      }
    } catch {
      skipped++;
    }
  }

  return { created, updated, skipped, total: CIE_SOURCES.length };
}
