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

  const updated   = results.filter((r) => r.count > 0).map((r) => r.municipality);
  const failed    = results.filter((r) => r.count === 0).map((r) => ({ municipality: r.municipality, error: r.error }));
  const unchanged = results.filter((r) => r.count > 0 && !r.error).map((r) => r.municipality);

  return NextResponse.json({ started, updated, failed, unchanged });
}
