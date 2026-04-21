/**
 * One-time import: Ontario Road Network Address Points (MPAC)
 *
 * Source: https://data.ontario.ca/dataset/ontario-road-network-address-points
 * Run:    npx tsx scripts/import-mpac.ts
 *
 * This downloads the full Ontario address CSV and bulk-upserts into MpacAddress.
 * Takes 30-90 min on first run depending on connection speed (~2-4 GB CSV).
 * Safe to re-run — upserts by civic+street+municipality.
 */

import { PrismaClient } from "@prisma/client";
import Papa from "papaparse";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import { createWriteStream } from "fs";

const prisma = new PrismaClient();

// Ontario Open Data — Road Network Address Points CSV (direct dump)
const MPAC_URL =
  "https://data.ontario.ca/datastore/dump/31f8e45e-a151-4e35-8b2c-08d4e4ce5c43?bom=True";

const CACHE_PATH = path.join(process.cwd(), ".mpac-cache.csv");
const BATCH_SIZE = 500;

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`Downloading MPAC address file…`);
  console.log(`URL: ${url}`);
  console.log(`Destination: ${dest}`);

  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const proto = url.startsWith("https") ? https : http;

    const request = (redirectUrl: string) => {
      proto.get(redirectUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          request(res.headers.location!);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const total = parseInt(res.headers["content-length"] ?? "0", 10);
        let downloaded = 0;
        res.on("data", (chunk: Buffer) => {
          downloaded += chunk.length;
          if (total > 0) {
            const pct = ((downloaded / total) * 100).toFixed(1);
            process.stdout.write(`\r  ${pct}% (${(downloaded / 1024 / 1024).toFixed(0)} MB)`);
          }
        });
        res.pipe(file);
        res.on("end", () => {
          console.log("\n  Download complete.");
          resolve();
        });
        res.on("error", reject);
      });
    };

    request(url);
    file.on("error", reject);
  });
}

async function importMpac() {
  console.log("=== MPAC Ontario Address Import ===\n");

  if (!fs.existsSync(CACHE_PATH)) {
    await downloadFile(MPAC_URL, CACHE_PATH);
  } else {
    console.log(`Using cached file: ${CACHE_PATH}`);
  }

  const stat = fs.statSync(CACHE_PATH);
  console.log(`File size: ${(stat.size / 1024 / 1024).toFixed(0)} MB`);

  let inserted = 0;
  let skipped = 0;
  let batch: Array<{
    civic: number;
    street: string;
    municipality: string;
    province: string;
    postalCode: string;
    lat: number;
    lng: number;
    fullAddress: string;
  }> = [];

  const stream = fs.createReadStream(CACHE_PATH, { encoding: "utf8" });

  await new Promise<void>((resolve, reject) => {
    Papa.parse(stream, {
      header: true,
      skipEmptyLines: true,
      step: async (row: { data: Record<string, string>; errors: unknown[] }) => {
        const d = row.data;

        // Column names vary by version — try common variants
        const civic = parseInt(
          d["CIVIC_NUMBER"] ?? d["ADDR_NUM"] ?? d["civic"] ?? "0",
          10
        );
        const street = (
          d["STREET_FULL_NAME"] ??
          d["STREET_NAME"] ??
          d["street"] ??
          ""
        ).trim();
        const municipality = (
          d["MUNICIPALITY"] ??
          d["CITY"] ??
          d["municipality"] ??
          ""
        ).trim();
        const postalCode = (d["POSTAL_CODE"] ?? d["postal_code"] ?? "").trim();
        const lat = parseFloat(d["LATITUDE"] ?? d["lat"] ?? "0");
        const lng = parseFloat(d["LONGITUDE"] ?? d["lon"] ?? d["lng"] ?? "0");

        if (!civic || !street || !municipality) {
          skipped++;
          return;
        }

        batch.push({
          civic,
          street,
          municipality,
          province: "ON",
          postalCode,
          lat: isNaN(lat) ? 0 : lat,
          lng: isNaN(lng) ? 0 : lng,
          fullAddress: `${civic} ${street}, ${municipality}, ON ${postalCode}`.trim(),
        });

        if (batch.length >= BATCH_SIZE) {
          const toFlush = batch.splice(0, BATCH_SIZE);
          try {
            await prisma.mpacAddress.createMany({ data: toFlush, skipDuplicates: true });
            inserted += toFlush.length;
            process.stdout.write(`\r  Inserted: ${inserted.toLocaleString()} | Skipped: ${skipped.toLocaleString()}`);
          } catch (e) {
            console.error("\nBatch error:", e);
          }
        }
      },
      complete: async () => {
        if (batch.length > 0) {
          try {
            await prisma.mpacAddress.createMany({ data: batch, skipDuplicates: true });
            inserted += batch.length;
          } catch (e) {
            console.error("Final batch error:", e);
          }
        }
        resolve();
      },
      error: reject,
    });
  });

  console.log(`\n\n=== Done ===`);
  console.log(`Total inserted: ${inserted.toLocaleString()}`);
  console.log(`Total skipped:  ${skipped.toLocaleString()}`);
  await prisma.$disconnect();
}

importMpac().catch((e) => {
  console.error(e);
  process.exit(1);
});
