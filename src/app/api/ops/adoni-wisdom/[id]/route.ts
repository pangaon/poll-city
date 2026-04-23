/**
 * PATCH /api/ops/adoni-wisdom/[id] — update (toggle active, edit content)
 * DELETE /api/ops/adoni-wisdom/[id] — delete
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  const entry = await (prisma as unknown as {
    founderWisdom: { update: (args: unknown) => Promise<unknown> }
  }).founderWisdom.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ entry });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin();
  if (guard) return guard;

  await (prisma as unknown as {
    founderWisdom: { delete: (args: unknown) => Promise<unknown> }
  }).founderWisdom.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
