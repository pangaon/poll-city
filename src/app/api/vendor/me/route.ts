import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { PrintProductType, VendorCategory } from "@prisma/client";
import { sanitizeUserText } from "@/lib/security/monitor";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const role = session!.user.role;
  const userId = session!.user.id;

  if (role !== "PRINT_VENDOR" && role !== "VENDOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // VENDOR role — return unified Vendor record with printShop if applicable
  if (role === "VENDOR") {
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
      include: {
        printShop: {
          include: { _count: { select: { bids: true } } },
        },
      },
    });
    if (!vendor) {
      return NextResponse.json({ error: "No vendor profile found" }, { status: 404 });
    }
    return NextResponse.json({ data: vendor, source: "vendor" });
  }

  // PRINT_VENDOR legacy — return PrintShop record
  const shop = await prisma.printShop.findUnique({
    where: { userId },
    include: { _count: { select: { bids: true } } },
  });
  if (!shop) {
    return NextResponse.json({ error: "No shop found for this account" }, { status: 404 });
  }
  return NextResponse.json({ data: shop, source: "print_shop" });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const role = session!.user.role;
  const userId = session!.user.id;

  if (role !== "PRINT_VENDOR" && role !== "VENDOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    // Universal fields
    name?: string;
    contactName?: string;
    phone?: string;
    website?: string;
    bio?: string;
    provincesServed?: string[];
    categories?: string[];
    yearsExperience?: number;
    rateFrom?: number;
    // Print-specific
    specialties?: string[];
    averageResponseHours?: number;
    // Legacy compat
    description?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (role === "VENDOR") {
    const vendor = await prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) {
      return NextResponse.json({ error: "No vendor profile found" }, { status: 404 });
    }

    const categories =
      body.categories !== undefined
        ? body.categories.filter((c): c is VendorCategory =>
            Object.values(VendorCategory).includes(c as VendorCategory)
          )
        : undefined;

    const updated = await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        ...(body.name?.trim() ? { name: body.name.trim() } : {}),
        ...(body.contactName !== undefined ? { contactName: body.contactName || null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
        ...(body.website !== undefined ? { website: body.website || null } : {}),
        ...(body.bio !== undefined ? { bio: sanitizeUserText(body.bio) } : {}),
        ...(body.provincesServed !== undefined ? { provincesServed: body.provincesServed } : {}),
        ...(categories !== undefined ? { categories } : {}),
        ...(body.yearsExperience !== undefined ? { yearsExperience: body.yearsExperience || null } : {}),
        ...(body.rateFrom !== undefined ? { rateFrom: body.rateFrom || null } : {}),
      },
    });

    // Also keep the linked PrintShop in sync if it exists
    if (vendor.categories.includes("print_shop" as VendorCategory)) {
      const shop = await prisma.printShop.findUnique({ where: { vendorId: vendor.id } });
      if (shop) {
        const specialties =
          body.specialties !== undefined
            ? body.specialties.filter((s): s is PrintProductType =>
                Object.values(PrintProductType).includes(s as PrintProductType)
              )
            : undefined;
        await prisma.printShop.update({
          where: { id: shop.id },
          data: {
            ...(body.name?.trim() ? { name: body.name.trim() } : {}),
            ...(body.contactName !== undefined ? { contactName: body.contactName || null } : {}),
            ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
            ...(body.website !== undefined ? { website: body.website || null } : {}),
            ...(body.bio !== undefined ? { description: sanitizeUserText(body.bio) } : {}),
            ...(body.provincesServed !== undefined
              ? { provincesServed: body.provincesServed, serviceAreas: body.provincesServed }
              : {}),
            ...(specialties !== undefined ? { specialties } : {}),
            ...(body.averageResponseHours !== undefined
              ? { averageResponseHours: body.averageResponseHours || null }
              : {}),
          },
        });
      }
    }

    return NextResponse.json({ data: updated });
  }

  // Legacy PRINT_VENDOR path
  const shop = await prisma.printShop.findUnique({ where: { userId } });
  if (!shop) {
    return NextResponse.json({ error: "No shop found for this account" }, { status: 404 });
  }

  const specialties =
    body.specialties !== undefined
      ? body.specialties.filter((s): s is PrintProductType =>
          Object.values(PrintProductType).includes(s as PrintProductType)
        )
      : undefined;

  const bioText = body.bio ?? body.description;

  const updated = await prisma.printShop.update({
    where: { id: shop.id },
    data: {
      ...(body.name?.trim() ? { name: body.name.trim() } : {}),
      ...(body.contactName !== undefined ? { contactName: body.contactName || null } : {}),
      ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
      ...(body.website !== undefined ? { website: body.website || null } : {}),
      ...(bioText !== undefined ? { description: sanitizeUserText(bioText) } : {}),
      ...(body.provincesServed !== undefined
        ? { provincesServed: body.provincesServed, serviceAreas: body.provincesServed }
        : {}),
      ...(specialties !== undefined ? { specialties } : {}),
      ...(body.averageResponseHours !== undefined
        ? { averageResponseHours: body.averageResponseHours || null }
        : {}),
    },
  });

  return NextResponse.json({ data: updated });
}
