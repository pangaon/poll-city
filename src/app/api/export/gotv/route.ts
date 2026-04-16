import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { rowsToCsv, csvResponse, exportFilename } from "@/lib/export/csv";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimit(req, "form");
    if (limited) return limited;

    const { session, error } = await apiAuth(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
    }

    const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "gotv:read");
    if (forbidden) return forbidden;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { slug: true },
    });

    const contacts = await prisma.contact.findMany({
      where: {
        campaignId,
        deletedAt: null,
        supportLevel: { in: ["strong_support", "leaning_support"] },
        doNotContact: false,
      },
      orderBy: [{ supportLevel: "asc" }, { lastName: "asc" }],
      take: 50000,
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
