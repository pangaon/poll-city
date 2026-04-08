import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/contacts/restore — restore a soft-deleted contact
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const contactId = typeof (body as Record<string, unknown>).contactId === "string"
    ? (body as Record<string, unknown>).contactId as string
    : null;
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, campaignId: true, deletedAt: true, firstName: true, lastName: true },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!contact.deletedAt) return NextResponse.json({ error: "Contact is not deleted" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: contact.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const restored = await prisma.contact.update({
    where: { id: contactId },
    data: { deletedAt: null, deletedById: null },
  });

  await audit(prisma, "contact.restored", {
    campaignId: contact.campaignId,
    userId: session!.user.id,
    entityId: contactId,
    entityType: "Contact",
    ip: req.headers.get("x-forwarded-for"),
    details: { name: `${contact.firstName} ${contact.lastName}` },
  });

  return NextResponse.json({ data: restored });
}

// GET /api/contacts/restore — list soft-deleted contacts (recycle bin)
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const deleted = await prisma.contact.findMany({
    where: { campaignId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: 200,
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      supportLevel: true, ward: true, deletedAt: true,
    },
  });

  return NextResponse.json({ data: deleted, total: deleted.length });
}
