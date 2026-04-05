import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { detectFileType, parseAnyFile, parseExcelFile } from "@/lib/import/file-parser";

const MAX_FILE_SIZE = 10_000_000;

type MappingConfig = Record<string, string>;

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const text = normalize(value).toLowerCase();
  return ["true", "yes", "y", "1"].includes(text);
}

function mapRow(row: Record<string, string>, mappings: MappingConfig): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [source, target] of Object.entries(mappings)) {
    if (!target) continue;
    out[target] = row[source] ?? "";
  }
  return out;
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 413 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });

  const file = formData.get("file") as File | null;
  const campaignId = formData.get("campaignId") as string | null;
  const mappingsRaw = formData.get("mappings") as string | null;

  if (!file || !campaignId || !mappingsRaw) {
    return NextResponse.json({ error: "file, campaignId, and mappings are required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const mappings = JSON.parse(mappingsRaw) as MappingConfig;
  const fileType = detectFileType(file.name);
  const buffer = await file.arrayBuffer();

  const parsed = fileType === "excel"
    ? await parseExcelFile(buffer)
    : await parseAnyFile(new TextDecoder().decode(buffer), file.name);

  const importLog = await prisma.importLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      filename: file.name,
      fileType,
      totalRows: parsed.totalRows,
      status: "processing",
      mapping: mappings,
    },
  });

  let imported = 0;
  let updated = 0;
  let skipped = parsed.skippedRows;
  const errors: string[] = [];

  for (let i = 0; i < parsed.rows.length; i += 1) {
    const mapped = mapRow(parsed.rows[i], mappings);
    const firstName = normalize(mapped.firstName);
    const lastName = normalize(mapped.lastName);
    const email = normalize(mapped.email).toLowerCase();
    const phone = normalize(mapped.phone);

    if (!firstName && !lastName && !email && !phone) {
      skipped += 1;
      continue;
    }

    try {
      let contact = null;

      if (email) {
        contact = await prisma.contact.findFirst({ where: { campaignId, email } });
      }
      if (!contact && phone) {
        contact = await prisma.contact.findFirst({ where: { campaignId, phone } });
      }
      if (!contact && (firstName || lastName)) {
        contact = await prisma.contact.findFirst({
          where: {
            campaignId,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
          },
        });
      }

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            campaignId,
            firstName: firstName || "Unknown",
            lastName: lastName || "Volunteer",
            email: email || null,
            phone: phone || null,
            notes: normalize(mapped.notes) || null,
            volunteerInterest: true,
            importSource: "volunteer_import",
          },
        });
      } else {
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            volunteerInterest: true,
            notes: normalize(mapped.notes) || contact.notes,
          },
        });
      }

      const skills = normalize(mapped.volunteerSkills)
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);

      const existingProfile = await prisma.volunteerProfile.findUnique({
        where: { contactId: contact.id },
        select: { id: true },
      });

      if (existingProfile) {
        await prisma.volunteerProfile.update({
          where: { id: existingProfile.id },
          data: {
            campaignId,
            availability: normalize(mapped.volunteerAvailability) || null,
            skills,
            maxHoursPerWeek: normalize(mapped.maxHoursPerWeek) ? Number(mapped.maxHoursPerWeek) : null,
            hasVehicle: normalizeBool(mapped.hasVehicle),
            notes: normalize(mapped.notes) || null,
            isActive: true,
          },
        });
        updated += 1;
      } else {
        await prisma.volunteerProfile.create({
          data: {
            campaignId,
            contactId: contact.id,
            availability: normalize(mapped.volunteerAvailability) || null,
            skills,
            maxHoursPerWeek: normalize(mapped.maxHoursPerWeek) ? Number(mapped.maxHoursPerWeek) : null,
            hasVehicle: normalizeBool(mapped.hasVehicle),
            notes: normalize(mapped.notes) || null,
            isActive: true,
          },
        });
        imported += 1;
      }
    } catch (e) {
      skipped += 1;
      errors.push(`Row ${i + 1}: ${(e as Error).message}`);
    }
  }

  await prisma.importLog.update({
    where: { id: importLog.id },
    data: {
      status: errors.length > 0 ? "completed_with_errors" : "completed",
      processedRows: parsed.rows.length,
      importedCount: imported,
      updatedCount: updated,
      skippedCount: skipped,
      errorCount: errors.length,
      errors: errors.slice(0, 200),
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ data: { importLogId: importLog.id, imported, updated, skipped, errors } });
}
