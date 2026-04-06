import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { validateDebugAccess } from "@/lib/debug/access";

const updateNoteSchema = z.object({
  type: z.enum(["broken", "wrong", "adjust", "missing", "idea", "good"]).optional(),
  text: z.string().trim().min(1).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  resolved: z.boolean().optional(),
  screenshotUrl: z.string().url().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
});

function debugNotFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

async function getOwnedNote(req: NextRequest, id: string): Promise<{ noteId: string; userId: string } | null> {
  const access = await validateDebugAccess(req);
  if (!access.ok) return null;

  const note = await prisma.debugNote.findFirst({
    where: {
      id,
      session: {
        userId: access.userId,
      },
    },
    select: { id: true },
  });

  if (!note) return null;
  return { noteId: note.id, userId: access.userId };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const owned = await getOwnedNote(req, params.id);
  if (!owned) return debugNotFound();

  const raw = await req.json().catch(() => ({}));
  const parsed = updateNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updated = await prisma.debugNote.update({
    where: { id: owned.noteId },
    data: {
      ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
      ...(parsed.data.text !== undefined ? { text: parsed.data.text } : {}),
      ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
      ...(parsed.data.screenshotUrl !== undefined ? { screenshotUrl: parsed.data.screenshotUrl } : {}),
      ...(parsed.data.videoUrl !== undefined ? { videoUrl: parsed.data.videoUrl } : {}),
      ...(parsed.data.resolved !== undefined
        ? {
            resolved: parsed.data.resolved,
            resolvedAt: parsed.data.resolved ? new Date() : null,
            resolvedBy: parsed.data.resolved ? owned.userId : null,
          }
        : {}),
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const owned = await getOwnedNote(req, params.id);
  if (!owned) return debugNotFound();

  await prisma.debugNote.delete({ where: { id: owned.noteId } });
  return NextResponse.json({ ok: true });
}
