import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { seedCieSources } from "@/lib/intel/seed-sources";
import { audit } from "@/lib/audit";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "auth");
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = session.user as typeof session.user & { role?: string; id?: string };
  if (user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await seedCieSources();

  audit(prisma, "cie.sources.seeded", {
    campaignId: "system",
    userId: user.id ?? "unknown",
    entityId: "cie-sources",
    entityType: "DataSource",
    ip: req.headers.get("x-forwarded-for"),
    details: result as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ success: true, ...result });
}
