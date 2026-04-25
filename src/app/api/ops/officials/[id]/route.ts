import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const PatchSchema = z.object({
  isActive: z.boolean().optional(),
  isClaimed: z.boolean().optional(),
  subscriptionStatus: z.enum(["free", "pro", "verified"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 422 });
  }

  const existing = await prisma.official.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.official.update({
    where: { id: params.id },
    data: parsed.data,
    select: { id: true, isActive: true, isClaimed: true, subscriptionStatus: true },
  });

  return NextResponse.json({ data: updated });
}
