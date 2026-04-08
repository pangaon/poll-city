import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { seedAutonomousSources } from "@/lib/autonomous/seed-sources";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = session.user as typeof session.user & { role?: string };
  if (user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await seedAutonomousSources();

  return NextResponse.json({
    success: true,
    created: result.created,
    updated: result.updated,
    total: result.total,
    message: `Seeded ${result.total} sources: ${result.created} created, ${result.updated} updated.`,
  });
}
