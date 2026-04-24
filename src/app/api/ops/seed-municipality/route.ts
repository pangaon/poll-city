import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiAuth } from "@/lib/auth/helpers";
import { ingestMunicipality } from "@/lib/atlas/ward-ingestor";
import { WARD_ASSET_REGISTRY } from "@/config/ward-asset-registry";

// Ward ingestion can take time — give it room
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const SeedBody = z.object({
  municipalityName: z.string().min(1).max(100).trim(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SeedBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { municipalityName } = parsed.data;

  // Find the matching entry in the registry (case-insensitive)
  const entry = WARD_ASSET_REGISTRY.find(
    (e) => e.municipality.toLowerCase() === municipalityName.toLowerCase()
  );

  if (!entry) {
    const known = WARD_ASSET_REGISTRY.map((e) => e.municipality);
    return NextResponse.json(
      {
        error: `Municipality "${municipalityName}" not found in Ward Asset Registry.`,
        knownMunicipalities: known,
      },
      { status: 404 }
    );
  }

  // Use the same globalIndexOffset strategy as ingestAllMunicipalities
  const globalIndexOffset = WARD_ASSET_REGISTRY.indexOf(entry) * 200;

  const result = await ingestMunicipality(entry, globalIndexOffset);

  const success = result.count > 0;
  const errors: string[] = [];
  if (result.error) errors.push(result.error);

  return NextResponse.json(
    {
      success,
      wardsLoaded: result.count,
      municipalityName: result.municipality,
      sourceUrl: result.sourceUrl,
      sourceType: result.sourceType,
      errors: errors.length > 0 ? errors : undefined,
    },
    { status: success ? 200 : 422 }
  );
}
