import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "settings:write");
  if (permError) return permError;
  const campaignId = session!.user.activeCampaignId as string;

  const form = await prisma.form.findFirst({ where: { id: params.id, campaignId } });
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { fieldIds } = body;

    if (!Array.isArray(fieldIds) || fieldIds.length === 0) {
      return NextResponse.json({ error: "fieldIds must be a non-empty array" }, { status: 400 });
    }

    // Verify all field IDs belong to this form
    const existingFields = await prisma.formField.findMany({
      where: { formId: params.id },
      select: { id: true },
    });
    const existingIds = new Set(existingFields.map((f) => f.id));
    for (const fid of fieldIds) {
      if (!existingIds.has(fid)) {
        return NextResponse.json({ error: `Field ${fid} does not belong to this form` }, { status: 400 });
      }
    }

    // Update all orders in a transaction
    await prisma.$transaction(
      fieldIds.map((id: string, index: number) =>
        prisma.formField.update({ where: { id }, data: { order: index } })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[POST /api/forms/[id]/fields/reorder]", err);
    return NextResponse.json({ error: "Failed to reorder fields" }, { status: 500 });
  }
}
