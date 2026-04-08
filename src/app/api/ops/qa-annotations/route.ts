import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const SUPER_ADMIN = "SUPER_ADMIN";

const createSchema = z.object({
  pagePath: z.string().min(1).max(500),
  posX: z.number().min(0).max(1),
  posY: z.number().min(0).max(1),
  elementSelector: z.string().max(500).optional(),
  elementText: z.string().max(500).optional(),
  issueType: z.enum(["bug", "ux", "copy", "design", "missing", "broken", "question", "positive"]),
  severity: z.enum(["critical", "high", "medium", "low", "note"]),
  notes: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  const statusFilter = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (path) where.pagePath = path;
  if (statusFilter) where.status = statusFilter;

  const annotations = await prisma.qaAnnotation.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json({ data: annotations });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const annotation = await prisma.qaAnnotation.create({
    data: {
      ...parsed.data,
      createdByUserId: session!.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: annotation }, { status: 201 });
}
