import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ingestAllMunicipalities } from "@/lib/atlas/ward-ingestor";

// One-time seed endpoint — run once after `npx prisma db push`
// GET /api/atlas/seed-wards?secret=CRON_SECRET
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await ingestAllMunicipalities();

  const seeded   = results.filter((r) => r.count > 0);
  const failed   = results.filter((r) => r.count === 0);
  const total    = seeded.reduce((s, r) => s + r.count, 0);

  return NextResponse.json({
    total,
    seeded: seeded.map((r) => ({ municipality: r.municipality, wards: r.count, source: r.sourceUrl })),
    failed: failed.map((r) => ({ municipality: r.municipality, error: r.error })),
  });
}
