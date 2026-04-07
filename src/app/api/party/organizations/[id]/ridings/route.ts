import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const ridings = await prisma.ridingAssociation.findMany({
    where: { partyId: params.id },
    orderBy: { ridingName: "asc" },
    include: { _count: { select: { members: true, nominations: true } } },
  });

  return NextResponse.json({ ridings });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();

  if (!body.ridingName || !body.ridingCode || !body.province) {
    return NextResponse.json({ error: "ridingName, ridingCode, and province are required" }, { status: 400 });
  }

  const riding = await prisma.ridingAssociation.create({
    data: {
      partyId: params.id,
      ridingName: body.ridingName,
      ridingCode: body.ridingCode,
      province: body.province,
      president: body.president ?? null,
      email: body.email ?? null,
    },
  });

  return NextResponse.json({ riding }, { status: 201 });
}
