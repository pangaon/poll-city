import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const createRidingSchema = z.object({
  ridingName: z.string().min(1, "ridingName is required"),
  ridingCode: z.string().min(1, "ridingCode is required"),
  province: z.string().min(1, "province is required"),
  president: z.string().nullish(),
  email: z.string().email().nullish(),
});

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
  const parsed = createRidingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const riding = await prisma.ridingAssociation.create({
    data: {
      partyId: params.id,
      ridingName: parsed.data.ridingName,
      ridingCode: parsed.data.ridingCode,
      province: parsed.data.province,
      president: parsed.data.president ?? null,
      email: parsed.data.email ?? null,
    },
  });

  return NextResponse.json({ riding }, { status: 201 });
}
