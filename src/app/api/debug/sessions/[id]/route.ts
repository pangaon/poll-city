import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { validateDebugAccess } from "@/lib/debug/access";

const updateSessionSchema = z.object({
  title: z.string().trim().max(120).optional(),
  status: z.string().trim().min(1).max(30).optional(),
});

function debugNotFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

async function getOwnedSessionId(req: NextRequest, id: string): Promise<string | null> {
  const access = await validateDebugAccess(req);
  if (!access.ok) return null;

  const session = await prisma.debugSession.findFirst({
    where: { id, userId: access.userId },
    select: { id: true },
  });

  return session?.id ?? null;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ownedId = await getOwnedSessionId(req, params.id);
  if (!ownedId) return debugNotFound();

  const session = await prisma.debugSession.findUnique({
    where: { id: ownedId },
    include: {
      notes: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ data: session, notes: session?.notes ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ownedId = await getOwnedSessionId(req, params.id);
  if (!ownedId) return debugNotFound();

  const raw = await req.json().catch(() => ({}));
  const parsed = updateSessionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updated = await prisma.debugSession.update({
    where: { id: ownedId },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title || null } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.status === "complete" ? { completedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ownedId = await getOwnedSessionId(req, params.id);
  if (!ownedId) return debugNotFound();

  await prisma.debugSession.delete({ where: { id: ownedId } });
  return NextResponse.json({ ok: true });
}
