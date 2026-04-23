import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shop = await prisma.printShop.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { bids: true } },
      bids: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          job: {
            select: { title: true, productType: true, status: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!shop) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  return NextResponse.json({ data: shop });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    isVerified?: boolean;
    isActive?: boolean;
    rating?: number | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const shop = await prisma.printShop.findUnique({ where: { id: params.id } });
  if (!shop) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const updated = await prisma.printShop.update({
    where: { id: params.id },
    data: {
      ...(body.isVerified !== undefined ? { isVerified: body.isVerified } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.rating !== undefined ? { rating: body.rating } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}
