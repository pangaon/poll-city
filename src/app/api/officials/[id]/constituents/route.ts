import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { resolveOfficialCampaignAccess } from "../_access";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const access = await resolveOfficialCampaignAccess(session!.user.id, params.id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();

  const constituents = await prisma.constituent.findMany({
    where: {
      officialId: params.id,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { caseFiles: true } },
    },
    orderBy: [{ isPriority: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    take: 250,
  });

  return NextResponse.json({ data: constituents, access });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const access = await resolveOfficialCampaignAccess(session!.user.id, params.id);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    ward?: string;
    riding?: string;
    isPriority?: boolean;
    notes?: string;
    tags?: string[];
    contactId?: string;
  } | null;

  if (!body?.firstName?.trim() || !body?.lastName?.trim()) {
    return NextResponse.json({ error: "firstName and lastName are required" }, { status: 400 });
  }

  const created = await prisma.constituent.create({
    data: {
      officialId: params.id,
      campaignId: access.campaignId,
      contactId: body.contactId || null,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      address1: body.address1?.trim() || null,
      address2: body.address2?.trim() || null,
      city: body.city?.trim() || null,
      province: body.province?.trim() || null,
      postalCode: body.postalCode?.trim() || null,
      ward: body.ward?.trim() || null,
      riding: body.riding?.trim() || null,
      isPriority: !!body.isPriority,
      notes: body.notes?.trim() || null,
      tags: body.tags?.filter(Boolean) || [],
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
