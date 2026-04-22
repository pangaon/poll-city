import { NextResponse } from "next/server";
import * as shapefile from "shapefile";
import unzipper from "unzipper";

export const maxDuration = 60;

const CKAN_PACKAGE_URL =
  "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=elections-school-ward";

type CKANResource = { format: string; url: string; name: string };
type CKANPackage = {
  success: boolean;
  result: { resources: CKANResource[] };
};

// The four Toronto school boards and how to identify their SHP resource in CKAN
const BOARDS = [
  {
    key: "tdsb",
    label: "Toronto District School Board",
    match: (name: string) => name.includes("toronto-district-school-board") && !name.includes("catholic"),
    color: "#0EA5E9",
    stroke: "#0284c7",
  },
  {
    key: "tcdsb",
    label: "Toronto Catholic District School Board",
    match: (name: string) => name.includes("toronto-catholic-district-school-board"),
    color: "#8B5CF6",
    stroke: "#7040d4",
  },
  {
    key: "viamonde",
    label: "Conseil scolaire de viamonde",
    match: (name: string) => name.includes("viamonde"),
    color: "#10B981",
    stroke: "#059669",
  },
  {
    key: "csdc",
    label: "Conseil scolaire catholique Centre-Sud",
    match: (name: string) => name.includes("catholique-centre-sud"),
    color: "#F59E0B",
    stroke: "#d97706",
  },
] as const;

type BoardKey = (typeof BOARDS)[number]["key"];

function extractWardName(props: Record<string, unknown>, index: number, boardKey: BoardKey): string {
  // Try common field names used in Toronto SHP exports
  const raw = String(
    props["Name"] ?? props["NAME"] ?? props["WARD_NAME"] ?? props["DISTRICT_NAME"] ??
    props["WARD"] ?? props["DISTRICT"] ?? props["Trustee_Name"] ?? "",
  ).trim();
  if (raw) return raw;
  const num = props["WARD_NO"] ?? props["WARD_NUM"] ?? props["OBJECTID"];
  if (num != null) return `${boardKey.toUpperCase()} Ward ${num}`;
  return `Ward ${index + 1}`;
}

async function parseShpZip(
  zipUrl: string,
  boardKey: BoardKey,
  boardLabel: string,
  boardColor: string,
  boardStroke: string,
  baseIndex: number,
): Promise<Array<unknown>> {
  const res = await fetch(zipUrl, {
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "PollCity/1.0 (contact@poll.city)", Accept: "*/*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${zipUrl}`);

  const raw = await res.arrayBuffer();
  const zipBuf = Buffer.from(raw);
  const dir = await unzipper.Open.buffer(zipBuf);

  const shpEntry = dir.files.find(f => f.path.toLowerCase().endsWith(".shp"));
  const dbfEntry = dir.files.find(f => f.path.toLowerCase().endsWith(".dbf"));
  if (!shpEntry || !dbfEntry) throw new Error(`Missing .shp or .dbf in ${zipUrl}`);

  const [shpBuf, dbfBuf] = await Promise.all([shpEntry.buffer(), dbfEntry.buffer()]);

  // Slice to correct ArrayBuffer view (handles Buffer byteOffset)
  const shpAB = shpBuf.buffer.slice(shpBuf.byteOffset, shpBuf.byteOffset + shpBuf.byteLength);
  const dbfAB = dbfBuf.buffer.slice(dbfBuf.byteOffset, dbfBuf.byteOffset + dbfBuf.byteLength);

  const collection = await shapefile.read(shpAB as ArrayBuffer, dbfAB as ArrayBuffer);

  return collection.features.map((f, i) => {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const wardIdx = baseIndex + i;
    return {
      ...f,
      properties: {
        ...props,
        wardId: wardIdx,
        wardIndex: i,
        wardName: extractWardName(props, i, boardKey),
        boardKey,
        boardLabel,
        boardColor,
        boardStroke,
      },
    };
  });
}

export async function GET() {
  // Fetch CKAN package to get resource download URLs
  let resources: CKANResource[] = [];
  try {
    const pkgRes = await fetch(CKAN_PACKAGE_URL, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (pkgRes.ok) {
      const pkg = (await pkgRes.json()) as CKANPackage;
      if (pkg.success) resources = pkg.result.resources;
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch Toronto school ward package from CKAN" },
      { status: 502 },
    );
  }

  // Map each board to its 2018 SHP resource (prefer december-2018, not 2014)
  const boardJobs = BOARDS.map(board => {
    const resource = resources.find(
      r =>
        r.format.toUpperCase() === "SHP" &&
        board.match(r.name) &&
        r.name.includes("2018"),
    );
    return { board, resource };
  }).filter(j => j.resource != null) as Array<{
    board: (typeof BOARDS)[number];
    resource: CKANResource;
  }>;

  if (boardJobs.length === 0) {
    return NextResponse.json(
      { error: "No 2018 school ward SHP resources found in CKAN" },
      { status: 502 },
    );
  }

  // Parse all boards in parallel
  let baseIndex = 0;
  const boardResults = await Promise.allSettled(
    boardJobs.map(async ({ board, resource }) => {
      const start = baseIndex;
      baseIndex += 20; // generous stride between boards so wardId is unique
      return parseShpZip(resource.url, board.key, board.label, board.color, board.stroke, start);
    }),
  );

  const allFeatures: unknown[] = [];
  const errors: string[] = [];
  for (const r of boardResults) {
    if (r.status === "fulfilled") {
      allFeatures.push(...r.value);
    } else {
      errors.push(String(r.reason));
    }
  }

  if (allFeatures.length === 0) {
    return NextResponse.json(
      { error: `All school board SHP fetches failed: ${errors.join("; ")}` },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      type: "FeatureCollection",
      features: allFeatures,
      meta: {
        count: allFeatures.length,
        boards: boardJobs.map(j => j.board.key),
        errors: errors.length > 0 ? errors : undefined,
      },
    },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } },
  );
}
