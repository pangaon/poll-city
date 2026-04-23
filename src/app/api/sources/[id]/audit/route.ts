import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: import("next-auth").Session | null) {
  if (!session) return false;
  const user = session.user as typeof session.user & { role?: string };
  return user?.role === "SUPER_ADMIN";
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(100, parseInt(sp.get("limit") ?? "50", 10));

  const logs = await prisma.sourceAuditLog.findMany({
    where: { sourceId: params.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      actorId: true,
      actorRole: true,
      notes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ logs });
}
