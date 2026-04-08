import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { rowsToCsv, csvResponse, exportFilename } from "@/lib/export/csv";
import type { Prisma, SupportLevel } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";
import { anomaly } from "@/lib/security/anomaly";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimit(req, "form");
    if (limited) return limited;

    const { session, error } = await apiAuth(req);
    if (error) return error;

    anomaly.suspiciousExport(session!.user.id);
    const permError = requirePermission(session!.user.role as string, "contacts:export");
    if (permError) return permError;

    const sp = req.nextUrl.searchParams;
    const campaignId = sp.get("campaignId");
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

    // Build where clause
    const where: Prisma.ContactWhereInput = { campaignId };

    // ID-based selection
    const rawIds = sp.get("ids");
    if (rawIds) {
      const ids = rawIds.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) where.id = { in: ids };
    }

    // Filter-based selection (used by "Export Filtered" in contacts page)
    const search = sp.get("search");
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    const supportLevels = sp.get("supportLevels");
    if (supportLevels) {
      where.supportLevel = { in: supportLevels.split(",").filter(Boolean) as SupportLevel[] };
    }
    if (sp.get("followUpNeeded") === "true") where.followUpNeeded = true;
    if (sp.get("volunteerInterest") === "true") where.volunteerInterest = true;
    if (sp.get("signRequested") === "true") where.signRequested = true;
    const rawWards = sp.get("wards");
    if (rawWards) {
      const wards = rawWards.split(",").filter(Boolean);
      if (wards.length > 0) where.ward = { in: wards };
    }

    const format = sp.get("format"); // "full" (default) | "call"

    const contacts = await prisma.contact.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const suffix = format === "call" ? "call-list" : "contacts";

    if (format === "call") {
      // Phone banking / call list — compact, phone-first format
      const rows = contacts
        .filter((c) => c.phone) // only contacts with phone numbers
        .map((c) => ({
          firstName: c.firstName ?? "",
          lastName: c.lastName ?? "",
          phone: c.phone ?? "",
          supportLevel: c.supportLevel ?? "",
          address1: c.address1 ?? "",
          city: c.city ?? "",
          ward: c.ward ?? "",
          notes: c.notes ?? "",
          followUpNeeded: c.followUpNeeded ? "yes" : "no",
          doNotContact: c.doNotContact ? "yes" : "no",
        }));

      const csv = rowsToCsv(rows, [
        { key: "firstName", header: "First Name" },
        { key: "lastName", header: "Last Name" },
        { key: "phone", header: "Phone" },
        { key: "supportLevel", header: "Support Level" },
        { key: "address1", header: "Address" },
        { key: "city", header: "City" },
        { key: "ward", header: "Ward" },
        { key: "notes", header: "Notes" },
        { key: "followUpNeeded", header: "Follow-up Needed" },
        { key: "doNotContact", header: "Do Not Call" },
      ]);

      const filename = exportFilename(campaign?.slug ?? "campaign", suffix);

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
    }

    // Default full export
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

    const filename = exportFilename(campaign?.slug ?? "campaign", suffix);

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
