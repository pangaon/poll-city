import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { createFormSchema } from "@/lib/validators/forms";
import { getTemplate } from "@/lib/forms/templates";
import { audit } from "@/lib/audit";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = session!.user.activeCampaignId as string;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:read");
  if (forbidden) return forbidden;

  const forms = await prisma.form.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true, fields: true } } },
  });

  return NextResponse.json(forms);
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = session!.user.activeCampaignId as string;
  const { forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, campaignId, "settings:write");
  if (forbidden2) return forbidden2;

  try {
    const body = await req.json();
    const parsed = createFormSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    const { name, title, description, templateKey, primaryColour } = parsed.data;

    let slug = parsed.data.slug || slugify(name);

    if (!slug) {
      return NextResponse.json({ error: "Could not generate a valid slug" }, { status: 400 });
    }

    // Ensure uniqueness
    const existing = await prisma.form.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const form = await prisma.form.create({
      data: {
        campaignId,
        name,
        slug,
        title,
        description: description || null,
        ...(primaryColour ? { primaryColour } : {}),
      },
    });

    // If creating from a template, auto-populate fields
    if (templateKey) {
      const template = getTemplate(templateKey);
      if (template) {
        const fieldData = template.fields.map((f, i) => ({
          formId: form.id,
          order: i,
          type: f.type,
          label: f.label,
          placeholder: f.placeholder ?? null,
          helpText: f.helpText ?? null,
          required: f.required ?? false,
          options: f.options ? (f.options as any) : undefined,
          crmField: f.crmField ?? null,
          width: f.width ?? "full",
        }));
        await prisma.formField.createMany({ data: fieldData });
      }
    }

    const created = await prisma.form.findUnique({
      where: { id: form.id },
      include: { fields: { orderBy: { order: "asc" } }, _count: { select: { submissions: true } } },
    });

    await audit(prisma, 'form.create', {
      campaignId,
      userId: session!.user.id,
      entityId: form.id,
      entityType: 'Form',
      ip: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/forms]", err);
    return NextResponse.json({ error: "Failed to create form" }, { status: 500 });
  }
}
