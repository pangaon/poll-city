import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ingestAllMunicipalities } from "@/lib/atlas/ward-ingestor";

// Daily cron: refreshes ward boundaries from source APIs into DB
// Vercel cron schedule: "0 3 * * *" (3am daily)
// Authorization: Bearer CRON_SECRET
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = new Date().toISOString();
  const results = await ingestAllMunicipalities();

  // "upserted" = Prisma upsert ran (data may or may not have changed at source)
  // "failed" = all sources returned errors or 0 features
  const upserted = results.filter((r) => r.count > 0).map((r) => ({ municipality: r.municipality, wards: r.count, source: r.sourceType }));
  const failed   = results.filter((r) => r.count === 0).map((r) => ({ municipality: r.municipality, error: r.error }));

  return NextResponse.json({ started, upserted, failed, total: upserted.reduce((s, r) => s + r.wards, 0) });
}
