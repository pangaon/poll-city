import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const resolutionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

const createAgmSchema = z.object({
  partyId: z.string().min(1, "partyId is required"),
  title: z.string().min(1, "title is required"),
  date: z.string().min(1, "date is required"),
  type: z.string().min(1, "type is required"),
  resolutions: z.array(resolutionSchema).optional(),
});

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
  const parsed = createAgmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const agm = await prisma.partyAGM.create({
    data: {
      partyId: parsed.data.partyId,
      title: parsed.data.title,
      date: new Date(parsed.data.date),
      type: parsed.data.type,
      resolutions: parsed.data.resolutions
        ? {
            create: parsed.data.resolutions.map(r => ({
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
