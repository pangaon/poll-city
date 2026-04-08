import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { updateContactSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";

async function verifyContactAccess(contactId: string, userId: string) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, campaignId: true },
  });
  if (!contact) return null;
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: contact.campaignId } },
  });
  return membership ? contact : null;
}

/** GET /api/contacts/[id] */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const contact = await verifyContactAccess(params.id, session!.user.id);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const full = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      tags: { include: { tag: true } },
      household: true,
      interactions: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      tasks: {
        orderBy: { createdAt: "desc" },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
      signRequests: true,
    },
  });

  return NextResponse.json({ data: full });
}

/** PATCH /api/contacts/[id] */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;
  const contactAccess = await verifyContactAccess(params.id, session!.user.id);
  if (!contactAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateContactSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const updated = await prisma.contact.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      email: parsed.data.email === "" ? null : parsed.data.email,
      followUpDate: parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : parsed.data.followUpDate === null ? null : undefined,
    },
    include: { tags: { include: { tag: true } } },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: contactAccess.campaignId,
      userId: session!.user.id,
      action: "updated",
      entityType: "contact",
      entityId: params.id,
      details: { fields: Object.keys(parsed.data) },
    },
  });

  return NextResponse.json({ data: updated });
}

/** DELETE /api/contacts/[id] */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;
  const contact = await verifyContactAccess(params.id, session!.user.id);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorization: check MEMBERSHIP role in this contact's campaign — not global role
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: contact.campaignId } },
  });
  // Only ADMIN or CAMPAIGN_MANAGER within this campaign can delete contacts
  if (!membership || !["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden — requires Campaign Manager or above role in this campaign" }, { status: 403 });
  }

  const permanent = req.nextUrl.searchParams.get("permanent") === "true";

  if (permanent) {
    // Hard delete — only ADMIN / SUPER_ADMIN
    if (!["ADMIN", "SUPER_ADMIN"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden — only Campaign Admins can permanently delete contacts" }, { status: 403 });
    }
    await prisma.contact.delete({ where: { id: params.id } });
    await prisma.activityLog.create({
      data: {
        campaignId: contact.campaignId,
        userId: session!.user.id,
        action: "permanently_deleted",
        entityType: "contact",
        entityId: params.id,
        details: {},
      },
    });
    return NextResponse.json({ message: "Contact permanently deleted" });
  }

  // Soft delete
  await prisma.contact.update({
    where: { id: params.id },
    data: {
      deletedAt: new Date(),
      deletedById: session!.user.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: contact.campaignId,
      userId: session!.user.id,
      action: "deleted",
      entityType: "contact",
      entityId: params.id,
      details: {},
    },
  });

  return NextResponse.json({ message: "Contact deleted" });
}
