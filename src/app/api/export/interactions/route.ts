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

    const interactions = await prisma.interaction.findMany({
      where: { contact: { campaignId } },
      include: {
        contact: { select: { firstName: true, lastName: true, address1: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const rows = interactions.map((i) => ({
      date: i.createdAt ? i.createdAt.toISOString() : "",
      type: i.type ?? "",
      contactName: i.contact
        ? `${i.contact.firstName ?? ""} ${i.contact.lastName ?? ""}`.trim()
        : "",
      contactAddress: i.contact?.address1 ?? "",
      canvasserName: i.user?.name ?? i.user?.email ?? "",
      notes: i.notes ?? "",
      supportSignal: i.supportLevel ?? "",
    }));

    const csv = rowsToCsv(rows, [
      { key: "date", header: "date" },
      { key: "type", header: "type" },
      { key: "contactName", header: "contactName" },
      { key: "contactAddress", header: "contactAddress" },
      { key: "canvasserName", header: "canvasserName" },
      { key: "notes", header: "notes" },
      { key: "supportSignal", header: "supportSignal" },
    ]);

    const filename = exportFilename(campaign?.slug ?? "campaign", "interactions");

    await prisma.exportLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        exportType: "interactions",
        format: "csv",
        recordCount: rows.length,
      },
    });

    return csvResponse(csv, filename);
  } catch (err) {
    console.error("Interactions export failed:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
