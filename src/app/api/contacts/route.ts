import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { createContactSchema } from "@/lib/validators";
import { parsePagination, paginate, slugify } from "@/lib/utils";
import { getContactIdsByCustomFilters, type CustomFieldFilter } from "@/lib/db/custom-fields";
import { SupportLevel } from "@prisma/client";

/**
 * GET /api/contacts
 * List contacts for a campaign with pagination, search, and filters
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

  // Verify membership
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { page, pageSize, skip } = parsePagination(sp);
  const search = sp.get("search")?.trim();
  const supportLevel = sp.get("supportLevel") as SupportLevel | null;
  const followUpNeeded = sp.get("followUpNeeded") === "true" ? true : undefined;
  const volunteerInterest = sp.get("volunteerInterest") === "true" ? true : undefined;
  const signRequested = sp.get("signRequested") === "true" ? true : undefined;
  const doNotContact = sp.get("doNotContact") === "true" ? true : sp.get("doNotContact") === "false" ? false : undefined;
  const tagId = sp.get("tagId");
  // Custom field filters: ?customFilter=fieldKey:operator:value (can be repeated)
  const customFilterParams = sp.getAll("customFilter");
  const customFilters: CustomFieldFilter[] = customFilterParams
    .map(p => {
      const [fieldKey, operator, value] = p.split(":");
      return { fieldKey, operator: operator as CustomFieldFilter["operator"], value };
    })
    .filter(f => f.fieldKey && f.operator);

  const where = {
    campaignId,
    isDeceased: false,
    ...(doNotContact !== undefined && { doNotContact }),
    ...(supportLevel && { supportLevel }),
    ...(followUpNeeded !== undefined && { followUpNeeded }),
    ...(volunteerInterest !== undefined && { volunteerInterest }),
    ...(signRequested !== undefined && { signRequested }),
    ...(tagId && { tags: { some: { tagId } } }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
        { address1: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  // Apply custom field filters
  let customFieldContactIds: string[] | null = null;
  if (customFilters.length > 0) {
    customFieldContactIds = await getContactIdsByCustomFilters(campaignId, customFilters);
  }

  const finalWhere = {
    ...where,
    ...(customFieldContactIds !== null && { id: { in: customFieldContactIds } }),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where: finalWhere,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip,
      take: pageSize,
      include: {
        tags: { include: { tag: true } },
        _count: { select: { interactions: true } },
      },
    }),
    prisma.contact.count({ where: finalWhere }),
  ]);

  return NextResponse.json(paginate(contacts, total, page, pageSize));
}

/**
 * POST /api/contacts
 * Create a new contact
 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;

  // Verify membership
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: data.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const contact = await prisma.contact.create({
    data: {
      ...data,
      email: data.email || null,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
    },
    include: { tags: { include: { tag: true } } },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      campaignId: data.campaignId,
      userId: session!.user.id,
      action: "created",
      entityType: "contact",
      entityId: contact.id,
      details: { name: `${data.firstName} ${data.lastName}` },
    },
  });

  return NextResponse.json({ data: contact }, { status: 201 });
}
