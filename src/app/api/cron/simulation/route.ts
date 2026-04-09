/**
 * Cron: Simulation Engine
 * Drips realistic interaction data into all active demo campaigns.
 * Schedule: every 5 minutes (see vercel.json)
 * Auth: CRON_SECRET header required.
 *
 * Kill switch: set SIMULATION_ENABLED=false in env to halt all runs.
 * Hard guard: only campaigns with isDemo=true are touched.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { runSimulation, isSimulationEnabled } from "@/lib/simulation/engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured — endpoint locked" }, { status: 503 });
  }
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSimulationEnabled()) {
    return NextResponse.json({ skipped: true, reason: "SIMULATION_ENABLED=false" });
  }

  // Find all active demo campaigns
  const demoCampaigns = await prisma.campaign.findMany({
    where: { isDemo: true, isActive: true },
    select: { id: true },
  });

  if (demoCampaigns.length === 0) {
    return NextResponse.json({ ran: 0, results: [] });
  }

  const results = await Promise.all(
    demoCampaigns.map((c) => runSimulation(c.id)),
  );

  const totalCreated = results.reduce((s, r) => s + r.created, 0);

  return NextResponse.json({
    ran: demoCampaigns.length,
    totalCreated,
    results,
  });
}
