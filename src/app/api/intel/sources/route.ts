import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: import("next-auth").Session | null): session is import("next-auth").Session {
  if (!session) return false;
  const user = session.user as typeof session.user & { role?: string };
  return user?.role === "SUPER_ADMIN";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level");
  const detection = searchParams.get("detection");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10)));

  const where = {
    ...(level ? { jurisdictionLevel: level } : {}),
    ...(detection === "true" ? { candidateDetectionEnabled: true } : {}),
    ...(detection === "false" ? { candidateDetectionEnabled: false } : {}),
  };

  const [total, sources] = await Promise.all([
    prisma.dataSource.count({ where }),
    prisma.dataSource.findMany({
      where,
      orderBy: [{ priorityTier: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        jurisdictionLevel: true,
        jurisdictionName: true,
        municipality: true,
        sourceType: true,
        baseUrl: true,
        rssUrl: true,
        entityTypes: true,
        priorityTier: true,
        authorityScore: true,
        automationStatus: true,
        candidateDetectionEnabled: true,
        parserStrategy: true,
        isActive: true,
        lastCheckedAt: true,
        notes: true,
        createdAt: true,
        _count: { select: { newsArticles: true, candidateLeads: true, intelSourceHealths: true } },
      },
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), sources });
}

const CreateSourceSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  jurisdictionLevel: z.enum(["municipal", "provincial", "federal", "statistical"]),
  jurisdictionName: z.string().min(1),
  municipality: z.string().nullable().optional(),
  sourceType: z.enum(["api", "bulk_download", "rss", "manual_import", "news_api"]),
  platformType: z.string().default("custom"),
  baseUrl: z.string().url(),
  rssUrl: z.string().url().nullable().optional(),
  entityTypes: z.array(z.string()).default([]),
  priorityTier: z.number().int().min(1).max(3).default(2),
  authorityScore: z.number().min(0).max(1).default(0.5),
  candidateDetectionEnabled: z.boolean().default(false),
  parserStrategy: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = CreateSourceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const user = session!.user as { id?: string };

  const source = await prisma.dataSource.create({ data: parsed.data });

  audit(prisma, "cie.source.created", {
    campaignId: "system",
    userId: user.id ?? "unknown",
    entityId: source.id,
    entityType: "DataSource",
    ip: req.headers.get("x-forwarded-for"),
    details: { slug: source.slug },
  });

  return NextResponse.json({ source }, { status: 201 });
}
