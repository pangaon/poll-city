import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const createMemberSchema = z.object({
  firstName: z.string().min(1, "firstName is required"),
  lastName: z.string().min(1, "lastName is required"),
  ridingId: z.string().nullish(),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  memberSince: z.string().nullish(),
  isActive: z.boolean().optional().default(true),
});

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
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const member = await prisma.partyMember.create({
    data: {
      partyId: params.id,
      ridingId: parsed.data.ridingId ?? null,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      memberSince: parsed.data.memberSince ? new Date(parsed.data.memberSince) : null,
      isActive: parsed.data.isActive,
    },
  });

  return NextResponse.json({ member }, { status: 201 });
}
