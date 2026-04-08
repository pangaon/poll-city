import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { parsePagination, paginate } from "@/lib/utils";
import { advanceFunnel } from "@/lib/operations/funnel-engine";
import { FunnelStage } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const search = sp.get("search")?.trim();
  const status = sp.get("status");
  const hasVehicle = sp.get("hasVehicle") === "true";
  const skills = sp.get("skills")?.split(",").filter(Boolean) || [];
  const availability = sp.get("availability")?.split(",").filter(Boolean) || [];
  const isActive = status === "active" ? true : status === "inactive" ? false : undefined;

  const baseWhere: any = { campaignId };
  if (typeof isActive === "boolean") baseWhere.isActive = isActive;
  if (hasVehicle) baseWhere.hasVehicle = true;
  if (skills.length > 0) baseWhere.skills = { hasSome: skills };
  if (availability.length > 0) baseWhere.availability = { in: availability, mode: "insensitive" };
  if (search) {
    baseWhere.OR = [
      { availability: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      { skills: { has: search } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { contact: { firstName: { contains: search, mode: "insensitive" } } },
      { contact: { lastName: { contains: search, mode: "insensitive" } } },
      { contact: { email: { contains: search, mode: "insensitive" } } },
      { contact: { phone: { contains: search, mode: "insensitive" } } },
    ];
  }

  const { page, pageSize, skip } = parsePagination(sp);
  const [profiles, total] = await Promise.all([
    prisma.volunteerProfile.findMany({
      where: baseWhere,
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, address1: true, city: true } },
      },
    }),
    prisma.volunteerProfile.count({ where: baseWhere }),
  ]);

  return NextResponse.json(paginate(profiles, total, page, pageSize));
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const campaignId = typeof body.campaignId === "string" ? body.campaignId : null;
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const created = await prisma.volunteerProfile.create({
    data: {
      campaignId,
      availability: typeof body.availability === "string" ? body.availability.trim() || null : null,
      skills: Array.isArray(body.skills)
        ? body.skills
            .filter((value: unknown) => typeof value === "string" && value.trim() !== "")
            .map((value: string) => value.trim())
        : [],
      maxHoursPerWeek: body.maxHoursPerWeek !== undefined ? (body.maxHoursPerWeek === null ? null : Number(body.maxHoursPerWeek)) : null,
      hasVehicle: typeof body.hasVehicle === "boolean" ? body.hasVehicle : false,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, address1: true, city: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "created_volunteer_profile",
      entityType: "volunteer_profile",
      entityId: created.id,
      details: {
        hasVehicle: created.hasVehicle,
        isActive: created.isActive,
      },
    },
  });

  // Advance funnel: volunteer profile created → volunteer
  if (created.contact?.id) {
    await advanceFunnel(created.contact.id, FunnelStage.volunteer, "volunteer_signup", session!.user.id);
  }

  return NextResponse.json({ data: created }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const profileId = req.nextUrl.searchParams.get("id");
  if (!profileId) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const profile = await prisma.volunteerProfile.findUnique({ where: { id: profileId }, select: { campaignId: true } });
  if (!profile || !profile.campaignId) return NextResponse.json({ error: "Volunteer profile not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: profile.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.volunteerProfile.update({
    where: { id: profileId },
    data: {
      availability: typeof body.availability === "string" ? body.availability.trim() || null : undefined,
      skills: Array.isArray(body.skills)
        ? body.skills
            .filter((value: unknown) => typeof value === "string" && value.trim() !== "")
            .map((value: string) => value.trim())
        : undefined,
      maxHoursPerWeek: body.maxHoursPerWeek !== undefined ? (body.maxHoursPerWeek === null ? null : Number(body.maxHoursPerWeek)) : undefined,
      hasVehicle: typeof body.hasVehicle === "boolean" ? body.hasVehicle : undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : undefined,
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, address1: true, city: true } },
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: profile.campaignId,
      userId: session!.user.id,
      action: "updated_volunteer_profile",
      entityType: "volunteer_profile",
      entityId: updated.id,
      details: {
        fields: Object.keys(body),
      },
    },
  });

  return NextResponse.json({ data: updated });
}
