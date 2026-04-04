import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { parsePagination, paginate } from "@/lib/utils";

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

  const status = sp.get("status");
  const search = sp.get("search")?.trim();
  const baseWhere: any = { campaignId };
  if (status) baseWhere.status = status;
  if (search) {
    baseWhere.OR = [
      { address1: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { postalCode: { contains: search, mode: "insensitive" } },
      { assignedTeam: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      { contact: { firstName: { contains: search, mode: "insensitive" } } },
      { contact: { lastName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const { page, pageSize, skip } = parsePagination(sp);
  const [signs, total] = await Promise.all([
    prisma.sign.findMany({
      where: baseWhere,
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      skip,
      take: pageSize,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      },
    }),
    prisma.sign.count({ where: baseWhere }),
  ]);

  return NextResponse.json(paginate(signs, total, page, pageSize));
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const signId = req.nextUrl.searchParams.get("id");
  if (!signId) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const sign = await prisma.sign.findUnique({ select: { id: true, campaignId: true, status: true }, where: { id: signId } });
  if (!sign || !sign.campaignId) return NextResponse.json({ error: "Sign not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: sign.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const changeData: any = {};
  if (typeof body.status === "string") {
    changeData.status = body.status;
    if (body.status === "installed") changeData.installedAt = sign.status !== "installed" ? new Date() : undefined;
    if (body.status === "removed") changeData.removedAt = sign.status !== "removed" ? new Date() : undefined;
  }
  if (typeof body.assignedTeam === "string") changeData.assignedTeam = body.assignedTeam.trim() || null;
  if (typeof body.photoUrl === "string") changeData.photoUrl = body.photoUrl.trim() || null;
  if (typeof body.notes === "string") changeData.notes = body.notes.trim() || null;

  const updated = await prisma.sign.update({
    where: { id: signId },
    data: changeData,
    include: { contact: { select: { id: true, firstName: true, lastName: true, phone: true } } },
  });

  return NextResponse.json({ data: updated });
}
