import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { z } from "zod";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "contacts:read");
  if (permError) return permError;

  const questions = await prisma.publicQuestion.findMany({
    where: { officialId: params.id, isPublic: true },
    orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: { user: { select: { name: true } } },
  });
  return NextResponse.json({ data: questions });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = z.object({ question: z.string().min(5).max(1000) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  const official = await prisma.official.findUnique({ where: { id: params.id } });
  if (!official) return NextResponse.json({ error: "Official not found" }, { status: 404 });

  const question = await prisma.publicQuestion.create({
    data: { userId: session!.user.id, officialId: params.id, question: parsed.data.question },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({ data: question }, { status: 201 });
}
