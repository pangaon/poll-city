import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { validateDebugAccess } from "@/lib/debug/access";

export const dynamic = "force-dynamic";

const createSessionSchema = z.object({
  title: z.string().trim().max(120).optional(),
});

function debugNotFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(req: NextRequest) {
  const access = await validateDebugAccess(req);
  if (!access.ok) return debugNotFound();

  if (req.nextUrl.searchParams.get("check") === "true") {
    return NextResponse.json({ ok: true });
  }

  const sessions = await prisma.debugSession.findMany({
    where: { userId: access.userId },
    include: {
      _count: {
        select: { notes: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: sessions });
}

export async function POST(req: NextRequest) {
  const access = await validateDebugAccess(req);
  if (!access.ok) return debugNotFound();

  const raw = await req.json().catch(() => ({}));
  const parsed = createSessionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const session = await prisma.debugSession.create({
    data: {
      userId: access.userId,
      title: parsed.data.title || null,
    },
  });

  return NextResponse.json({ data: session, id: session.id }, { status: 201 });
}
