import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { rowsToCsv, csvResponse, exportFilename } from "@/lib/export/csv";

function parseStreetAddress(addr: string | null) {
  if (!addr) return { houseNumber: "", streetName: "" };
  const m = addr.match(/^(\d+)\s+(.+)$/);
  return m ? { houseNumber: m[1], streetName: m[2] } : { houseNumber: "", streetName: addr };
}

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await apiAuth(req);
    if (error) return error;
    const permError = requirePermission(session!.user.role as string, "contacts:export");
    if (permError) return permError;

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { slug: true },
    });

    const contacts = await prisma.contact.findMany({
      where: { campaignId, deletedAt: null, doNotContact: false },
      orderBy: [{ address1: "asc" }, { lastName: "asc" }],
    });

    const rows = contacts.map((c) => {
      const { houseNumber, streetName } = parseStreetAddress(c.address1 ?? null);
      return {
        houseNumber,
        streetName,
        firstName: c.firstName ?? "",
        lastName: c.lastName ?? "",
        supportLevel: c.supportLevel ?? "",
        phone: c.phone ?? "",
        notes: c.notes ?? "",
        lastContactedAt: c.lastContactedAt ? c.lastContactedAt.toISOString() : "",
      };
    });

    const csv = rowsToCsv(rows, [
      { key: "houseNumber", header: "houseNumber" },
      { key: "streetName", header: "streetName" },
      { key: "firstName", header: "firstName" },
      { key: "lastName", header: "lastName" },
      { key: "supportLevel", header: "supportLevel" },
      { key: "phone", header: "phone" },
      { key: "notes", header: "notes" },
      { key: "lastContactedAt", header: "lastContactedAt" },
    ]);

    const filename = exportFilename(campaign?.slug ?? "campaign", "walklist");

    await prisma.exportLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        exportType: "walk_list",
        format: "csv",
        recordCount: rows.length,
      },
    });

    return csvResponse(csv, filename);
  } catch (err) {
    console.error("Walk list export failed:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
