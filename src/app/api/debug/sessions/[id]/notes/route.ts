import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { validateDebugAccess } from "@/lib/debug/access";

const createNoteSchema = z.object({
  type: z.enum(["broken", "wrong", "adjust", "missing", "idea", "good"]),
  text: z.string().trim().min(1),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  url: z.string().url(),
  pagePath: z.string().trim().min(1),
  elementSelector: z.string().trim().max(300).optional().nullable(),
  elementText: z.string().trim().max(500).optional().nullable(),
  xPercent: z.number().min(0).max(100).optional().nullable(),
  yPercent: z.number().min(0).max(100).optional().nullable(),
  screenshotUrl: z.string().url().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
});

function debugNotFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await validateDebugAccess(req);
  if (!access.ok) return debugNotFound();

  const session = await prisma.debugSession.findFirst({
    where: { id: params.id, userId: access.userId },
    select: { id: true },
  });
  if (!session) return debugNotFound();

  const raw = await req.json().catch(() => null);
  const parsed = createNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const note = await prisma.debugNote.create({
    data: {
      sessionId: session.id,
      type: parsed.data.type,
      text: parsed.data.text,
      priority: parsed.data.priority,
      url: parsed.data.url,
      pagePath: parsed.data.pagePath,
      elementSelector: parsed.data.elementSelector ?? null,
      elementText: parsed.data.elementText ?? null,
      xPercent: parsed.data.xPercent ?? null,
      yPercent: parsed.data.yPercent ?? null,
      screenshotUrl: parsed.data.screenshotUrl ?? null,
      videoUrl: parsed.data.videoUrl ?? null,
    },
  });

  return NextResponse.json({ data: note }, { status: 201 });
}
