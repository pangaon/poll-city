import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { z } from "zod";
import { getPackById, addSourceToPack, removeSourceFromPack } from "@/lib/sources/source-service";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: import("next-auth").Session | null) {
  if (!session) return false;
  const user = session.user as typeof session.user & { role?: string };
  return user?.role === "SUPER_ADMIN";
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pack = await getPackById(params.id);
  if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ pack });
}

const UpdatePackSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  municipality: z.string().optional(),
  geographyScope: z.string().optional(),
  officeScope: z.string().optional(),
  visibility: z.string().optional(),
  isActive: z.boolean().optional(),
  isRecommended: z.boolean().optional(),
}).strict();

const PackSourceSchema = z.object({
  action: z.enum(["add", "remove"]),
  sourceId: z.string().min(1),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);

  // Check if this is a source add/remove operation
  const sourceOp = PackSourceSchema.safeParse(body);
  if (sourceOp.success) {
    const { action, sourceId } = sourceOp.data;
    if (action === "add") {
      await addSourceToPack(params.id, sourceId);
    } else {
      await removeSourceFromPack(params.id, sourceId);
    }
    const pack = await getPackById(params.id);
    return NextResponse.json({ pack });
  }

  // Otherwise update pack metadata
  const parsed = UpdatePackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const pack = await prisma.sourcePack.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ pack });
}
