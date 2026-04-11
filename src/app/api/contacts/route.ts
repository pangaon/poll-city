import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { createContactSchema } from "@/lib/validators";
import { parsePagination, slugify } from "@/lib/utils";
import { getContactIdsByCustomFilters, type CustomFieldFilter } from "@/lib/db/custom-fields";
import { SupportLevel } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";

const SORT_FIELD_MAP: Record<string, string[]> = {
  name: ["lastName", "firstName"],
  phone: ["phone"],
  email: ["email"],
  support: ["supportLevel"],
  ward: ["ward"],
  lastContact: ["lastContactedAt"],
  city: ["city"],
  postalCode: ["postalCode"],
  riding: ["riding"],
  gotvStatus: ["gotvStatus"],
  followUpDate: ["followUpDate"],
  volunteer: ["volunteerInterest"],
  dnc: ["doNotContact"],
  interactions: ["lastContactedAt"],
  gotvScore: ["lastContactedAt"],
};

function parseSortOrder(raw: string | null): Array<Record<string, "asc" | "desc">> {
  if (!raw) return [{ lastName: "asc" }, { firstName: "asc" }];

  const orders: Array<Record<string, "asc" | "desc">> = [];
  const segments = raw.split(",").map((s) => s.trim()).filter(Boolean);

  for (const seg of segments) {
    const [fieldRaw, dirRaw] = seg.split(":");
    const field = fieldRaw?.trim();
    const direction: "asc" | "desc" = dirRaw?.trim().toLowerCase() === "desc" ? "desc" : "asc";
    if (!field || !SORT_FIELD_MAP[field]) continue;

    for (const prismaField of SORT_FIELD_MAP[field]) {
      orders.push({ [prismaField]: direction });
    }
  }

  return orders.length > 0 ? orders : [{ lastName: "asc" }, { firstName: "asc" }];
}

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

  const { page } = parsePagination(sp);
  const rawPageSize = parseInt(sp.get("pageSize") ?? "25", 10);
  const pageSize = Math.min(isNaN(rawPageSize) ? 25 : rawPageSize, 1000);
  const cursor = sp.get("cursor")?.trim() || undefined;
  const search = sp.get("search")?.trim();
  const supportLevels = sp.get("supportLevels")?.split(",").filter(Boolean) as SupportLevel[] | undefined;
  const followUpNeeded = sp.get("followUpNeeded") === "true" ? true : undefined;
  const volunteerInterest = sp.get("volunteerInterest") === "true" ? true : undefined;
  const signRequested = sp.get("signRequested") === "true" ? true : undefined;
  const doNotContact = sp.get("doNotContact") === "true" ? true : sp.get("doNotContact") === "false" ? false : undefined;
  const emailBounced = sp.get("emailBounced") === "true" ? true : undefined;
  const smsOptOut = sp.get("smsOptOut") === "true" ? true : undefined;
  const tagIds = sp.get("tags")?.split(",").filter(Boolean);
  const wards = sp.get("wards")?.split(",").filter(Boolean);
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
    deletedAt: null,
    ...(doNotContact !== undefined && { doNotContact }),
    ...(supportLevels && supportLevels.length > 0 && { supportLevel: { in: supportLevels } }),
    ...(followUpNeeded !== undefined && { followUpNeeded }),
    ...(volunteerInterest !== undefined && { volunteerInterest }),
    ...(signRequested !== undefined && { signRequested }),
    ...(emailBounced !== undefined && { emailBounced }),
    ...(smsOptOut !== undefined && { smsOptOut }),
    ...(wards && wards.length > 0 && { ward: { in: wards } }),
    ...(tagIds && tagIds.length > 0 && {
      tags: {
        some: {
          tagId: { in: tagIds }
        }
      }
    }),
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

  const stableOrderBy = [{ lastName: "asc" as const }, { firstName: "asc" as const }, { id: "asc" as const }];

  const [contactsBatch, total] = await Promise.all([
    prisma.contact.findMany({
      where: finalWhere,
      orderBy: stableOrderBy,
      take: pageSize + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        household: { select: { id: true, visited: true, visitedAt: true } },
        tags: { include: { tag: true } },
        _count: { select: { interactions: true } },
      },
    }),
    prisma.contact.count({ where: finalWhere }),
  ]);

  const hasMore = contactsBatch.length > pageSize;
  const contacts = hasMore ? contactsBatch.slice(0, pageSize) : contactsBatch;
  const nextCursor = hasMore ? contacts[contacts.length - 1]?.id ?? null : null;

  return NextResponse.json({
    data: contacts,
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize),
    hasMore,
    nextCursor,
  });
}

/**
 * POST /api/contacts
 * Create a new contact
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

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

  // Duplicate detection — check for existing contact with same email or phone in this campaign
  if (data.email) {
    const existingByEmail = await prisma.contact.findFirst({
      where: { campaignId: data.campaignId, email: { equals: data.email, mode: "insensitive" }, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    if (existingByEmail) {
      return NextResponse.json({
        error: "A contact with this email already exists in this campaign",
        existing: { id: existingByEmail.id, name: `${existingByEmail.firstName} ${existingByEmail.lastName}`.trim() },
        code: "DUPLICATE_EMAIL",
      }, { status: 409 });
    }
  }
  if (data.phone) {
    const existingByPhone = await prisma.contact.findFirst({
      where: { campaignId: data.campaignId, phone: data.phone, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    if (existingByPhone) {
      return NextResponse.json({
        error: "A contact with this phone number already exists in this campaign",
        existing: { id: existingByPhone.id, name: `${existingByPhone.firstName} ${existingByPhone.lastName}`.trim() },
        code: "DUPLICATE_PHONE",
      }, { status: 409 });
    }
  }

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
