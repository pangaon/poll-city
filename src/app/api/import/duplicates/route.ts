import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { parseAndMapImportFile, isLikelyDuplicate, type MappingConfig, type TransformConfig } from "@/lib/import/import-pipeline";

const MAX_FILE_SIZE = 50_000_000;

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const campaignId = formData.get("campaignId") as string | null;
  const mappingsRaw = formData.get("mappings") as string | null;
  const transformsRaw = formData.get("transforms") as string | null;

  if (!file || !mappingsRaw || !campaignId) {
    return NextResponse.json({ error: "file, campaignId, and mappings are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "import:write");
  if (forbidden) return forbidden;

  let mappings: MappingConfig;
  try {
    mappings = JSON.parse(mappingsRaw) as MappingConfig;
  } catch {
    return NextResponse.json({ error: "Invalid mappings JSON" }, { status: 400 });
  }

  let transforms: TransformConfig | undefined;
  if (transformsRaw) {
    try {
      transforms = JSON.parse(transformsRaw) as TransformConfig;
    } catch { /* ignore */ }
  }

  const prepared = await parseAndMapImportFile(file, mappings, transforms);
  const rowsToCheck = prepared.validRows.slice(0, 5000);

  const existingContacts = await prisma.contact.findMany({
    where: { campaignId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      postalCode: true,
      phone: true,
      email: true,
      externalId: true,
      address1: true,
      city: true,
      province: true,
    },
  });

  type DupSample = {
    rowIndex: number;
    incoming: Record<string, string | undefined>;
    existing: Record<string, string | undefined>;
    changedFields: string[];
  };
  const duplicateSamples: DupSample[] = [];

  let probableDuplicates = 0;
  for (let i = 0; i < rowsToCheck.length; i++) {
    const row = rowsToCheck[i];
    const found = existingContacts.find((existing) => isLikelyDuplicate(row, existing));
    if (found) {
      probableDuplicates++;
      if (duplicateSamples.length < 10) {
        const compareFields = ["firstName", "lastName", "email", "phone", "address1", "city", "province", "postalCode"] as const;
        const changedFields = compareFields.filter((f) => {
          const incomingVal = (row[f] ?? "").trim().toLowerCase();
          const existingVal = ((found as Record<string, string | null>)[f] ?? "").trim().toLowerCase();
          return incomingVal && existingVal && incomingVal !== existingVal;
        });
        duplicateSamples.push({
          rowIndex: i + 1,
          incoming: Object.fromEntries(compareFields.map((f) => [f, row[f] ?? undefined])),
          existing: Object.fromEntries(compareFields.map((f) => [f, ((found as Record<string, string | null>)[f] ?? undefined) as string | undefined])),
          changedFields,
        });
      }
    }
  }

  return NextResponse.json({
    data: {
      checkedRows: rowsToCheck.length,
      probableDuplicates,
      newRecordsEstimate: Math.max(0, rowsToCheck.length - probableDuplicates),
      duplicateSamples,
      truncated: prepared.validRows.length > rowsToCheck.length,
    },
  });
}
