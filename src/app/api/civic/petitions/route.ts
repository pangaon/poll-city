import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { awardCivicCredits } from "@/lib/civic-credits";
import { z } from "zod";

const createPetitionSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().min(1, "description is required"),
  targetMunicipality: z.string().nullish(),
  targetWard: z.string().nullish(),
  targetOfficialId: z.string().nullish(),
  signatureGoal: z.number().int().positive().optional().default(500),
  isPublic: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "active";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  const [petitions, total] = await Promise.all([
    prisma.petition.findMany({
      where: { isPublic: true, status },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { signatures: true } } },
    }),
    prisma.petition.count({ where: { isPublic: true, status } }),
  ]);

  return NextResponse.json({ petitions, total, page, limit });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user!.id as string;
  const body = await req.json();
  const parsed = createPetitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const petition = await prisma.petition.create({
    data: {
      createdByUserId: userId,
      title: parsed.data.title,
      description: parsed.data.description,
      targetMunicipality: parsed.data.targetMunicipality ?? null,
      targetWard: parsed.data.targetWard ?? null,
      targetOfficialId: parsed.data.targetOfficialId ?? null,
      signatureGoal: parsed.data.signatureGoal,
      isPublic: parsed.data.isPublic,
    },
  });

  const { credits, newBadges } = await awardCivicCredits(
    userId,
    "CREATE_PETITION",
    `Created petition: ${parsed.data.title}`
  );

  return NextResponse.json({ petition, creditsAwarded: credits, newBadges }, { status: 201 });
}
