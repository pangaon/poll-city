/**
 * Ward Asset Registry — canonical source of truth for all Ontario ward data.
 * Every municipality Poll City supports lives here with its verification status.
 * Updated by the discovery cron; committed to git as the audit trail.
 *
 * Source priority order for every municipality:
 *   1. ArcGIS REST service (hub item metadata → service URL → query with outSR=4326)
 *   2. ArcGIS Hub direct GeoJSON download (verify WGS84 coordinates before trusting)
 *   3. Represent OpenNorth (last resort — WGS84 guaranteed but slower)
 */

export type SourceType = "arcgis-rest" | "arcgis-geojson" | "represent" | "ckan";

export interface WardAssetSource {
  type: SourceType;
  url: string;
  layer?: number;          // ArcGIS layer index
  filter?: string;         // e.g. "Municipality='Brampton'" for shared region services
  outSR?: number;          // force output CRS — always 4326 for ArcGIS REST
  verified: boolean;       // true only if URL confirmed to return valid WGS84 geometry
  verifiedAt?: string;     // ISO date of last successful verification
  notes?: string;          // e.g. "source returns EPSG:3857 — outSR=4326 required"
}

export interface WardAssetEntry {
  municipality: string;         // display name shown in sidebar: "City of Hamilton"
  slug: string;                 // url-safe identifier: "hamilton"
  region: string;               // grouping for map/sidebar
  accentColor: string;          // hex fill colour for MapLibre ward polygons
  accentStroke: string;         // hex stroke colour
  addressesApi: string;         // Next.js route: "/api/atlas/hamilton-addresses"
  wardSources: WardAssetSource[];     // ordered: primary first
  addressSources?: WardAssetSource[]; // for address point fetching
  wardCount?: number;           // populated after first successful fetch
  lastFetched?: string;         // ISO date of last DB upsert
}

export const WARD_ASSET_REGISTRY: WardAssetEntry[] = [
  // ── Greater Toronto Area ────────────────────────────────────────────────────

  {
    municipality: "Toronto",
    slug: "toronto",
    region: "GTA",
    accentColor: "#0EA5E9",
    accentStroke: "#0284c7",
    addressesApi: "/api/atlas/toronto-addresses",
    wardSources: [
      {
        type: "ckan",
        url: "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=city-wards",
        verified: true,
        verifiedAt: "2026-04-22",
        notes: "CKAN package → extracts GeoJSON resource with name containing '4326'",
      },
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=toronto-wards-2018&limit=30&format=json",
        verified: true,
        verifiedAt: "2026-04-22",
      },
    ],
  },

  {
    municipality: "Brampton",
    slug: "brampton",
    region: "GTA",
    accentColor: "#8B5CF6",
    accentStroke: "#7040d4",
    addressesApi: "/api/atlas/brampton-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=brampton-wards&limit=20&format=json",
        verified: true,
        verifiedAt: "2026-04-22",
        notes: "Brampton GeoHub returns EPSG:3857 from Vercel — Represent is reliable WGS84 primary",
      },
      {
        type: "arcgis-rest",
        url: "https://services6.arcgis.com/ONZht79c8QWuX759/arcgis/rest/services/Peel_Ward_Boundary/FeatureServer",
        layer: 0,
        filter: "Municipality=1",
        outSR: 4326,
        verified: false,
        notes: "Peel Region service covers Brampton+Mississauga+Caledon — Municipality field uses coded domain, code for Brampton TBD",
      },
    ],
    addressSources: [
      {
        type: "arcgis-rest",
        url: "https://maps1.brampton.ca/arcgis/rest/services/COB/OpenData_Address_Points/MapServer",
        layer: 14,
        outSR: 4326,
        verified: true,
        verifiedAt: "2026-04-22",
        notes: "Source CRS WKID 2150 — outSR=4326 required",
      },
    ],
  },

  {
    municipality: "Markham",
    slug: "markham",
    region: "GTA",
    accentColor: "#EF9F27",
    accentStroke: "#c47e12",
    addressesApi: "/api/atlas/markham-addresses",
    wardSources: [
      {
        type: "arcgis-rest",
        url: "https://www.arcgis.com/sharing/rest/content/items/e18e684f2f004f0e98d707cad60234be",
        layer: 0,
        outSR: 4326,
        verified: true,
        verifiedAt: "2026-04-22",
        notes: "arcgis.com item metadata → derives service URL → queries layer 0",
      },
      {
        type: "arcgis-geojson",
        url: "https://opendata.arcgis.com/datasets/e18e684f2f004f0e98d707cad60234be_0.geojson",
        verified: true,
        verifiedAt: "2026-04-22",
      },
    ],
  },

  {
    municipality: "Vaughan",
    slug: "vaughan",
    region: "GTA",
    accentColor: "#EC4899",
    accentStroke: "#c7277a",
    addressesApi: "/api/atlas/vaughan-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=vaughan-wards&limit=20&format=json",
        verified: false,
        notes: "Represent slug unverified — discovery cron will confirm",
      },
    ],
  },

  {
    municipality: "Mississauga",
    slug: "mississauga",
    region: "GTA",
    accentColor: "#14B8A6",
    accentStroke: "#0d9488",
    addressesApi: "/api/atlas/mississauga-addresses",
    wardSources: [
      {
        type: "arcgis-rest",
        url: "https://services6.arcgis.com/ONZht79c8QWuX759/arcgis/rest/services/Peel_Ward_Boundary/FeatureServer",
        layer: 0,
        filter: "Municipality=2",
        outSR: 4326,
        verified: false,
        notes: "Peel Region service — Municipality code for Mississauga TBD",
      },
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=mississauga-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Whitby",
    slug: "whitby",
    region: "Durham Region",
    accentColor: "#1D9E75",
    accentStroke: "#0d7a5a",
    addressesApi: "/api/atlas/whitby-addresses",
    wardSources: [
      {
        type: "arcgis-geojson",
        url: "https://opendata.arcgis.com/datasets/223810efc31c40b3aff99dd74f809a97_0.geojson",
        verified: true,
        verifiedAt: "2026-04-22",
      },
      {
        type: "arcgis-rest",
        url: "https://services5.arcgis.com/ATdLnvuMRJk8AGkQ/arcgis/rest/services/WhitbyWard/FeatureServer",
        layer: 0,
        outSR: 4326,
        verified: true,
        verifiedAt: "2026-04-22",
        notes: "Direct ArcGIS Online service — more reliable than Open Data download",
      },
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=whitby-wards&limit=20&format=json",
        verified: true,
        verifiedAt: "2026-04-22",
      },
    ],
  },

  {
    municipality: "Oshawa",
    slug: "oshawa",
    region: "Durham Region",
    accentColor: "#F97316",
    accentStroke: "#c2510f",
    addressesApi: "/api/atlas/oshawa-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=oshawa-wards&limit=20&format=json",
        verified: false,
        notes: "Represent slug unverified — discovery cron will confirm",
      },
    ],
  },

  {
    municipality: "Ajax",
    slug: "ajax",
    region: "Durham Region",
    accentColor: "#6366F1",
    accentStroke: "#4f51c7",
    addressesApi: "/api/atlas/ajax-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=ajax-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Pickering",
    slug: "pickering",
    region: "Durham Region",
    accentColor: "#3B82F6",
    accentStroke: "#1d4ed8",
    addressesApi: "/api/atlas/pickering-addresses",
    wardSources: [
      {
        type: "arcgis-rest",
        url: "https://maps.pickering.ca/arcgisinter/rest/services/public/OpenData/MapServer",
        layer: 5,
        outSR: 4326,
        verified: true,
        verifiedAt: "2026-04-22",
        notes: "Pickering Open Data MapServer layer 5 — ward polygons, TEXT_ field = ward name, includes RegionalCouncillor/LocalCouncillor/Mayor fields",
      },
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=pickering-wards&limit=20&format=json",
        verified: false,
        notes: "Represent slug unverified — fallback only",
      },
    ],
    addressSources: [
      {
        type: "arcgis-rest",
        url: "https://maps.pickering.ca/arcgisinter/rest/services/public/OpenData/MapServer",
        layer: 0,
        outSR: 4326,
        verified: true,
        verifiedAt: "2026-04-22",
        notes: "Pickering address points — 42,610 points, fields: HOUSENUMBE, STREET, STREETTYPE, STREETDIRE, UNITTYPE, UNITNUMBER, CITY",
      },
      {
        type: "arcgis-rest",
        url: "https://maps.durham.ca/arcgis/rest/services/Open_Data/Durham_OpenData/MapServer",
        layer: 0,
        filter: "TOWN='Pickering'",
        outSR: 4326,
        verified: true,
        verifiedAt: "2026-04-22",
        notes: "Durham Region civic addresses — 253,329 total, filter TOWN='Pickering'; richer data (includes POSTAL_CODE)",
      },
    ],
  },

  {
    municipality: "Clarington",
    slug: "clarington",
    region: "Durham Region",
    accentColor: "#84CC16",
    accentStroke: "#5a8c0e",
    addressesApi: "/api/atlas/clarington-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=clarington-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  // ── Greater Golden Horseshoe ─────────────────────────────────────────────────

  {
    municipality: "Hamilton",
    slug: "hamilton",
    region: "Greater Golden Horseshoe",
    accentColor: "#F59E0B",
    accentStroke: "#d97706",
    addressesApi: "/api/atlas/hamilton-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=hamilton-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Burlington",
    slug: "burlington",
    region: "Greater Golden Horseshoe",
    accentColor: "#10B981",
    accentStroke: "#059669",
    addressesApi: "/api/atlas/burlington-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=burlington-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Oakville",
    slug: "oakville",
    region: "Greater Golden Horseshoe",
    accentColor: "#38BDF8",
    accentStroke: "#0284c7",
    addressesApi: "/api/atlas/oakville-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=oakville-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Milton",
    slug: "milton",
    region: "Greater Golden Horseshoe",
    accentColor: "#A78BFA",
    accentStroke: "#7c5ed6",
    addressesApi: "/api/atlas/milton-addresses",
    wardSources: [
      {
        type: "arcgis-rest",
        url: "https://api.milton.ca/arcgis/rest/services/Datasets/Wards/MapServer",
        layer: 0,
        outSR: 4326,
        verified: true,
        verifiedAt: "2026-04-22",
        notes: "Milton's own ArcGIS server — confirmed on hub",
      },
    ],
  },

  {
    municipality: "Guelph",
    slug: "guelph",
    region: "Greater Golden Horseshoe",
    accentColor: "#34D399",
    accentStroke: "#059669",
    addressesApi: "/api/atlas/guelph-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=guelph-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Kitchener",
    slug: "kitchener",
    region: "Greater Golden Horseshoe",
    accentColor: "#FB923C",
    accentStroke: "#ea580c",
    addressesApi: "/api/atlas/kitchener-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=kitchener-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Cambridge",
    slug: "cambridge",
    region: "Greater Golden Horseshoe",
    accentColor: "#E879F9",
    accentStroke: "#c026d3",
    addressesApi: "/api/atlas/cambridge-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=cambridge-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Waterloo",
    slug: "waterloo",
    region: "Greater Golden Horseshoe",
    accentColor: "#4ADE80",
    accentStroke: "#16a34a",
    addressesApi: "/api/atlas/waterloo-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=waterloo-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Brantford",
    slug: "brantford",
    region: "Greater Golden Horseshoe",
    accentColor: "#F472B6",
    accentStroke: "#db2777",
    addressesApi: "/api/atlas/brantford-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=brantford-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Niagara Falls",
    slug: "niagara-falls",
    region: "Greater Golden Horseshoe",
    accentColor: "#60A5FA",
    accentStroke: "#2563eb",
    addressesApi: "/api/atlas/niagara-falls-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=niagara-falls-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Richmond Hill",
    slug: "richmond-hill",
    region: "GTA",
    accentColor: "#C084FC",
    accentStroke: "#9333ea",
    addressesApi: "/api/atlas/richmond-hill-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=richmond-hill-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  // ── Eastern Ontario ──────────────────────────────────────────────────────────

  {
    municipality: "Ottawa",
    slug: "ottawa",
    region: "Eastern Ontario",
    accentColor: "#E24B4A",
    accentStroke: "#b83a39",
    addressesApi: "/api/atlas/ottawa-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=ottawa-wards&limit=30&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Kingston",
    slug: "kingston",
    region: "Eastern Ontario",
    accentColor: "#A3E635",
    accentStroke: "#65a30d",
    addressesApi: "/api/atlas/kingston-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=kingston-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Belleville",
    slug: "belleville",
    region: "Eastern Ontario",
    accentColor: "#FBBF24",
    accentStroke: "#d97706",
    addressesApi: "/api/atlas/belleville-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=belleville-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Peterborough",
    slug: "peterborough",
    region: "Eastern Ontario",
    accentColor: "#FB7185",
    accentStroke: "#e11d48",
    addressesApi: "/api/atlas/peterborough-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=peterborough-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  // ── Northern Ontario ─────────────────────────────────────────────────────────

  {
    municipality: "Barrie",
    slug: "barrie",
    region: "Northern Ontario",
    accentColor: "#06B6D4",
    accentStroke: "#0891b2",
    addressesApi: "/api/atlas/barrie-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=barrie-wards&limit=20&format=json",
        verified: false,
      },
    ],
    addressSources: [
      {
        type: "arcgis-rest",
        url: "https://gispublic.barrie.ca/arcgis/rest/services/Open_Data/AddressVW/MapServer",
        layer: 0,
        outSR: 4326,
        verified: true,
        verifiedAt: "2026-04-22",
        notes: "Barrie's own ArcGIS server — confirmed on hub",
      },
    ],
  },

  {
    municipality: "Sudbury",
    slug: "sudbury",
    region: "Northern Ontario",
    accentColor: "#0A2342",
    accentStroke: "#061628",
    addressesApi: "/api/atlas/sudbury-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=sudbury-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Thunder Bay",
    slug: "thunder-bay",
    region: "Northern Ontario",
    accentColor: "#1D9E75",
    accentStroke: "#0d7a5a",
    addressesApi: "/api/atlas/thunder-bay-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=thunder-bay-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  // ── Southwestern Ontario ─────────────────────────────────────────────────────

  {
    municipality: "London",
    slug: "london",
    region: "Southwestern Ontario",
    accentColor: "#EF9F27",
    accentStroke: "#c47e12",
    addressesApi: "/api/atlas/london-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=london-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Windsor",
    slug: "windsor",
    region: "Southwestern Ontario",
    accentColor: "#6366F1",
    accentStroke: "#4f51c7",
    addressesApi: "/api/atlas/windsor-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=windsor-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },

  {
    municipality: "Sarnia",
    slug: "sarnia",
    region: "Southwestern Ontario",
    accentColor: "#8B5CF6",
    accentStroke: "#7040d4",
    addressesApi: "/api/atlas/sarnia-addresses",
    wardSources: [
      {
        type: "represent",
        url: "https://represent.opennorth.ca/boundaries/?sets=sarnia-wards&limit=20&format=json",
        verified: false,
      },
    ],
  },
];

/** Quick lookup by slug */
export function getWardAsset(slug: string): WardAssetEntry | undefined {
  return WARD_ASSET_REGISTRY.find((e) => e.slug === slug);
}

/** All municipalities that have at least one verified ward source */
export function getVerifiedMunicipalities(): WardAssetEntry[] {
  return WARD_ASSET_REGISTRY.filter((e) =>
    e.wardSources.some((s) => s.verified),
  );
}

/** All municipalities regardless of verification — for discovery reporting */
export function getAllMunicipalities(): WardAssetEntry[] {
  return WARD_ASSET_REGISTRY;
}
