/**
 * GET  /api/ops/adoni-wisdom   — list all wisdom entries
 * POST /api/ops/adoni-wisdom   — create a new wisdom entry
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

const CATEGORIES = ["canvassing", "signs", "gotv", "fundraising", "volunteers", "platform", "general"] as const;

const createSchema = z.object({
  category: z.enum(CATEGORIES),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).optional().default([]),
  sortOrder: z.number().int().optional().default(0),
});

async function requireSuperAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(req: NextRequest) {
  const guard = await requireSuperAdmin(req);
  if (guard) return guard;

  const entries = await (prisma as unknown as {
    founderWisdom: { findMany: (args: unknown) => Promise<unknown[]> }
  }).founderWisdom.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const guard = await requireSuperAdmin(req);
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error", issues: parsed.error.issues }, { status: 400 });

  const entry = await (prisma as unknown as {
    founderWisdom: { create: (args: unknown) => Promise<unknown> }
  }).founderWisdom.create({
    data: {
      category: parsed.data.category,
      title: parsed.data.title,
      content: parsed.data.content,
      tags: parsed.data.tags,
      sortOrder: parsed.data.sortOrder,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
