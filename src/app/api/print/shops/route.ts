import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { PrintProductType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const specialty = sp.get("specialty") as PrintProductType | null;
  const search = sp.get("search") ?? "";

  const shops = await prisma.printShop.findMany({
    where: {
      isActive: true,
      ...(specialty ? { specialties: { has: specialty } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { serviceAreas: { has: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ isVerified: "desc" }, { rating: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { bids: true } },
    },
  });

  return NextResponse.json({ data: shops });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: {
    name?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    website?: string;
    description?: string;
    provincesServed?: string[];
    specialties?: PrintProductType[];
    minimumOrder?: number;
    averageResponseHours?: number;
    portfolio?: string[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name || !body.email) {
    return NextResponse.json({ error: "Business name and email are required" }, { status: 400 });
  }

  const shop = await prisma.printShop.create({
    data: {
      name: body.name,
      contactName: body.contactName ?? null,
      email: body.email,
      phone: body.phone ?? null,
      website: body.website ?? null,
      description: body.description ?? null,
      provincesServed: body.provincesServed ?? [],
      serviceAreas: body.provincesServed ?? [],
      specialties: body.specialties ?? [],
      averageResponseHours: body.averageResponseHours ?? null,
      portfolio: body.portfolio ?? [],
    },
  });

  return NextResponse.json({ data: shop }, { status: 201 });
}
