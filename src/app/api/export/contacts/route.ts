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
      where: { campaignId },
      include: { tags: { include: { tag: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const rows = contacts.map((c) => ({
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      address1: c.address1 ?? "",
      city: c.city ?? "",
      province: c.province ?? "",
      postalCode: c.postalCode ?? "",
      ward: c.ward ?? "",
      pollNumber: c.municipalPoll ?? "",
      supportLevel: c.supportLevel ?? "",
      tags: c.tags.map((t) => t.tag.name).join(";"),
      volunteerInterest: c.volunteerInterest ? "yes" : "no",
      signRequested: c.signRequested ? "yes" : "no",
      doNotContact: c.doNotContact ? "yes" : "no",
      notes: c.notes ?? "",
      lastContactedAt: c.lastContactedAt ? c.lastContactedAt.toISOString() : "",
    }));

    const csv = rowsToCsv(rows, [
      { key: "firstName", header: "firstName" },
      { key: "lastName", header: "lastName" },
      { key: "email", header: "email" },
      { key: "phone", header: "phone" },
      { key: "address1", header: "address1" },
      { key: "city", header: "city" },
      { key: "province", header: "province" },
      { key: "postalCode", header: "postalCode" },
      { key: "ward", header: "ward" },
      { key: "pollNumber", header: "pollNumber" },
      { key: "supportLevel", header: "supportLevel" },
      { key: "tags", header: "tags" },
      { key: "volunteerInterest", header: "volunteerInterest" },
      { key: "signRequested", header: "signRequested" },
      { key: "doNotContact", header: "doNotContact" },
      { key: "notes", header: "notes" },
      { key: "lastContactedAt", header: "lastContactedAt" },
    ]);

    const filename = exportFilename(campaign?.slug ?? "campaign", "contacts");

    await prisma.exportLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        exportType: "contacts",
        format: "csv",
        recordCount: rows.length,
      },
    });

    return csvResponse(csv, filename);
  } catch (err) {
    console.error("Contacts export failed:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
