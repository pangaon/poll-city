import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { z } from "zod";
import { getCampaignPacks, activatePack, deactivatePack } from "@/lib/sources/subscription-service";
import { listPacks } from "@/lib/sources/source-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const p = req.nextUrl.searchParams;
  const campaignId = p.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const view = p.get("view") ?? "available"; // "available" | "active"

  if (view === "active") {
    const activations = await getCampaignPacks(campaignId!);
    return NextResponse.json({ activations });
  }

  // Browse available packs
  const packs = await listPacks({
    municipality: p.get("municipality") || undefined,
    packType: p.get("packType") || undefined,
    isActive: true,
    search: p.get("search") || undefined,
  });

  return NextResponse.json({ packs });
}

const PackActionSchema = z.object({
  campaignId: z.string().min(1),
  packId: z.string().min(1),
  action: z.enum(["activate", "deactivate"]),
});

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = PackActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { campaignId, packId, action } = parsed.data;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:write");
  if (forbidden) return forbidden;

  try {
    if (action === "activate") {
      const result = await activatePack(campaignId, packId, session!.user.id);
      return NextResponse.json(result, { status: 201 });
    } else {
      await deactivatePack(campaignId, packId);
      return NextResponse.json({ success: true });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Pack operation failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
