import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
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

    const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "donations:read");
    if (forbidden) return forbidden;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { slug: true },
    });

    const donations = await prisma.donation.findMany({
      where: { campaignId, deletedAt: null },
      include: {
        contact: {
          select: {
            firstName: true,
            lastName: true,
            address1: true,
            city: true,
            province: true,
            postalCode: true,
            email: true,
          },
        },
      },
      orderBy: { collectedAt: "desc" },
    });

    const rows = donations.map((d) => ({
      donorName: d.contact
        ? `${d.contact.firstName ?? ""} ${d.contact.lastName ?? ""}`.trim()
        : "",
      donorAddress: d.contact?.address1 ?? "",
      donorCity: d.contact?.city ?? "",
      donorProvince: d.contact?.province ?? "",
      donorPostalCode: d.contact?.postalCode ?? "",
      donorEmail: d.contact?.email ?? "",
      amount: d.amount ?? 0,
      donatedAt: d.collectedAt ? d.collectedAt.toISOString() : "",
      status: d.status ?? "",
      source: d.method ?? "",
    }));

    const csv = rowsToCsv(rows, [
      { key: "donorName", header: "donorName" },
      { key: "donorAddress", header: "donorAddress" },
      { key: "donorCity", header: "donorCity" },
      { key: "donorProvince", header: "donorProvince" },
      { key: "donorPostalCode", header: "donorPostalCode" },
      { key: "donorEmail", header: "donorEmail" },
      { key: "amount", header: "amount" },
      { key: "donatedAt", header: "donatedAt" },
      { key: "status", header: "status" },
      { key: "source", header: "source" },
    ]);

    const filename = exportFilename(campaign?.slug ?? "campaign", "donations");

    await prisma.exportLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        exportType: "donations",
        format: "csv",
        recordCount: rows.length,
      },
    });

    return csvResponse(csv, filename);
  } catch (err) {
    console.error("Donations export failed:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
