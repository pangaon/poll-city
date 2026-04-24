import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { PrintProductType, VendorCategory } from "@prisma/client";
import { sanitizeUserText } from "@/lib/security/monitor";

// Called after Google OAuth creates a VOLUNTEER user — upgrades them to VENDOR + creates Vendor record
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const role = (session.user as { role: string }).role;
  const userId = (session.user as { id: string }).id;

  // Only VOLUNTEER (freshly created via OAuth) can be upgraded
  if (role !== "VOLUNTEER") {
    if (role === "VENDOR" || role === "PRINT_VENDOR") {
      return NextResponse.json({ error: "already_vendor" }, { status: 409 });
    }
    return NextResponse.json({ error: "This Google account is linked to a campaign account. Use a different email." }, { status: 409 });
  }

  let body: {
    categories: string[];
    name: string;
    contactName?: string;
    phone?: string;
    website?: string;
    bio?: string;
    provincesServed?: string[];
    yearsExperience?: number;
    rateFrom?: number;
    printSpecialties?: string[];
    averageResponseHours?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const categories = (body.categories ?? []).filter((c): c is VendorCategory =>
    Object.values(VendorCategory).includes(c as VendorCategory)
  );

  if (categories.length === 0) {
    return NextResponse.json({ error: "Select at least one service category" }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Business name is required" }, { status: 400 });
  }

  const isPrintShop = categories.includes("print_shop" as VendorCategory);
  const printSpecialties = (body.printSpecialties ?? []).filter(
    (s): s is PrintProductType =>
      Object.values(PrintProductType).includes(s as PrintProductType)
  );

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.vendor.findUnique({ where: { userId } });
  if (existing) {
    return NextResponse.json({ error: "already_vendor" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role: "VENDOR" } });

    const vendor = await tx.vendor.create({
      data: {
        userId,
        name: body.name.trim(),
        contactName: body.contactName?.trim() || null,
        email: user.email,
        phone: body.phone?.trim() || null,
        website: body.website?.trim() || null,
        bio: body.bio ? sanitizeUserText(body.bio) : null,
        categories,
        provincesServed: body.provincesServed ?? [],
        yearsExperience: body.yearsExperience ?? null,
        rateFrom: body.rateFrom ?? null,
      },
    });

    if (isPrintShop) {
      await tx.printShop.create({
        data: {
          vendorId: vendor.id,
          userId,
          name: body.name.trim(),
          contactName: body.contactName?.trim() || null,
          email: user.email,
          phone: body.phone?.trim() || null,
          website: body.website?.trim() || null,
          description: body.bio ? sanitizeUserText(body.bio) : null,
          provincesServed: body.provincesServed ?? [],
          serviceAreas: body.provincesServed ?? [],
          specialties: printSpecialties,
          averageResponseHours: body.averageResponseHours ?? null,
          portfolio: [],
        },
      });
    }
  });

  return NextResponse.json({ data: { ok: true } }, { status: 201 });
}
