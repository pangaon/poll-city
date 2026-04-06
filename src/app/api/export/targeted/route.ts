/**
 * POST /api/export/targeted — Filtered export with toggleable fields.
 * Supports: contacts, walk lists, sign lists, GOTV lists, volunteer lists, donation lists.
 * Users can filter by street, ward, support level, tags, and toggle which columns to include.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

type ExportType = "contacts" | "walklist" | "signs" | "gotv" | "volunteers" | "donations";

export async function POST(req: NextRequest) {
  const { session, resolved, error } = await apiAuthWithPermission(req, "contacts:export");
  if (error) return error;

  const campaignId = (session.user as any).activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const body = await req.json();
  const {
    type = "contacts",
    filters = {},
    fields = [],
    format = "csv",
  } = body as {
    type: ExportType;
    filters: {
      street?: string;
      ward?: string;
      supportLevel?: string[];
      tags?: string[];
      postalCode?: string;
      poll?: string;
      notContactedSince?: string; // ISO date
      hasPhone?: boolean;
      hasEmail?: boolean;
    };
    fields: string[];
    format: "csv" | "json";
  };

  // Build where clause from filters
  const where: Record<string, unknown> = { campaignId };

  if (filters.street) where.address1 = { contains: filters.street, mode: "insensitive" };
  if (filters.ward) where.ward = { contains: filters.ward, mode: "insensitive" };
  if (filters.postalCode) where.postalCode = { startsWith: filters.postalCode.toUpperCase().replace(/\s/g, "").slice(0, 3) };
  if (filters.poll) where.municipalPoll = filters.poll;
  if (filters.supportLevel?.length) where.supportLevel = { in: filters.supportLevel };
  if (filters.hasPhone) where.phone = { not: null };
  if (filters.hasEmail) where.email = { not: null };
  if (filters.notContactedSince) where.lastContactedAt = { lt: new Date(filters.notContactedSince) };

  let data: Record<string, unknown>[];

  switch (type) {
    case "contacts":
    case "walklist": {
      const contacts = await prisma.contact.findMany({
        where,
        select: buildContactSelect(fields, type === "walklist"),
        orderBy: [{ address1: "asc" }, { lastName: "asc" }],
        take: 50000,
      });
      data = contacts.map((c) => flattenRecord(c));
      break;
    }
    case "signs": {
      const signs = await prisma.sign.findMany({
        where: { campaignId },
        orderBy: { createdAt: "desc" },
        take: 10000,
      });
      data = signs.map((s) => flattenRecord(s));
      break;
    }
    case "gotv": {
      const gotv = await prisma.contact.findMany({
        where: { ...where, supportLevel: { in: ["strong_support", "leaning_support"] } },
        select: { firstName: true, lastName: true, phone: true, address1: true, ward: true, municipalPoll: true, voted: true, votedAt: true },
        orderBy: { lastName: "asc" },
        take: 50000,
      });
      data = gotv.map((c) => flattenRecord(c));
      break;
    }
    case "volunteers": {
      const vols = await prisma.volunteerProfile.findMany({
        where: { campaignId },
        include: { user: { select: { name: true, email: true } } },
        take: 10000,
      });
      data = vols.map((v) => ({ name: v.user?.name ?? "", email: v.user?.email ?? "", ...flattenRecord(v) }));
      break;
    }
    case "donations": {
      const donations = await prisma.donation.findMany({
        where: { campaignId },
        orderBy: { createdAt: "desc" },
        take: 50000,
      });
      data = donations.map((d) => flattenRecord(d));
      break;
    }
    default:
      return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  }

  // Log export
  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session.user.id as string,
      action: "export.targeted",
      entityType: "Export",
      entityId: type,
      details: { type, filters, rowCount: data.length, format } as object,
    },
  });

  if (format === "json") {
    return NextResponse.json({ data, count: data.length });
  }

  // CSV format
  if (data.length === 0) {
    return new Response("No data matching filters", {
      headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${type}-export.csv"` },
    });
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        const str = String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(",")
    ),
  ];

  return new Response(csvRows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function buildContactSelect(fields: string[], isWalkList: boolean): Record<string, boolean> {
  const defaultFields = isWalkList
    ? ["firstName", "lastName", "address1", "city", "postalCode", "phone", "supportLevel", "notes", "ward", "municipalPoll"]
    : ["firstName", "lastName", "email", "phone", "address1", "city", "province", "postalCode", "supportLevel", "ward"];

  const requestedFields = fields.length > 0 ? fields : defaultFields;
  const select: Record<string, boolean> = {};
  for (const f of requestedFields) {
    select[f] = true;
  }
  return select;
}

function flattenRecord(obj: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        flat[`${key}_${subKey}`] = subValue;
      }
    } else {
      flat[key] = value;
    }
  }
  return flat;
}
