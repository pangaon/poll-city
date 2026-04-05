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

    const volunteers = await prisma.volunteerProfile.findMany({
      where: { campaignId },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        contact: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = volunteers.map((v) => ({
      name:
        v.user?.name ??
        (v.contact ? `${v.contact.firstName ?? ""} ${v.contact.lastName ?? ""}`.trim() : ""),
      email: v.user?.email ?? v.contact?.email ?? "",
      phone: v.user?.phone ?? v.contact?.phone ?? "",
      skills: v.skills.join(";"),
      availability: v.availability ?? "",
      maxHoursPerWeek: v.maxHoursPerWeek ?? "",
      hasVehicle: v.hasVehicle ? "yes" : "no",
      totalHours: v.totalHours ?? 0,
      isActive: v.isActive ? "yes" : "no",
      notes: v.notes ?? "",
    }));

    const csv = rowsToCsv(rows, [
      { key: "name", header: "name" },
      { key: "email", header: "email" },
      { key: "phone", header: "phone" },
      { key: "skills", header: "skills" },
      { key: "availability", header: "availability" },
      { key: "maxHoursPerWeek", header: "maxHoursPerWeek" },
      { key: "hasVehicle", header: "hasVehicle" },
      { key: "totalHours", header: "totalHours" },
      { key: "isActive", header: "isActive" },
      { key: "notes", header: "notes" },
    ]);

    const filename = exportFilename(campaign?.slug ?? "campaign", "volunteers");

    await prisma.exportLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        exportType: "volunteers",
        format: "csv",
        recordCount: rows.length,
      },
    });

    return csvResponse(csv, filename);
  } catch (err) {
    console.error("Volunteers export failed:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
