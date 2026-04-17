import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: import("next-auth").Session | null): session is import("next-auth").Session {
  if (!session) return false;
  const u = session.user;
  return u?.role === "SUPER_ADMIN";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "articles"; // "articles" | "signals"
  const reviewStatus = searchParams.get("reviewStatus");
  const dataSourceId = searchParams.get("dataSourceId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25", 10)));

  if (view === "signals") {
    const where = {
      ...(reviewStatus ? { reviewStatus: reviewStatus as "unreviewed" | "in_review" | "accepted" | "rejected" } : {}),
    };
    const [total, signals] = await Promise.all([
      prisma.newsSignal.count({ where }),
      prisma.newsSignal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          article: { select: { title: true, url: true, publishedAt: true, dataSource: { select: { name: true } } } },
          candidateLead: { select: { id: true, verificationStatus: true } },
        },
      }),
    ]);
    return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), signals });
  }

  // Default: articles view
  const where = {
    ...(dataSourceId ? { dataSourceId } : {}),
  };
  const [total, articles] = await Promise.all([
    prisma.newsArticle.count({ where }),
    prisma.newsArticle.findMany({
      where,
      orderBy: { fetchedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        url: true,
        publishedAt: true,
        fetchedAt: true,
        author: true,
        dataSource: { select: { name: true } },
        _count: { select: { signals: true } },
      },
    }),
  ]);
  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), articles });
}
