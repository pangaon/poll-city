import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const SUPER_ADMIN = "SUPER_ADMIN";

const patchSchema = z.object({
  status: z.enum(["open", "in_progress", "fixed", "wont_fix"]).optional(),
  notes: z.string().max(2000).optional(),
  severity: z.enum(["critical", "high", "medium", "low", "note"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const existing = await prisma.qaAnnotation.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isResolving =
    parsed.data.status &&
    ["fixed", "wont_fix"].includes(parsed.data.status) &&
    !["fixed", "wont_fix"].includes(existing.status);

  const updated = await prisma.qaAnnotation.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      ...(isResolving
        ? { resolvedByUserId: session!.user.id, resolvedAt: new Date() }
        : {}),
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.qaAnnotation.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.qaAnnotation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
