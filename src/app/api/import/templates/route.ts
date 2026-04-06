import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

const createSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(100),
  targetEntity: z.enum(["contacts", "volunteers", "documents", "custom_fields"]),
  mappings: z.record(z.string(), z.string()),
  options: z.record(z.string(), z.unknown()).optional(),
});

const BUILTIN_TEMPLATES = [
  {
    id: "builtin-contacts-enterprise",
    name: "Contacts — Enterprise Standard",
    targetEntity: "contacts",
    mappings: {
      FirstName: "firstName",
      LastName: "lastName",
      Email: "email",
      Phone: "phone",
      Address: "address1",
      City: "city",
      Province: "province",
      PostalCode: "postalCode",
      Riding: "riding",
      Ward: "ward",
      SupportLevel: "supportLevel",
      Notes: "notes",
    },
    options: { duplicateStrategy: "fuzzy" },
    isDefault: true,
  },
  {
    id: "builtin-volunteer-roster",
    name: "Volunteers — Roster Intake",
    targetEntity: "volunteers",
    mappings: {
      FirstName: "firstName",
      LastName: "lastName",
      Email: "email",
      Phone: "phone",
      Skills: "volunteerSkills",
      Availability: "volunteerAvailability",
      MaxHours: "maxHoursPerWeek",
      HasVehicle: "hasVehicle",
      Notes: "notes",
    },
    options: { createMissingContacts: true },
    isDefault: true,
  },
  {
    id: "builtin-campaign-docs",
    name: "Campaign Documents — Register",
    targetEntity: "documents",
    mappings: {
      Title: "documentTitle",
      Category: "documentCategory",
      FileUrl: "documentUrl",
      Notes: "documentNotes",
      ExternalId: "externalId",
    },
    options: { validateUrls: true },
    isDefault: true,
  },
] as const;

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "import_export:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const customTemplates = await prisma.campaignImportTemplate.findMany({
    where: { campaignId },
    orderBy: [{ createdAt: "desc" }],
  });

  const customFields = await prisma.campaignField.findMany({
    where: { campaignId, isVisible: true },
    select: { key: true, label: true, fieldType: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    data: {
      builtin: BUILTIN_TEMPLATES,
      custom: customTemplates,
      customFieldHints: customFields,
    },
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "import_export:write");
  if (permError) return permError;

  const raw = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const payload = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: payload.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const created = await prisma.campaignImportTemplate.create({
    data: {
      campaignId: payload.campaignId,
      userId: session!.user.id,
      name: payload.name.trim(),
      targetEntity: payload.targetEntity,
      mappings: payload.mappings,
      options: payload.options as Prisma.InputJsonValue | undefined,
      isDefault: false,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
