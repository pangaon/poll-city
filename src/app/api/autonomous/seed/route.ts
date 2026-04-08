import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { seedAutonomousSources } from "@/lib/autonomous/seed-sources";
import prisma from "@/lib/db/prisma";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "auth");
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = session.user as typeof session.user & { role?: string };
  if (user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await seedAutonomousSources();

  const userId = (session.user as typeof session.user & { id?: string }).id ?? "unknown";
  audit(prisma, "autonomous.sources.seeded", {
    campaignId: "system",
    userId,
    entityId: "autonomous-sources",
    entityType: "AutonomousSource",
    ip: req.headers.get("x-forwarded-for"),
    details: { created: result.created, updated: result.updated, total: result.total },
  });

  return NextResponse.json({
    success: true,
    created: result.created,
    updated: result.updated,
    total: result.total,
    message: `Seeded ${result.total} sources: ${result.created} created, ${result.updated} updated.`,
  });
}
