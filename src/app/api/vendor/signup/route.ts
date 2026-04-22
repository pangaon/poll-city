import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db/prisma";
import { PrintProductType } from "@prisma/client";
import { sanitizeUserText } from "@/lib/security/monitor";

export async function POST(req: NextRequest) {
  let body: {
    name: string;
    contactName?: string;
    email: string;
    password: string;
    phone?: string;
    website?: string;
    description?: string;
    provincesServed?: string[];
    specialties?: string[];
    averageResponseHours?: number;
    portfolio?: string[];
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

  // Check for duplicate email (user or shop)
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const specialties = (body.specialties ?? []).filter((s): s is PrintProductType =>
    Object.values(PrintProductType).includes(s as PrintProductType)
  );

  // Create User + PrintShop atomically
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        name: body.contactName ?? name,
        passwordHash,
        role: "PRINT_VENDOR",
      },
    });

    await tx.printShop.create({
      data: {
        name,
        contactName: body.contactName ?? null,
        email,
        phone: body.phone ?? null,
        website: body.website ?? null,
        description: sanitizeUserText(body.description),
        provincesServed: body.provincesServed ?? [],
        serviceAreas: body.provincesServed ?? [],
        specialties,
        averageResponseHours: body.averageResponseHours ?? null,
        portfolio: body.portfolio ?? [],
        userId: newUser.id,
      },
    });

    return newUser;
  });

  return NextResponse.json({ data: { userId: user.id, email: user.email } }, { status: 201 });
}
