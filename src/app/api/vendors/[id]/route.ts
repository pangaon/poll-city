import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await apiAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const vendor = await prisma.vendor.findFirst({
    where: { id: params.id, isActive: true },
    select: {
      id: true,
      name: true,
      contactName: true,
      email: true,
      phone: true,
      website: true,
      bio: true,
      categories: true,
      provincesServed: true,
      serviceAreas: true,
      tags: true,
      isVerified: true,
      isFeatured: true,
      rating: true,
      reviewCount: true,
      logoUrl: true,
      portfolioUrls: true,
      avgResponseHours: true,
      yearsExperience: true,
      rateFrom: true,
      createdAt: true,
    },
  });

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  return NextResponse.json({ data: vendor });
}
