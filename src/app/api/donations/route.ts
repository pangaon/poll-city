import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { parsePagination } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "donations:read");
  if (permError) return permError;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = sp.get("status");
  const search = sp.get("search")?.trim();
  const baseWhere: any = { campaignId };
  if (status) baseWhere.status = status;
  if (search) {
    baseWhere.OR = [
      { notes: { contains: search, mode: "insensitive" } },
      { method: { contains: search, mode: "insensitive" } },
      { contact: { firstName: { contains: search, mode: "insensitive" } } },
      { contact: { lastName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const { page, pageSize, skip } = parsePagination(sp);
  const [donations, total, totalsByStatus] = await Promise.all([
    prisma.donation.findMany({
      where: baseWhere,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: pageSize,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, phone: true } },
        recordedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.donation.count({ where: baseWhere }),
    prisma.donation.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: { amount: true },
      _sum: { amount: true },
    }),
  ]);

  return NextResponse.json({ data: donations, total, page, pageSize, totalsByStatus });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "donations:write");
  if (permError) return permError;

  const donationId = req.nextUrl.searchParams.get("id");
  if (!donationId) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const donation = await prisma.donation.findUnique({ where: { id: donationId }, select: { campaignId: true } });
  if (!donation || !donation.campaignId) return NextResponse.json({ error: "Donation not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: donation.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.donation.update({
    where: { id: donationId },
    data: {
      status: typeof body.status === "string" ? body.status : undefined,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : undefined,
      method: typeof body.method === "string" ? body.method.trim() || null : undefined,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      recordedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: updated });
}
