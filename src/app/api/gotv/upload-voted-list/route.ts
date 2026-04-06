/**
 * POST /api/gotv/upload-voted-list — Upload a CSV of voters who have voted.
 *
 * George's spec:
 * Accepts CSV file with columns: firstName, lastName, address (optional)
 * Matches against contacts using name + address
 * Marks matched contacts as voted
 * Returns: { matched, unmatched, newGap }
 *
 * This is the button the scrutineer hits every hour on election day.
 * It's the most critical data pipeline in the platform.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:write");
  if (permError) return permError;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const campaignId = formData.get("campaignId") as string | null;

  if (!file || !campaignId) {
    return NextResponse.json({ error: "file and campaignId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Parse CSV
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
  const firstNameIdx = headers.findIndex((h) => h === "firstname" || h === "first" || h === "givenname");
  const lastNameIdx = headers.findIndex((h) => h === "lastname" || h === "last" || h === "surname" || h === "familyname");
  const addressIdx = headers.findIndex((h) => h === "address" || h === "address1" || h === "streetaddress");

  if (firstNameIdx === -1 && lastNameIdx === -1) {
    return NextResponse.json({ error: "CSV must have firstName or lastName column" }, { status: 400 });
  }

  // Load all campaign contacts for matching
  const allContacts = await prisma.contact.findMany({
    where: { campaignId, voted: false },
    select: { id: true, firstName: true, lastName: true, address1: true },
  });

  // Build lookup index
  const normalize = (s: string | null) => (s ?? "").toLowerCase().trim();

  let matched = 0;
  let unmatched = 0;
  const matchedIds: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const firstName = firstNameIdx >= 0 ? cols[firstNameIdx] ?? "" : "";
    const lastName = lastNameIdx >= 0 ? cols[lastNameIdx] ?? "" : "";
    const address = addressIdx >= 0 ? cols[addressIdx] ?? "" : "";

    if (!firstName && !lastName) { unmatched++; continue; }

    // Match: name exact (case insensitive), address partial if provided
    const match = allContacts.find((c) => {
      const nameMatch =
        normalize(c.firstName) === normalize(firstName) &&
        normalize(c.lastName) === normalize(lastName);
      if (!nameMatch) return false;
      if (address && c.address1) {
        return normalize(c.address1).includes(normalize(address)) ||
               normalize(address).includes(normalize(c.address1));
      }
      return true;
    });

    if (match && !matchedIds.includes(match.id)) {
      matchedIds.push(match.id);
      matched++;
    } else {
      unmatched++;
    }
  }

  // Batch update all matched contacts
  if (matchedIds.length > 0) {
    await prisma.contact.updateMany({
      where: { id: { in: matchedIds } },
      data: { voted: true, votedAt: new Date() },
    });
  }

  // Calculate new gap
  const [supportersVoted, totalContacts] = await Promise.all([
    prisma.contact.count({
      where: { campaignId, supportLevel: { in: ["strong_support", "leaning_support"] as any[] }, voted: true },
    }),
    prisma.contact.count({ where: { campaignId } }),
    // Audit log
    prisma.activityLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        action: "gotv_upload_voted_list",
        entityType: "GOTV",
        entityId: campaignId,
        details: { filename: file.name, totalRows: lines.length - 1, matched, unmatched },
      },
    }).catch(() => {}),
  ]);

  const winThreshold = Math.ceil(totalContacts * 0.35);
  const newGap = Math.max(0, winThreshold - supportersVoted);

  return NextResponse.json({
    matched,
    unmatched,
    newGap,
    supportersVoted,
    winThreshold,
    totalRows: lines.length - 1,
  });
}
