import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { parseAnyFile, parseExcelFile, detectFileType } from "@/lib/import/file-parser";
import { matchLists } from "@/lib/import/fuzzy-matcher";
import { SupportLevel } from "@prisma/client";

const SUPPORTER_LEVELS = [SupportLevel.strong_support, SupportLevel.leaning_support];

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  // File size guard: reject requests over 5MB before parsing
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 5_000_000) {
    return NextResponse.json({ error: "File too large. Maximum size is 5MB for GOTV lists." }, { status: 413 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const campaignId = formData.get("campaignId") as string;
  const name = (formData.get("name") as string) ?? `Upload ${new Date().toLocaleTimeString()}`;

  if (!file || !campaignId) return NextResponse.json({ error: "file and campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Parse the voted list file
  const buffer = await file.arrayBuffer();
  const fileType = detectFileType(file.name);
  const parsed = fileType === "excel"
    ? await parseExcelFile(buffer)
    : await parseAnyFile(new TextDecoder().decode(buffer), file.name);

  // Build voted records from parsed file
  const votedRecords = parsed.rows.map(row => {
    const firstName = row["first_name"] || row["fname"] || row["First Name"] || row["FIRST_NM"] || "";
    const lastName = row["last_name"] || row["lname"] || row["Last Name"] || row["LAST_NM"] || "";
    const address = row["address"] || row["Address"] || row["ADDR"] || row["ADDRESS"] || "";
    const externalId = row["voter_id"] || row["id"] || row["elector_id"] || row["ID"] || "";
    return { firstName, lastName, address, externalId };
  }).filter(r => r.firstName || r.lastName || r.address);

  // Load our supporters from DB
  const supporters = await prisma.contact.findMany({
    where: { campaignId, supportLevel: { in: SUPPORTER_LEVELS }, isDeceased: false },
    select: { id: true, firstName: true, lastName: true, address1: true, streetNumber: true, streetName: true, postalCode: true, phone: true, externalId: true },
  });

  // Fuzzy match voted list against our supporters
  const matchResults = await matchLists(
    votedRecords.map(r => ({ firstName: r.firstName, lastName: r.lastName, address1: r.address, externalId: r.externalId })),
    supporters.map(s => ({ id: s.id, firstName: s.firstName, lastName: s.lastName, address1: s.address1 ?? "", streetNumber: s.streetNumber ?? "", streetName: s.streetName ?? "", postalCode: s.postalCode ?? "", externalId: s.externalId ?? "" })),
    { autoMergeThreshold: 80, reviewThreshold: 60, useAI: false, preferExisting: true }
  );

  // Create batch record
  const batch = await prisma.gotvBatch.create({
    data: {
      campaignId,
      name,
      uploadedById: session!.user.id,
      totalRecords: votedRecords.length,
      sourceFile: file.name,
    },
  });

  let matchedCount = 0;
  let struckCount = 0;

  // Process matches
  for (let i = 0; i < matchResults.length; i++) {
    const result = matchResults[i];
    const voted = votedRecords[i];
    const matchedContact = result.action === "auto_merge" ? supporters.find(s => s.id === (result.recordB as any).id) : null;

    await prisma.gotvRecord.create({
      data: {
        batchId: batch.id,
        contactId: matchedContact?.id ?? null,
        firstName: voted.firstName,
        lastName: voted.lastName,
        address: voted.address,
        externalId: voted.externalId || null,
        hasVoted: true,
        matchScore: result.score,
      },
    });

    if (matchedContact) {
      matchedCount++;
      // Strike off — mark as voted in our DB
      await prisma.contact.update({
        where: { id: matchedContact.id },
        data: { gotvStatus: "voted" },
      });
      struckCount++;
    }
  }

  // Update batch totals
  await prisma.gotvBatch.update({
    where: { id: batch.id },
    data: { matchedCount, struckCount },
  });

  return NextResponse.json({ data: { batchId: batch.id, totalRecords: votedRecords.length, matchedCount, struckCount } });
}
