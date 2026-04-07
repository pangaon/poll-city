import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const partyId = searchParams.get("partyId");

  const where: Record<string, unknown> = {};
  if (partyId) where.partyId = partyId;

  const agms = await prisma.partyAGM.findMany({
    where,
    orderBy: { date: "desc" },
    include: { resolutions: true, _count: { select: { resolutions: true } } },
  });

  return NextResponse.json({ agms });
}

export async function POST(req: NextRequest) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();

  if (!body.partyId || !body.title || !body.date || !body.type) {
    return NextResponse.json({ error: "partyId, title, date, and type are required" }, { status: 400 });
  }

  const agm = await prisma.partyAGM.create({
    data: {
      partyId: body.partyId,
      title: body.title,
      date: new Date(body.date),
      type: body.type,
      resolutions: body.resolutions
        ? {
            create: (body.resolutions as { title: string; description: string }[]).map(r => ({
              title: r.title,
              description: r.description,
            })),
          }
        : undefined,
    },
    include: { resolutions: true },
  });

  return NextResponse.json({ agm }, { status: 201 });
}
