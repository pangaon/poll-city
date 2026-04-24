import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

function isSuperAdmin(session: { user?: { role?: string } } | null): boolean {
  return !!(session?.user && (session.user as { role: string }).role === "SUPER_ADMIN");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Try Vendor first (new system), then fall back to legacy PrintShop
  const vendor = await prisma.vendor.findUnique({
    where: { id: params.id },
    include: {
      printShop: {
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
      },
    },
  });

  if (vendor) {
    return NextResponse.json({ data: vendor, source: "vendor" });
  }

  // Legacy PrintShop
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

  return NextResponse.json({ data: shop, source: "print_shop" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) {
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

  const updatePayload = {
    ...(body.isVerified !== undefined ? { isVerified: body.isVerified } : {}),
    ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    ...(body.rating !== undefined ? { rating: body.rating } : {}),
  };

  // Try Vendor first
  const vendor = await prisma.vendor.findUnique({ where: { id: params.id } });
  if (vendor) {
    const updated = await prisma.vendor.update({ where: { id: params.id }, data: updatePayload });
    // Keep linked PrintShop in sync
    if (vendor.categories.includes("print_shop")) {
      const shop = await prisma.printShop.findUnique({ where: { vendorId: vendor.id } });
      if (shop) {
        await prisma.printShop.update({ where: { id: shop.id }, data: updatePayload });
      }
    }
    return NextResponse.json({ data: updated });
  }

  // Legacy PrintShop
  const shop = await prisma.printShop.findUnique({ where: { id: params.id } });
  if (!shop) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const updated = await prisma.printShop.update({ where: { id: params.id }, data: updatePayload });
  return NextResponse.json({ data: updated });
}
