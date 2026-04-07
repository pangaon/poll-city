import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const ridingId = searchParams.get("ridingId");
  const active = searchParams.get("active");

  const where: Record<string, unknown> = { partyId: params.id };
  if (ridingId) where.ridingId = ridingId;
  if (active !== null) where.isActive = active === "true";

  const [members, total] = await Promise.all([
    prisma.partyMember.findMany({
      where,
      orderBy: { lastName: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.partyMember.count({ where }),
  ]);

  return NextResponse.json({ members, total, page, limit });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();

  if (!body.firstName || !body.lastName) {
    return NextResponse.json({ error: "firstName and lastName are required" }, { status: 400 });
  }

  const member = await prisma.partyMember.create({
    data: {
      partyId: params.id,
      ridingId: body.ridingId ?? null,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email ?? null,
      phone: body.phone ?? null,
      memberSince: body.memberSince ? new Date(body.memberSince) : null,
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json({ member }, { status: 201 });
}
