import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db/prisma";
import { PrintProductType, VendorCategory } from "@prisma/client";
import { sanitizeUserText } from "@/lib/security/monitor";

export async function POST(req: NextRequest) {
  let body: {
    // Layer 1 — universal (all vendor types)
    name: string;
    contactName?: string;
    email: string;
    password: string;
    phone?: string;
    website?: string;
    bio?: string;
    categories: string[];
    provincesServed?: string[];
    yearsExperience?: number;
    rateFrom?: number;
    // Layer 2 — print_shop specific
    printSpecialties?: string[];
    averageResponseHours?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email, password } = body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json(
      { error: "Business name, email, and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const categories = (body.categories ?? []).filter((c): c is VendorCategory =>
    Object.values(VendorCategory).includes(c as VendorCategory)
  );

  if (categories.length === 0) {
    return NextResponse.json(
      { error: "Select at least one service category" },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const isPrintShop = categories.includes("print_shop" as VendorCategory);
  const printSpecialties = (body.printSpecialties ?? []).filter(
    (s): s is PrintProductType =>
      Object.values(PrintProductType).includes(s as PrintProductType)
  );

  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        name: body.contactName?.trim() || name,
        passwordHash,
        role: "VENDOR",
      },
    });

    const vendor = await tx.vendor.create({
      data: {
        userId: newUser.id,
        name: name.trim(),
        contactName: body.contactName?.trim() || null,
        email,
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
          userId: newUser.id,
          name: name.trim(),
          contactName: body.contactName?.trim() || null,
          email,
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

    return { userId: newUser.id, email: newUser.email };
  });

  return NextResponse.json({ data: result }, { status: 201 });
}
