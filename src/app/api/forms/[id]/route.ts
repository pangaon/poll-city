import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { audit } from "@/lib/audit";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = session!.user.activeCampaignId as string;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "settings:read");
  if (forbidden) return forbidden;

  const form = await prisma.form.findFirst({
    where: { id: params.id, campaignId },
    include: {
      fields: { orderBy: { order: "asc" } },
      _count: { select: { submissions: true } },
    },
  });

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  return NextResponse.json(form);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = session!.user.activeCampaignId as string;
  const { forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, campaignId, "settings:write");
  if (forbidden2) return forbidden2;

  const existing = await prisma.form.findFirst({ where: { id: params.id, campaignId } });
  if (!existing) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const {
      name, title, description, logoUrl, primaryColour, backgroundUrl,
      isActive, isPublic, requireAuth: reqAuth, allowMultiple, submitLimit,
      opensAt, closesAt, successMessage, successRedirectUrl, notifyOnSubmit,
      notifyEmails, autoCreateContact, defaultTags, defaultSupportLevel,
    } = body;

    // If slug is being changed, verify uniqueness
    let slug = body.slug;
    if (slug && slug !== existing.slug) {
      const conflict = await prisma.form.findUnique({ where: { slug } });
      if (conflict) {
        return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
      }
    }

    const form = await prisma.form.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(primaryColour !== undefined && { primaryColour }),
        ...(backgroundUrl !== undefined && { backgroundUrl }),
        ...(isActive !== undefined && { isActive }),
        ...(isPublic !== undefined && { isPublic }),
        ...(reqAuth !== undefined && { requireAuth: reqAuth }),
        ...(allowMultiple !== undefined && { allowMultiple }),
        ...(submitLimit !== undefined && { submitLimit }),
        ...(opensAt !== undefined && { opensAt: opensAt ? new Date(opensAt) : null }),
        ...(closesAt !== undefined && { closesAt: closesAt ? new Date(closesAt) : null }),
        ...(successMessage !== undefined && { successMessage }),
        ...(successRedirectUrl !== undefined && { successRedirectUrl }),
        ...(notifyOnSubmit !== undefined && { notifyOnSubmit }),
        ...(notifyEmails !== undefined && { notifyEmails }),
        ...(autoCreateContact !== undefined && { autoCreateContact }),
        ...(defaultTags !== undefined && { defaultTags }),
        ...(defaultSupportLevel !== undefined && { defaultSupportLevel }),
      },
    });

    await audit(prisma, 'form.update', {
      campaignId,
      userId: session!.user.id,
      entityId: params.id,
      entityType: 'Form',
      ip: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json(form);
  } catch (err: any) {
    console.error("[PUT /api/forms/[id]]", err);
    return NextResponse.json({ error: "Failed to update form" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = session!.user.activeCampaignId as string;
  const { forbidden: forbidden3 } = await guardCampaignRoute(session!.user.id, campaignId, "settings:write");
  if (forbidden3) return forbidden3;

  const existing = await prisma.form.findFirst({ where: { id: params.id, campaignId } });
  if (!existing) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  await prisma.form.delete({ where: { id: params.id } });

  await audit(prisma, 'form.delete', {
    campaignId,
    userId: session!.user.id,
    entityId: params.id,
    entityType: 'Form',
    ip: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ ok: true });
}
