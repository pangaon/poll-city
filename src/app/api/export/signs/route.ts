import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { rowsToCsv, csvResponse, exportFilename } from "@/lib/export/csv";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await apiAuth(req);
    if (error) return error;
    const permError = requirePermission(session!.user.role as string, "signs:read");
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

    const signs = await prisma.sign.findMany({
      where: { campaignId, deletedAt: null },
      include: { contact: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });

    const rows = signs.map((s) => ({
      address: s.address1 ?? "",
      ward: "",
      status: s.status ?? "",
      quantity: s.quantity ?? 1,
      createdAt: s.createdAt ? s.createdAt.toISOString() : "",
      updatedAt: s.updatedAt ? s.updatedAt.toISOString() : "",
      contactName: s.contact
        ? `${s.contact.firstName ?? ""} ${s.contact.lastName ?? ""}`.trim()
        : "",
      isOpponent: s.isOpponent ? "yes" : "no",
    }));

    const csv = rowsToCsv(rows, [
      { key: "address", header: "address" },
      { key: "ward", header: "ward" },
      { key: "status", header: "status" },
      { key: "quantity", header: "quantity" },
      { key: "createdAt", header: "createdAt" },
      { key: "updatedAt", header: "updatedAt" },
      { key: "contactName", header: "contactName" },
      { key: "isOpponent", header: "isOpponent" },
    ]);

    const filename = exportFilename(campaign?.slug ?? "campaign", "signs");

    await prisma.exportLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        exportType: "signs",
        format: "csv",
        recordCount: rows.length,
      },
    });

    return csvResponse(csv, filename);
  } catch (err) {
    console.error("Signs export failed:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
