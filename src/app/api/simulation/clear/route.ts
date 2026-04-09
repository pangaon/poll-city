/**
 * POST /api/simulation/clear — wipes all simulation data from a demo campaign.
 * SUPER_ADMIN only. Hard guard: campaign must have isDemo=true.
 * Use this before flagging a campaign as the first real customer.
 *
 * Body: { campaignId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { clearSimulation } from "@/lib/simulation/engine";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Body = z.object({ campaignId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "SUPER_ADMIN only" }, { status: 403 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "campaignId required" }, { status: 422 });

  try {
    const result = await clearSimulation(parsed.data.campaignId);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
