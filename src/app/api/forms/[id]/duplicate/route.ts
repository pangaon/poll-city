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

  const original = await prisma.form.findFirst({
    where: { id: params.id, campaignId },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (!original) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const newSlug = `${original.slug}-copy-${Date.now().toString(36)}`;

  const duplicate = await prisma.form.create({
    data: {
      campaignId,
      name: `${original.name} (Copy)`,
      slug: newSlug,
      title: original.title,
      description: original.description,
      logoUrl: original.logoUrl,
      primaryColour: original.primaryColour,
      backgroundUrl: original.backgroundUrl,
      isActive: false, // Start inactive so user can review
      isPublic: original.isPublic,
      requireAuth: original.requireAuth,
      allowMultiple: original.allowMultiple,
      submitLimit: original.submitLimit,
      opensAt: null,
      closesAt: null,
      successMessage: original.successMessage,
      successRedirectUrl: original.successRedirectUrl,
      notifyOnSubmit: original.notifyOnSubmit,
      notifyEmails: original.notifyEmails,
      autoCreateContact: original.autoCreateContact,
      defaultTags: original.defaultTags,
      defaultSupportLevel: original.defaultSupportLevel,
      fields: {
        create: original.fields.map((f) => ({
          order: f.order,
          type: f.type,
          label: f.label,
          placeholder: f.placeholder,
          helpText: f.helpText,
          defaultValue: f.defaultValue,
          required: f.required,
          minLength: f.minLength,
          maxLength: f.maxLength,
          minValue: f.minValue,
          maxValue: f.maxValue,
          pattern: f.pattern,
          options: f.options ?? undefined,
          width: f.width,
          crmField: f.crmField,
          showIf: f.showIf ?? undefined,
          content: f.content,
        })),
      },
    },
    include: { fields: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(duplicate, { status: 201 });
}
