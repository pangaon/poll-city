import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";
import { audit } from "@/lib/audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req, [Role.ADMIN, Role.SUPER_ADMIN]);
  if (error) return error;

  const { id } = params;

  const existing = await prisma.demoToken.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Demo token not found" }, { status: 404 });
  }

  await prisma.demoToken.delete({ where: { id } });

  audit(prisma, "admin.demo.deleted", {
    campaignId: "system",
    userId: session!.user.id,
    entityId: id,
    entityType: "DemoToken",
    ip: req.headers.get("x-forwarded-for"),
    details: { type: existing.type, prospectEmail: existing.prospectEmail },
  });

  return NextResponse.json({ success: true });
}
