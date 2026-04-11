import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

// ── GET /api/field/paper-export?campaignId=X&shiftId=Y ──────────────────────
// Generates a CSV paper fallback sheet for a field shift.
// Field workers without phones can use this to record results offline.

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const shiftId = req.nextUrl.searchParams.get("shiftId");
  const turfId = req.nextUrl.searchParams.get("turfId");
  const routeId = req.nextUrl.searchParams.get("routeId");

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  // Load targets for this shift/turf/route
  const targets = await prisma.fieldTarget.findMany({
    where: {
      campaignId,
      ...(shiftId ? { fieldProgramId: { not: undefined } } : {}),
      ...(turfId ? { turf: { is: undefined } } : {}),
      ...(routeId ? { routeId } : {}),
      status: { in: ["pending", "in_progress"] },
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, address1: true, phone: true } },
      household: { select: { id: true, address1: true } },
    },
    orderBy: { sortOrder: "asc" },
    take: 200,
  });

  // Also include basic shift details if requested
  const shift = shiftId ? await prisma.fieldShift.findFirst({
    where: { id: shiftId, campaignId, deletedAt: null },
    select: { name: true, scheduledDate: true, startTime: true, endTime: true, ward: true, pollNumber: true },
  }) : null;

  // Build CSV
  const lines: string[] = [];

  // Header block
  const campaignInfo = await prisma.campaign.findFirst({
    where: { id: campaignId },
    select: { name: true },
  });

  lines.push(`# ${campaignInfo?.name ?? "Campaign"} — Field Paper Sheet`);
  if (shift) {
    lines.push(`# Shift: ${shift.name}`);
    lines.push(`# Date: ${shift.scheduledDate.toLocaleDateString("en-CA")} ${shift.startTime}–${shift.endTime}`);
    if (shift.ward) lines.push(`# Ward: ${shift.ward}${shift.pollNumber ? ` | Poll: ${shift.pollNumber}` : ""}`);
  }
  lines.push(`# Generated: ${new Date().toLocaleString("en-CA")}`);
  lines.push("");
  lines.push("Stop#,Address,First Name,Last Name,Phone,Outcome,Notes");

  targets.forEach((t, idx) => {
    const address = t.contact?.address1 ?? t.household?.address1 ?? "";
    const firstName = t.contact?.firstName ?? "";
    const lastName = t.contact?.lastName ?? "";
    const phone = t.contact?.phone ?? "";
    const csvRow = [
      idx + 1,
      `"${address.replace(/"/g, '""')}"`,
      `"${firstName.replace(/"/g, '""')}"`,
      `"${lastName.replace(/"/g, '""')}"`,
      `"${phone.replace(/"/g, '""')}"`,
      "",  // Outcome — to be filled in by canvasser
      "",  // Notes
    ].join(",");
    lines.push(csvRow);
  });

  // If no targets, provide a blank template
  if (targets.length === 0) {
    for (let i = 1; i <= 20; i++) {
      lines.push(`${i},"","","","","",""`);;
    }
  }

  const csv = lines.join("\n");
  const filename = `field-sheet-${campaignId.slice(-6)}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
