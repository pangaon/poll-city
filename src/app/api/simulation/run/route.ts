/**
 * POST /api/simulation/run — trigger a simulation batch on a demo campaign.
 * SUPER_ADMIN only. Only runs on isDemo=true campaigns.
 *
 * Body: { campaignId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { runSimulation, isSimulationEnabled } from "@/lib/simulation/engine";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Body = z.object({ campaignId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "SUPER_ADMIN only" }, { status: 403 });
  }

  if (!isSimulationEnabled()) {
    return NextResponse.json({ error: "Simulation disabled — SIMULATION_ENABLED=false" }, { status: 403 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "campaignId required" }, { status: 422 });

  // Hard guard: verify the campaign is actually a demo campaign.
  // SUPER_ADMIN role is not sufficient — simulation must never touch real campaign data.
  const campaign = await prisma.campaign.findUnique({
    where: { id: parsed.data.campaignId },
    select: { isDemo: true },
  });
  if (!campaign?.isDemo) {
    return NextResponse.json(
      { error: "Simulation can only run on demo campaigns (isDemo=true). This campaign is real — refusing." },
      { status: 403 },
    );
  }

  const result = await runSimulation(parsed.data.campaignId);
  return NextResponse.json(result);
}
