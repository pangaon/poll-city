import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { PrintProductType } from "@prisma/client";
import { sanitizeUserText } from "@/lib/security/monitor";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  if (session!.user.role !== "PRINT_VENDOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shop = await prisma.printShop.findUnique({
    where: { userId: session!.user.id },
    include: {
      _count: { select: { bids: true } },
    },
  });

  if (!shop) {
    return NextResponse.json({ error: "No shop found for this account" }, { status: 404 });
  }

  return NextResponse.json({ data: shop });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  if (session!.user.role !== "PRINT_VENDOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shop = await prisma.printShop.findUnique({
    where: { userId: session!.user.id },
  });

  if (!shop) {
    return NextResponse.json({ error: "No shop found for this account" }, { status: 404 });
  }

  let body: {
    name?: string;
    contactName?: string;
    phone?: string;
    website?: string;
    description?: string;
    provincesServed?: string[];
    specialties?: string[];
    averageResponseHours?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const specialties =
    body.specialties !== undefined
      ? body.specialties.filter((s): s is PrintProductType =>
          Object.values(PrintProductType).includes(s as PrintProductType)
        )
      : undefined;

  const updated = await prisma.printShop.update({
    where: { id: shop.id },
    data: {
      ...(body.name?.trim() ? { name: body.name.trim() } : {}),
      ...(body.contactName !== undefined ? { contactName: body.contactName || null } : {}),
      ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
      ...(body.website !== undefined ? { website: body.website || null } : {}),
      ...(body.description !== undefined ? { description: sanitizeUserText(body.description) } : {}),
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
