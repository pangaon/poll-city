import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

type Ctx = { params: { id: string; fid: string } };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = session!.user.activeCampaignId as string;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:write");
  if (forbidden) return forbidden;

  const form = await prisma.form.findFirst({ where: { id: params.id, campaignId } });
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const existing = await prisma.formField.findFirst({
    where: { id: params.fid, formId: params.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Field not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const field = await prisma.formField.update({
      where: { id: params.fid },
      data: {
        ...(body.type !== undefined && { type: body.type }),
        ...(body.label !== undefined && { label: body.label }),
        ...(body.placeholder !== undefined && { placeholder: body.placeholder }),
        ...(body.helpText !== undefined && { helpText: body.helpText }),
        ...(body.defaultValue !== undefined && { defaultValue: body.defaultValue }),
        ...(body.required !== undefined && { required: body.required }),
        ...(body.minLength !== undefined && { minLength: body.minLength }),
        ...(body.maxLength !== undefined && { maxLength: body.maxLength }),
        ...(body.minValue !== undefined && { minValue: body.minValue }),
        ...(body.maxValue !== undefined && { maxValue: body.maxValue }),
        ...(body.pattern !== undefined && { pattern: body.pattern }),
        ...(body.options !== undefined && { options: body.options }),
        ...(body.width !== undefined && { width: body.width }),
        ...(body.crmField !== undefined && { crmField: body.crmField }),
        ...(body.showIf !== undefined && { showIf: body.showIf }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.order !== undefined && { order: body.order }),
      },
    });

    return NextResponse.json(field);
  } catch (err: any) {
    console.error("[PUT /api/forms/[id]/fields/[fid]]", err);
    return NextResponse.json({ error: "Failed to update field" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = session!.user.activeCampaignId as string;
  const { forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, campaignId, "settings:write");
  if (forbidden2) return forbidden2;

  const form = await prisma.form.findFirst({ where: { id: params.id, campaignId } });
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const existing = await prisma.formField.findFirst({
    where: { id: params.fid, formId: params.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Field not found" }, { status: 404 });
  }

  await prisma.formField.delete({ where: { id: params.fid } });
  return NextResponse.json({ ok: true });
}
