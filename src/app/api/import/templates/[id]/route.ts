import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

interface RouteParams {
  params: { id: string };
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "import_export:write");
  if (permError) return permError;

  const template = await prisma.campaignImportTemplate.findUnique({
    where: { id: params.id },
    select: { id: true, campaignId: true, userId: true, isDefault: true },
  });

  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  if (template.isDefault) return NextResponse.json({ error: "Built-in templates cannot be deleted" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: template.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.campaignImportTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
