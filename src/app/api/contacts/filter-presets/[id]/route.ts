import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "contacts:write");
  if (permError) return permError;

  const preset = await prisma.contactFilterPreset.findUnique({ where: { id: params.id } });
  if (!preset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: preset.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await prisma.contactFilterPreset.delete({ where: { id: params.id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    console.error("[filter-presets/delete]", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
