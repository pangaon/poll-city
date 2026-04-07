import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { awardCivicCredits } from "@/lib/civic-credits";

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

  if (!body.title || !body.description) {
    return NextResponse.json({ error: "title and description are required" }, { status: 400 });
  }

  const petition = await prisma.petition.create({
    data: {
      createdByUserId: userId,
      title: body.title,
      description: body.description,
      targetMunicipality: body.targetMunicipality ?? null,
      targetWard: body.targetWard ?? null,
      targetOfficialId: body.targetOfficialId ?? null,
      signatureGoal: body.signatureGoal ?? 500,
      isPublic: body.isPublic ?? true,
    },
  });

  const { credits, newBadges } = await awardCivicCredits(
    userId,
    "CREATE_PETITION",
    `Created petition: ${body.title}`
  );

  return NextResponse.json({ petition, creditsAwarded: credits, newBadges }, { status: 201 });
}
