/**
 * One-time import: Statistics Canada 2021 Dissemination Area boundaries + demographics
 *
 * Downloads:
 *   - DA boundary GeoJSON (via StatsCan open data)
 *   - 2021 Census profile CSV (98-401-X2021001) — Ontario DAs only
 *
 * Run:  npx tsx scripts/import-statcan-da.ts
 *
 * Takes ~20-40 min on first run. Safe to re-run (upserts by daCode).
 * Filters to Ontario (province code 35) to keep DB manageable.
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import * as unzipper from "unzipper";
import Papa from "papaparse";

const prisma = new PrismaClient();

const CACHE_DIR = path.join(process.cwd(), ".statcan-cache");

// StatsCan 2021 DA boundaries — lda_000b21a_e GeoJSON (province files)
// Ontario = PR_UID 35 — use the full national file filtered to ON
const BOUNDARY_URL =
  "https://www12.statcan.gc.ca/census-recensement/2021/geo/shr-fsd/boundary-limites/files-fichiers/lda_000b21a_e.zip";

// 2021 Census profile — Ontario DAs (large file, ~800 MB unzipped)
const PROFILE_URL =
  "https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger.cfm?Lang=E&Tab=1&Geo1=DA&Code1=35&Geo2=PR&Code2=35&SearchText=Ontario&type=0";

const BATCH_SIZE = 200;

async function downloadFile(url: string, dest: string): Promise<void> {
  if (fs.existsSync(dest)) {
    console.log(`  Cached: ${path.basename(dest)}`);
    return;
  }
  console.log(`  Downloading: ${path.basename(dest)}`);
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const proto = url.startsWith("https") ? https : http;

    const request = (u: string) => {
      proto.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          const newFile = fs.createWriteStream(dest);
          request(res.headers.location!);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        const total = parseInt(res.headers["content-length"] ?? "0", 10);
        let downloaded = 0;
        res.on("data", (chunk: Buffer) => {
          downloaded += chunk.length;
          if (total > 0) {
            process.stdout.write(`\r    ${((downloaded / total) * 100).toFixed(1)}%`);
          }
        });
        res.pipe(file);
        res.on("end", () => { console.log(""); resolve(); });
        res.on("error", reject);
      }).on("error", reject);
    };

    request(url);
    file.on("error", reject);
  });
}

interface DaProfileRow {
  daCode: string;
  municipality: string;
  medianIncome: number;
  medianAge: number;
  englishPct: number;
  frenchPct: number;
  immigrantPct: number;
  renterPct: number;
  population: number;
}

async function loadProfile(csvPath: string): Promise<Map<string, DaProfileRow>> {
  console.log("\nParsing census profile CSV…");
  const map = new Map<string, DaProfileRow>();

  const content = fs.readFileSync(csvPath, "utf8");

  await new Promise<void>((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      step: (row: { data: Record<string, string> }) => {
        const d = row.data;
        // Column names in 98-401-X2021001 CSV
        const geoCode = (d["GEO_CODE (POR)"] ?? d["GEO_CODE"] ?? "").replace(/\D/g, "");
        const geoLevel = d["GEO_LEVEL"] ?? "";
        if (geoLevel !== "Dissemination area" && geoLevel !== "DA") return;
        if (!geoCode || geoCode.length < 7) return;

        const charId = d["CHARACTERISTIC_ID"] ?? "";
        const value = parseFloat(d["C1_COUNT_TOTAL"] ?? d["VALUE"] ?? "0") || 0;

        if (!map.has(geoCode)) {
          map.set(geoCode, {
            daCode: geoCode,
            municipality: (d["ALT_GEO_CODE"] ?? d["GEO_NAME"] ?? "").split(",")[0].trim(),
            medianIncome: 0,
            medianAge: 0,
            englishPct: 0,
            frenchPct: 0,
            immigrantPct: 0,
            renterPct: 0,
            population: 0,
          });
        }

        const rec = map.get(geoCode)!;

        // Characteristic IDs from 2021 Census profile
        switch (charId) {
          case "1":    rec.population = value; break;        // Total population
          case "20":   rec.medianAge = value; break;         // Median age
          case "234":  rec.medianIncome = value; break;      // Median total income
          case "1355": rec.englishPct = value; break;        // English only (% of pop who speak English)
          case "1356": rec.frenchPct = value; break;         // French only
          case "1454": rec.immigrantPct = value; break;      // Immigrants (%)
          case "1676": rec.renterPct = value; break;         // Renter households (%)
        }
      },
      complete: () => resolve(),
      error: reject,
    });
  });

  console.log(`  Loaded ${map.size.toLocaleString()} DA profile rows`);
  return map;
}

interface GeoJsonFeature {
  type: "Feature";
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, string | number | null>;
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

async function importBoundaries(
  geojsonPath: string,
  profileMap: Map<string, DaProfileRow>
): Promise<void> {
  console.log("\nImporting DA boundaries…");

  const raw = fs.readFileSync(geojsonPath, "utf8");
  const fc = JSON.parse(raw) as GeoJsonFeatureCollection;

  const features = fc.features.filter((f) => {
    const pruid = String(f.properties["PRUID"] ?? f.properties["pruid"] ?? "");
    return pruid === "35"; // Ontario only
  });

  console.log(`  Ontario DAs in boundary file: ${features.length.toLocaleString()}`);

  let inserted = 0;
  let batch: Parameters<typeof prisma.disseminationArea.upsert>[0]["create"][] = [];

  for (const feature of features) {
    const daCode = String(
      feature.properties["DAUID"] ??
      feature.properties["dauid"] ??
      feature.properties["DGUID"] ??
      ""
    ).replace(/\D/g, "").slice(-7);

    if (!daCode) continue;

    const profile = profileMap.get(daCode) ?? null;

    batch.push({
      daCode,
      municipality: profile?.municipality ?? String(feature.properties["CSDNAME"] ?? "Ontario"),
      province: "ON",
      medianIncome: profile?.medianIncome ?? 0,
      medianAge: profile?.medianAge ?? 0,
      englishPct: profile?.englishPct ?? 0,
      frenchPct: profile?.frenchPct ?? 0,
      immigrantPct: profile?.immigrantPct ?? 0,
      renterPct: profile?.renterPct ?? 0,
      population: profile?.population ?? 0,
      boundaryGeoJson: feature as unknown as Parameters<typeof prisma.disseminationArea.upsert>[0]["create"]["boundaryGeoJson"],
    });

    if (batch.length >= BATCH_SIZE) {
      await flushDaBatch(batch);
      inserted += batch.length;
      batch = [];
      process.stdout.write(`\r  Upserted: ${inserted.toLocaleString()}`);
    }
  }

  if (batch.length) {
    await flushDaBatch(batch);
    inserted += batch.length;
  }

  console.log(`\n  Done. Total upserted: ${inserted.toLocaleString()}`);
}

async function flushDaBatch(
  rows: Parameters<typeof prisma.disseminationArea.upsert>[0]["create"][]
) {
  await Promise.all(
    rows.map((r) =>
      prisma.disseminationArea.upsert({
        where: { daCode: r.daCode },
        create: r,
        update: {
          municipality: r.municipality,
          medianIncome: r.medianIncome,
          medianAge: r.medianAge,
          englishPct: r.englishPct,
          frenchPct: r.frenchPct,
          immigrantPct: r.immigrantPct,
          renterPct: r.renterPct,
          population: r.population,
          boundaryGeoJson: r.boundaryGeoJson,
        },
      })
    )
  );
}

async function unzipBoundary(zipPath: string, outDir: string): Promise<string> {
  console.log("  Extracting boundary zip…");
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: outDir }))
    .promise();

  const files = fs.readdirSync(outDir);
  const geojson = files.find((f) => f.endsWith(".geojson") || f.endsWith(".json"));
  if (geojson) return path.join(outDir, geojson);

  // If only shapefile extracted, note that and return empty string (needs shapefile pkg)
  console.warn("  No GeoJSON found in zip. Boundary import skipped.");
  return "";
}

async function main() {
  console.log("=== StatsCan DA Import — Ontario 2021 Census ===\n");

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  const boundaryZip = path.join(CACHE_DIR, "lda_000b21a_e.zip");
  const boundaryDir = path.join(CACHE_DIR, "boundaries");
  const profileCsv = path.join(CACHE_DIR, "98-401-X2021001_Ontario_DA.csv");

  // 1. Download boundary file
  console.log("Step 1: DA Boundaries");
  await downloadFile(BOUNDARY_URL, boundaryZip);

  if (!fs.existsSync(boundaryDir)) {
    fs.mkdirSync(boundaryDir, { recursive: true });
  }

  const geojsonPath = await unzipBoundary(boundaryZip, boundaryDir);

  // 2. Download census profile
  console.log("\nStep 2: Census Profile (Ontario DAs)");
  if (!fs.existsSync(profileCsv)) {
    console.log(`  Census profile must be manually downloaded from StatsCan.`);
    console.log(`  URL: https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/download-telecharger.cfm`);
    console.log(`  Select: Geography=Dissemination area, Province=Ontario`);
    console.log(`  Save as: ${profileCsv}`);
    console.log(`\n  Proceeding with boundaries only (no demographic enrichment)…`);
  }

  const profileMap = fs.existsSync(profileCsv)
    ? await loadProfile(profileCsv)
    : new Map<string, DaProfileRow>();

  // 3. Import boundaries
  if (geojsonPath) {
    await importBoundaries(geojsonPath, profileMap);
  } else {
    console.log("\nBoundary GeoJSON not found — import incomplete.");
    console.log("The boundary ZIP likely contains shapefiles (.shp). Convert to GeoJSON with:");
    console.log("  npx mapshaper lda_000b21a_e.shp -o format=geojson lda_000b21a_e.geojson");
    console.log(`  Then move lda_000b21a_e.geojson into: ${boundaryDir}`);
    console.log("  Then re-run this script.");
  }

  await prisma.$disconnect();
  console.log("\n=== Import complete ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
