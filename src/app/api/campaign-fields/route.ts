import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { FieldType, FieldCategory, Role } from "@prisma/client";

const MANAGER_ROLES: Role[] = [Role.ADMIN, Role.SUPER_ADMIN, Role.CAMPAIGN_MANAGER];

const createFieldSchema = z.object({
  campaignId: z.string().cuid(),
  key: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, underscores only"),
  label: z.string().min(1).max(100),
  fieldType: z.nativeEnum(FieldType).default(FieldType.text),
  category: z.nativeEnum(FieldCategory).default(FieldCategory.custom),
  options: z.array(z.string()).optional(),
  isVisible: z.boolean().default(true),
  isRequired: z.boolean().default(false),
  showOnCard: z.boolean().default(true),
  showOnList: z.boolean().default(false),
  sortOrder: z.number().int().optional(),
});

const updateFieldSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  isVisible: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  showOnCard: z.boolean().optional(),
  showOnList: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  options: z.array(z.string()).optional(),
}).strict();

/** GET /api/campaign-fields?campaignId=xxx */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const fields = await prisma.campaignField.findMany({
    where: { campaignId },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  return NextResponse.json({ data: fields });
}

/** POST /api/campaign-fields */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createFieldSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  // Authorization: check MEMBERSHIP role, not global role
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: parsed.data.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!MANAGER_ROLES.includes(membership.role as Role)) {
    return NextResponse.json({ error: "Forbidden — requires Campaign Manager or above role in this campaign" }, { status: 403 });
  }

  const existing = await prisma.campaignField.findUnique({
    where: { campaignId_key: { campaignId: parsed.data.campaignId, key: parsed.data.key } },
  });
  if (existing) return NextResponse.json({ error: `Field key "${parsed.data.key}" already exists` }, { status: 409 });

  const field = await prisma.campaignField.create({ data: parsed.data });
  return NextResponse.json({ data: field }, { status: 201 });
}

/** PATCH /api/campaign-fields?id=xxx */
export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateFieldSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const field = await prisma.campaignField.findUnique({ where: { id }, select: { campaignId: true } });
  if (!field) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorization: membership role
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: field.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!MANAGER_ROLES.includes(membership.role as Role)) {
    return NextResponse.json({ error: "Forbidden — requires Campaign Manager or above role in this campaign" }, { status: 403 });
  }

  const updated = await prisma.campaignField.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ data: updated });
}

/** DELETE /api/campaign-fields?id=xxx */
export async function DELETE(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const field = await prisma.campaignField.findUnique({ where: { id }, select: { campaignId: true } });
  if (!field) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Authorization: ADMIN or SUPER_ADMIN within this campaign only
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: field.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (![Role.ADMIN, Role.SUPER_ADMIN].includes(membership.role as Role)) {
    return NextResponse.json({ error: "Forbidden — field deletion requires Admin role in this campaign" }, { status: 403 });
  }

  await prisma.campaignField.delete({ where: { id } });
  return NextResponse.json({ message: "Field deleted" });
}
