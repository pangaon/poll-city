import { PrismaClient } from "@prisma/client";
import { scrapeToronto } from "./toronto";

const prisma = new PrismaClient();

function getArg(name: string): string | null {
  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL is not set");
    process.exit(1);
  }

  const municipality = getArg("municipality") ?? "toronto";
  const dryRun = hasFlag("dry-run");

  console.log(`[scraper] Starting run — municipality=${municipality} dryRun=${dryRun}`);

  const SCRAPERS: Record<string, () => Promise<{ candidates: unknown[]; sourceUrl: string }>> = {
    toronto: scrapeToronto,
  };

  const scraperFn = SCRAPERS[municipality.toLowerCase()];
  if (!scraperFn) {
    console.error(`ERROR: No scraper implemented for "${municipality}". Available: ${Object.keys(SCRAPERS).join(", ")}`);
    process.exit(1);
  }

  let run = await prisma.muniScrapeRun.create({
    data: {
      municipality,
      province: "ON",
      sourceUrl: "pending",
      strategy: "ckan",
      status: "running",
    },
  });

  console.log(`[scraper] Run record created: ${run.id}`);

  try {
    const { candidates, sourceUrl } = await scraperFn() as { candidates: Array<{
      candidateName: string;
      office: string;
      ward: string | null;
      wardNumber: number | null;
      municipality: string;
      province: string;
      electionYear: number;
      rawData: Record<string, unknown>;
    }>; sourceUrl: string };

    await prisma.muniScrapeRun.update({
      where: { id: run.id },
      data: { sourceUrl },
    });

    console.log(`[scraper] Found ${candidates.length} candidates from ${sourceUrl}`);

    if (!dryRun && candidates.length > 0) {
      const BATCH = 100;
      let inserted = 0;
      for (let i = 0; i < candidates.length; i += BATCH) {
        const batch = candidates.slice(i, i + BATCH);
        await prisma.rawMuniCandidate.createMany({
          data: batch.map((c) => ({
            runId: run.id,
            municipality: c.municipality,
            province: c.province,
            electionYear: c.electionYear,
            office: c.office,
            ward: c.ward,
            wardNumber: c.wardNumber,
            candidateName: c.candidateName,
            rawData: c.rawData,
          })),
          skipDuplicates: true,
        });
        inserted += batch.length;
        console.log(`[scraper] Inserted batch ${Math.ceil((i + 1) / BATCH)}: ${inserted}/${candidates.length}`);
      }
    } else if (dryRun) {
      console.log("[scraper] Dry run — skipping DB inserts");
    }

    await prisma.muniScrapeRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        rawCount: dryRun ? candidates.length : candidates.length,
        completedAt: new Date(),
      },
    });

    console.log(`[scraper] Run completed successfully. rawCount=${candidates.length}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[scraper] Run failed: ${message}`);
    await prisma.muniScrapeRun.update({
      where: { id: run.id },
      data: { status: "failed", error: message, completedAt: new Date() },
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
