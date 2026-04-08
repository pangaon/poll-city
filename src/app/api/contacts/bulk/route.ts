import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import type { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const {
    ids,
    campaignId,
    operation,
    update,
    selectAll,
    filters,
  } = body as {
    ids?: string[];
    campaignId: string;
    operation: "update" | "delete";
    update?: Record<string, unknown>;
    selectAll?: boolean;
    filters?: {
      search?: string;
      supportLevels?: string[];
      followUpNeeded?: boolean;
      volunteerInterest?: boolean;
      signRequested?: boolean;
      tags?: string[];
      wards?: string[];
    };
  };

  if (!campaignId || !operation) {
    return NextResponse.json({ error: "campaignId and operation required" }, { status: 400 });
  }

  // Verify campaign membership
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Resolve contact IDs — either explicit list or select-all with filters
  let resolvedIds: string[];

  if (selectAll) {
    // Build where clause from filters
    const where: Prisma.ContactWhereInput = {
      campaignId,
      deletedAt: null,
    };

    if (filters?.search) {
      const s = filters.search.trim();
      where.OR = [
        { firstName: { contains: s, mode: "insensitive" } },
        { lastName: { contains: s, mode: "insensitive" } },
        { email: { contains: s, mode: "insensitive" } },
        { phone: { contains: s, mode: "insensitive" } },
        { address1: { contains: s, mode: "insensitive" } },
      ];
    }
    if (filters?.supportLevels?.length) {
      where.supportLevel = { in: filters.supportLevels as Prisma.EnumSupportLevelFilter["in"] };
    }
    if (filters?.followUpNeeded) where.followUpNeeded = true;
    if (filters?.volunteerInterest) where.volunteerInterest = true;
    if (filters?.signRequested) where.signRequested = true;
    if (filters?.wards?.length) where.ward = { in: filters.wards };

    const contacts = await prisma.contact.findMany({
      where,
      select: { id: true },
      take: 5000,
    });
    resolvedIds = contacts.map((c) => c.id);
  } else {
    if (!ids?.length) return NextResponse.json({ error: "ids required when selectAll is false" }, { status: 400 });
    if (ids.length > 500) {
      return NextResponse.json({ error: "Maximum 500 contacts per bulk operation" }, { status: 422 });
    }

    // Verify all contacts belong to this campaign
    const count = await prisma.contact.count({
      where: { id: { in: ids }, campaignId, deletedAt: null },
    });
    if (count !== ids.length) {
      return NextResponse.json(
        { error: "One or more contacts not found in this campaign" },
        { status: 404 }
      );
    }
    resolvedIds = ids;
  }

  if (resolvedIds.length === 0) {
    return NextResponse.json({ error: "No contacts matched" }, { status: 404 });
  }

  // ── Update operation ────────────────────────────────────────────────────
  if (operation === "update" && update) {
    const allowed = [
      "supportLevel",
      "lastContactedAt",
      "followUpNeeded",
      "followUpDate",
      "captain",
      "doNotContact",
    ];
    const safeUpdate: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in update) safeUpdate[key] = update[key];
    }
    if (Object.keys(safeUpdate).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 422 });
    }

    // Convert ISO string dates to Date objects for Prisma
    if (typeof safeUpdate.lastContactedAt === "string") {
      safeUpdate.lastContactedAt = new Date(safeUpdate.lastContactedAt);
    }
    if (typeof safeUpdate.followUpDate === "string") {
      safeUpdate.followUpDate = new Date(safeUpdate.followUpDate);
    }

    await prisma.contact.updateMany({
      where: { id: { in: resolvedIds }, campaignId },
      data: safeUpdate as Parameters<typeof prisma.contact.updateMany>[0]["data"],
    });

    await audit(prisma, "contact.bulk_update", {
      campaignId,
      userId: session!.user.id,
      entityId: resolvedIds[0],
      entityType: "Contact",
      ip: req.headers.get("x-forwarded-for"),
      details: {
        count: resolvedIds.length,
        fields: Object.keys(safeUpdate),
        update: safeUpdate,
        selectAll: selectAll ?? false,
      },
    });

    return NextResponse.json({ data: { updated: resolvedIds.length } });
  }

  // ── Delete operation ────────────────────────────────────────────────────
  if (operation === "delete") {
    // Only CAMPAIGN_MANAGER / ADMIN can bulk delete
    if (!["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden — requires Campaign Manager role or above" },
        { status: 403 }
      );
    }

    await prisma.contact.updateMany({
      where: { id: { in: resolvedIds }, campaignId },
      data: { deletedAt: new Date(), deletedById: session!.user.id },
    });

    await audit(prisma, "contact.bulk_delete", {
      campaignId,
      userId: session!.user.id,
      entityId: resolvedIds[0],
      entityType: "Contact",
      ip: req.headers.get("x-forwarded-for"),
      details: {
        count: resolvedIds.length,
        selectAll: selectAll ?? false,
      },
    });

    return NextResponse.json({ data: { deleted: resolvedIds.length } });
  }

  return NextResponse.json({ error: `Unknown operation: ${operation}` }, { status: 422 });
}
