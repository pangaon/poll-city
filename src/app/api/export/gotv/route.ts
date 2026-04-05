import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { rowsToCsv, csvResponse, exportFilename } from "@/lib/export/csv";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await apiAuth(req);
    if (error) return error;

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
      where: {
        campaignId,
        supportLevel: { in: ["strong_support", "leaning_support"] },
        doNotContact: false,
      },
      orderBy: [{ supportLevel: "asc" }, { lastName: "asc" }],
    });

    const rows = contacts.map((c) => ({
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      address1: c.address1 ?? "",
      ward: c.ward ?? "",
      supportLevel: c.supportLevel ?? "",
      lastContactedAt: c.lastContactedAt ? c.lastContactedAt.toISOString() : "",
      notes: c.notes ?? "",
    }));

    const csv = rowsToCsv(rows, [
      { key: "firstName", header: "firstName" },
      { key: "lastName", header: "lastName" },
      { key: "phone", header: "phone" },
      { key: "email", header: "email" },
      { key: "address1", header: "address1" },
      { key: "ward", header: "ward" },
      { key: "supportLevel", header: "supportLevel" },
      { key: "lastContactedAt", header: "lastContactedAt" },
      { key: "notes", header: "notes" },
    ]);

    const filename = exportFilename(campaign?.slug ?? "campaign", "gotv");

    await prisma.exportLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        exportType: "gotv",
        format: "csv",
        recordCount: rows.length,
      },
    });

    return csvResponse(csv, filename);
  } catch (err) {
    console.error("GOTV export failed:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
