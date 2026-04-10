import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const search = sp.get("search")?.trim();
  const donorStatus = sp.get("status");
  const donorTier = sp.get("tier");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") ?? "25", 10)));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {
    campaignId: campaignId!,
    ...(donorStatus ? { donorStatus } : {}),
    ...(donorTier ? { donorTier } : {}),
  };

  if (search) {
    where.contact = {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [donors, total] = await Promise.all([
    prisma.donorProfile.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true, firstName: true, lastName: true,
            email: true, phone: true, ward: true, deletedAt: true,
          },
        },
      },
      orderBy: [{ lifetimeGiving: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.donorProfile.count({ where }),
  ]);

  return NextResponse.json({ data: donors, total, page, pageSize });
}
