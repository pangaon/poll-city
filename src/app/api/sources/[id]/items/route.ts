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

  const source = await prisma.platformSource.findUnique({ where: { id: params.id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(100, parseInt(sp.get("limit") ?? "25", 10));
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const processingStatus = sp.get("processingStatus") || undefined;

  const where = { sourceId: params.id, ...(processingStatus ? { processingStatus } : {}) };

  const [items, total] = await Promise.all([
    prisma.sourceItem.findMany({
      where,
      orderBy: { discoveredAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        excerpt: true,
        canonicalItemUrl: true,
        author: true,
        publishedAt: true,
        discoveredAt: true,
        itemType: true,
        fetchStatus: true,
        processingStatus: true,
        language: true,
      },
    }),
    prisma.sourceItem.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}
