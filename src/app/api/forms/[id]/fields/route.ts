import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = session!.user.activeCampaignId as string;

  const form = await prisma.form.findFirst({ where: { id: params.id, campaignId } });
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const fields = await prisma.formField.findMany({
    where: { formId: params.id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(fields);
}

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
    const { type, label } = body;

    if (!type || !label) {
      return NextResponse.json({ error: "type and label are required" }, { status: 400 });
    }

    const maxOrder = await prisma.formField.aggregate({
      where: { formId: params.id },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const field = await prisma.formField.create({
      data: {
        formId: params.id,
        order: nextOrder,
        type,
        label,
        placeholder: body.placeholder || null,
        helpText: body.helpText || null,
        defaultValue: body.defaultValue || null,
        required: body.required ?? false,
        minLength: body.minLength ?? null,
        maxLength: body.maxLength ?? null,
        minValue: body.minValue ?? null,
        maxValue: body.maxValue ?? null,
        pattern: body.pattern || null,
        options: body.options ?? null,
        width: body.width || "full",
        crmField: body.crmField || null,
        showIf: body.showIf ?? null,
        content: body.content || null,
      },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/forms/[id]/fields]", err);
    return NextResponse.json({ error: "Failed to add field" }, { status: 500 });
  }
}
